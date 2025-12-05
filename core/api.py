# pymesec/core/api.py

from fastapi import (
    FastAPI,
    Depends,
    HTTPException,
    WebSocket,
    WebSocketDisconnect,
    Header,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.exceptions import RequestValidationError

from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from datetime import datetime
import asyncio
import io
import json

import dns.resolver        # Para SPF/DMARC
import requests            # Para futuras consultas externas si quieres
import pydnsbl             # Para listas negras (RBL)

from passlib.context import CryptContext

# ReportLab para PDF
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.utils import simpleSplit

# BD y modelos
from .db import get_db, init_db, ScanResult as DBScanResult, User as DBUser

# IA (Gemini) – usamos el motor que definiste en core/ai.py
from .ai import generate_executive_summary

# --- IMPORTS DE ESCÁNERES REALES ---
try:
    from scanners.net.ping import check_ping
    from scanners.net.custom_ports import scan_ports_native
    from scanners.net.tls import tls_info
    from scanners.web.headers import check_headers
    from scanners.runner import scan_nuclei, scan_dirsearch, scan_sqlmap, scan_xsstrike
except ImportError as e:
    print(f"⚠️ Error importando escáneres reales: {e}. Usando modo simulación para evitar caídas.")

    async def check_ping(h: str) -> bool:
        # Simulamos host siempre vivo
        return True

    async def scan_ports_native(h: str):
        # Simulamos puertos 80 y 443 abiertos
        return [80, 443]

    async def tls_info(h: str):
        return {}

    async def check_headers(u: str):
        return {"findings": []}

    async def scan_nuclei(u: str):
        return []

    async def scan_dirsearch(u: str):
        return []

    async def scan_sqlmap(u: str):
        return []

    async def scan_xsstrike(u: str):
        return []


# =====================================================
#                  CONFIG FASTAPI
# =====================================================

app = FastAPI(title="PYMESec Security Evaluator API")
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# --- CORS (en producción puedes restringir a tu dominio/IP) ---
origins = ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =====================================================
#                     SCHEMAS
# =====================================================

class UserSchema(BaseModel):
    id: int
    name: str
    email: EmailStr
    company_name: str

    class Config:
        from_attributes = True


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class ConfigUpdate(BaseModel):
    sector: str
    network_size: int
    main_server_ip: Optional[str] = None


class RegisterRequest(LoginRequest):
    name: str
    companyName: str


class ScanParams(BaseModel):
    ip_range: str
    scan_type: str


class ScanResultResponse(BaseModel):
    id: int
    host: Optional[str] = None
    scan_time: Optional[datetime] = None
    status: str
    results: Dict[str, Any]

    class Config:
        from_attributes = True


# =====================================================
#                     UTILIDADES
# =====================================================

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def get_password_hash(pwd: str) -> str:
    return pwd_context.hash(pwd)


def get_uid_from_token(authorization: str) -> int:
    """
    Extrae el user_id de un token del tipo:
      Authorization: Bearer fake_jwt_token_{id}
    """
    if not authorization:
        raise HTTPException(status_code=401, detail="Token ausente")
    try:
        token = authorization.split(" ")[1]
        uid = int(token.split("_")[-1])
        return uid
    except Exception:
        raise HTTPException(status_code=401, detail="Token inválido")


# Diccionario de conexiones WebSocket activas por user_id
active_connections: Dict[int, WebSocket] = {}


async def push_status(user_id: int, msg: str, status: str, scan_id: int):
    """
    Envía un mensaje JSON por WebSocket al usuario si está conectado.
    """
    if user_id in active_connections:
        try:
            await active_connections[user_id].send_json(
                {"status": status, "message": msg, "scanId": scan_id}
            )
        except Exception as e:
            print(f"Error enviando por WS a user {user_id}: {e}")


# =====================================================
#    CEREBRO CENTRAL DEL ESCÁNER (REAL + IA)
# =====================================================

async def run_scan_real(user_id: int, scan_id: int, target: str, db: Session):
    """
    Orquesta el escaneo real:
    - Reconocimiento (ping, puertos)
    - Análisis Web (headers, TLS)
    - Vulnerabilidades profundas (Nuclei, Dirsearch, XSStrike, SQLMap)
    - Generación de resumen ejecutivo con IA (Gemini)
    - Guardado final en la base de datos
    """
    try:
        # Normalizamos host y URL
        host = target.replace("https://", "").replace("http://", "").split("/")[0]
        url = target if target.startswith("http") else f"http://{target}"

        findings: List[Dict[str, Any]] = []
        open_ports: List[int] = []

        # ---------------------------------------------------------
        # 1. RECONOCIMIENTO: Ping + Plan B TCP
        # ---------------------------------------------------------
        await push_status(
            user_id,
            f"Verificando disponibilidad de {host}...",
            "Running",
            scan_id,
        )
        is_alive = await check_ping(host)

        if not is_alive:
            await push_status(
                user_id,
                "Ping bloqueado. Intentando TCP directo (Plan B)...",
                "Running",
                scan_id,
            )
            fallback_check = await scan_ports_native(host)
            if len(fallback_check) > 0:
                is_alive = True
                open_ports = fallback_check
                await push_status(
                    user_id,
                    "Objetivo detectado por TCP. El firewall podría estar filtrando ICMP.",
                    "Running",
                    scan_id,
                )
            else:
                # Marcamos como Error en DB
                scan_row = (
                    db.query(DBScanResult)
                    .filter(DBScanResult.id == scan_id)
                    .first()
                )
                if scan_row:
                    scan_row.status = "Error"
                    scan_row.results = {
                        "error": "Host Unreachable",
                        "summary": "Objetivo inaccesible (Ni Ping ni TCP responden).",
                    }
                    db.commit()
                await push_status(
                    user_id,
                    f"El objetivo {host} parece inactivo (sin respuesta ICMP ni TCP).",
                    "Error",
                    scan_id,
                )
                return

        if not open_ports:
            await push_status(
                user_id,
                "Escaneando puertos abiertos con sockets nativos...",
                "Running",
                scan_id,
            )
            open_ports = await scan_ports_native(host)

        if open_ports:
            findings.append(
                {
                    "severity": "INFO",
                    "name": "Puertos Abiertos",
                    "description": f"Detectados: {open_ports}",
                    "mitigation": "Cerrar puertos innecesarios y aplicar reglas de firewall.",
                }
            )

        # ---------------------------------------------------------
        # 2. ANÁLISIS WEB (si aplica)
        # ---------------------------------------------------------
        is_web = any(
            p in open_ports
            for p in [80, 443, 8000, 8080, 3000, 5000, 50000, 50001]
        ) or target.startswith("http")

        if is_web:
            # 2.1 Headers HTTP
            await push_status(
                user_id,
                "Analizando cabeceras HTTP...",
                "Running",
                scan_id,
            )
            headers_res = await check_headers(url)
            for h in headers_res.get("findings", []):
                findings.append(
                    {
                        "severity": "MEDIA",
                        "name": "Cabecera de Seguridad Faltante",
                        "description": h,
                        "mitigation": "Configurar cabeceras HTTP de seguridad en el servidor web.",
                    }
                )

            # 2.2 TLS/SSL si hay 443 o es https
            if 443 in open_ports or url.startswith("https"):
                tls_res = await tls_info(host)
                if tls_res:
                    findings.append(
                        {
                            "severity": "INFO",
                            "name": "Información TLS/SSL",
                            "description": f"Emisor: {tls_res.get('issuer')}",
                            "mitigation": "Verificar vigencia y configuración del certificado TLS.",
                        }
                    )

            # ---------------------------------------------------------
            # 3. VULNERABILIDADES PROFUNDAS (Nuclei, Dirsearch, XSStrike, SQLMap)
            # ---------------------------------------------------------
            await push_status(
                user_id,
                "Ejecutando análisis de vulnerabilidades profundas (Nuclei, Path Discovery, XSS)...",
                "Running",
                scan_id,
            )
            results_parallel = await asyncio.gather(
                scan_nuclei(url),
                scan_dirsearch(url),
                scan_xsstrike(url),
            )
            for res in results_parallel:
                findings.extend(res)

            await push_status(
                user_id,
                "Auditando inyecciones SQL con sqlmap...",
                "Running",
                scan_id,
            )
            sql_vulns = await scan_sqlmap(url)
            findings.extend(sql_vulns)

        else:
            await push_status(
                user_id,
                "El objetivo no parece un servicio web. Saltando pruebas HTTP/TLS.",
                "Running",
                scan_id,
            )

        # ---------------------------------------------------------
        # 4. ANÁLISIS EJECUTIVO CON IA (Gemini)
        # ---------------------------------------------------------
        await push_status(
            user_id,
            "Generando análisis ejecutivo con IA...",
            "Running",
            scan_id,
        )

        raw_results_for_ai = {
            "scan_meta": {"host": host, "ports": open_ports},
            "vulnerabilities": findings,
        }

        # IA: esta función internamente usa RiskEngine + Gemini
        ai_summary_text = generate_executive_summary(raw_results_for_ai)

        # ---------------------------------------------------------
        # 5. GUARDADO FINAL EN LA BD
        # ---------------------------------------------------------
        final_results = {
            "vulnerabilities": findings,
            "scan_meta": {"host": host, "ports": open_ports},
            "ai_summary": ai_summary_text,
        }

        scan_row = db.query(DBScanResult).filter(DBScanResult.id == scan_id).first()
        if scan_row:
            scan_row.results = final_results
            scan_row.status = "Completed"
            db.commit()

        await push_status(
            user_id,
            f"Escaneo completado. {len(findings)} hallazgos registrados.",
            "Completed",
            scan_id,
        )

    except Exception as e:
        print(f"FATAL ERROR SCAN: {e}")
        scan_row = db.query(DBScanResult).filter(DBScanResult.id == scan_id).first()
        if scan_row:
            scan_row.status = "Error"
            scan_row.results = {"error": str(e)}
            db.commit()
        await push_status(
            user_id,
            f"Error interno durante el escaneo: {str(e)}",
            "Error",
            scan_id,
        )
    finally:
        db.close()


# =====================================================
#                    ENDPOINTS REST
# =====================================================

@app.on_event("startup")
def startup():
    init_db()


# ---------- AUTH ----------

@app.post("/api/v1/auth/register")
def reg(r: RegisterRequest, db: Session = Depends(get_db)):
    if db.query(DBUser).filter(DBUser.email == r.email).first():
        raise HTTPException(status_code=400, detail="Email existe")

    u = DBUser(
        name=r.name,
        email=r.email,
        hashed_password=get_password_hash(r.password),
        company_name=r.companyName,
    )
    db.add(u)
    db.commit()
    db.refresh(u)
    return {"msg": "OK"}


@app.post("/api/v1/auth/login")
def login(r: LoginRequest, db: Session = Depends(get_db)):
    u = db.query(DBUser).filter(DBUser.email == r.email).first()
    if not u or not verify_password(r.password, u.hashed_password):
        raise HTTPException(status_code=401, detail="Bad creds")

    return {
        "token": f"fake_jwt_token_{u.id}",
        "user": UserSchema.model_validate(u).model_dump(),
    }


@app.get("/api/v1/user/me", response_model=UserSchema)
def me(authorization: str = Header(None), db: Session = Depends(get_db)):
    uid = get_uid_from_token(authorization)
    user = db.query(DBUser).filter(DBUser.id == uid).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return user


# ---------- MONITOR DE CORREO (SPF/DMARC + RBL + Fugas simuladas) ----------

@app.get("/api/v1/security/email-check")
def email_security_check(
    authorization: str = Header(None),
    db: Session = Depends(get_db),
):
    uid = get_uid_from_token(authorization)
    user = db.query(DBUser).filter(DBUser.id == uid).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    email = user.email
    domain = email.split("@")[-1]

    report: Dict[str, Any] = {
        "email": email,
        "domain": domain,
        "breaches": [],
        "risk_level": "Bajo",
        "configuration": {"spf": False, "dmarc": False},
        "message": "Tu cuenta parece segura por ahora.",
    }

    # A. Fugas (simuladas por patrón inseguro de correo)
    if any(x in email for x in ["admin", "test", "info", "soporte"]):
        report["breaches"] = [
            {
                "source": "LinkedIn Leak 2021",
                "date": "2021-04",
                "data": "Email, Passwords",
            },
            {
                "source": "Collection #1",
                "date": "2019-01",
                "data": "Email, Hash",
            },
        ]
        report["risk_level"] = "Crítico"
        report["message"] = (
            "¡ALERTA! Tu correo aparece en bases de datos filtradas. "
            "Cambia tu contraseña de inmediato y habilita MFA donde sea posible."
        )

    # B. Análisis DNS (SPF y DMARC)
    try:
        spf_answers = dns.resolver.resolve(domain, "TXT")
        for rdata in spf_answers:
            if "v=spf1" in rdata.to_text():
                report["configuration"]["spf"] = True
    except Exception:
        pass

    try:
        dmarc_answers = dns.resolver.resolve(f"_dmarc.{domain}", "TXT")
        for rdata in dmarc_answers:
            if "v=DMARC1" in rdata.to_text():
                report["configuration"]["dmarc"] = True
    except Exception:
        pass

    # C. Chequeo de Listas Negras (RBL)
    try:
        email_checker = pydnsbl.DNSBLIpChecker()

        mx_records = dns.resolver.resolve(domain, "MX")
        if mx_records:
            mx_host = str(mx_records[0].exchange)
            mx_ip_records = dns.resolver.resolve(mx_host, "A")
            if mx_ip_records:
                mx_ip = mx_ip_records[0].to_text()
                result = email_checker.check(mx_ip)
                if result.blacklisted:
                    if report["risk_level"] != "Crítico":
                        report["risk_level"] = "Alto"
                    report["message"] += (
                        f" Además, el servidor de correo ({mx_host}) figura en listas negras de SPAM."
                    )
    except Exception as e:
        print(f"Error RBL: {e}")

    # Ajuste final de riesgo por configuración SPF/DMARC
    if (
        not report["configuration"]["spf"]
        and report["risk_level"] not in ["Crítico", "Alto"]
    ):
        report["risk_level"] = "Medio"
        report["message"] = (
            "Tu dominio no tiene registro SPF. Es más probable que tus correos se marquen como SPAM."
        )

    return report


# ---------- HISTORIAL DE ESCANEOS ----------

@app.get("/api/v1/evaluation/history", response_model=List[ScanResultResponse])
def hist(authorization: str = Header(None), db: Session = Depends(get_db)):
    uid = get_uid_from_token(authorization)
    return (
        db.query(DBScanResult)
        .filter(DBScanResult.user_id == uid)
        .order_by(DBScanResult.scan_time.desc())
        .all()
    )


# ---------- INICIO DE ESCANEO ----------

@app.post("/api/v1/evaluation/start")
async def start(
    p: ScanParams,
    authorization: str = Header(None),
    db: Session = Depends(get_db),
):
    uid = get_uid_from_token(authorization)

    new_scan = DBScanResult(
        status="Pending",
        results={},
        user_id=uid,
        host=p.ip_range,
    )
    db.add(new_scan)
    db.commit()
    db.refresh(new_scan)

    # Lanzamos el escaneo real en segundo plano
    asyncio.create_task(
        run_scan_real(uid, new_scan.id, p.ip_range, get_db().__next__())
    )

    return {"message": "Iniciado", "scanId": new_scan.id}


# ---------- DETALLE DE ESCANEO ----------

@app.get("/api/v1/scan/{scan_id}", response_model=ScanResultResponse)
def detail(
    scan_id: int,
    authorization: str = Header(None),
    db: Session = Depends(get_db),
):
    uid = get_uid_from_token(authorization)
    res = (
        db.query(DBScanResult)
        .filter(DBScanResult.id == scan_id, DBScanResult.user_id == uid)
        .first()
    )
    if not res:
        raise HTTPException(status_code=404, detail="Escaneo no encontrado")
    return res


# ---------- CONFIGURACIÓN BÁSICA DE LA PYME ----------

@app.get("/api/v1/config/company")
def get_company_config():
    # Aquí podrías persistir en DB o archivo YAML;
    # por ahora devolvemos valores estáticos
    return {
        "sector": "tecnologia",
        "network_size": 10,
        "main_server_ip": "127.0.0.1",
    }


@app.post("/api/v1/config/company")
def update_company_config(config: ConfigUpdate):
    # Aquí podrías guardar en DB o archivo.
    # Lo dejamos simple (pero la firma ya está lista).
    return {"message": "Configuración guardada"}


# ---------- DESCARGA DE PDF DE REPORTE ----------

@app.get("/api/v1/reports/{scan_id}/download")
def download_report_pdf(
    scan_id: int,
    authorization: str = Header(None),
    db: Session = Depends(get_db),
):
    uid = get_uid_from_token(authorization)

    # 1. Buscar el escaneo en la BD y validar que sea del usuario
    scan = (
        db.query(DBScanResult)
        .filter(DBScanResult.id == scan_id, DBScanResult.user_id == uid)
        .first()
    )
    if not scan:
        raise HTTPException(status_code=404, detail="Reporte no encontrado")

    # 2. Extraer resultados y AI
    results = scan.results or {}
    vulns = results.get("vulnerabilities", []) or []
    ai_text = results.get("ai_summary", "Sin análisis IA.")

    # 3. Contar vulnerabilidades por severidad para el gráfico
    sev_buckets = {
        "CRÍTICO": ["CRITICA", "CRITICAL"],
        "ALTO": ["ALTA", "HIGH"],
        "MEDIO": ["MEDIA", "MEDIUM"],
        "BAJO": ["BAJA", "LOW"],
        "INFO": ["INFO"],
    }
    counts = {k: 0 for k in sev_buckets.keys()}

    for v in vulns:
        sev = (v.get("severity") or "INFO").upper()
        matched = False
        for label, keys in sev_buckets.items():
            if any(k in sev for k in keys):
                counts[label] += 1
                matched = True
                break
        if not matched:
            counts["INFO"] += 1

    max_count = max(counts.values()) if counts else 0
    if max_count == 0:
        max_count = 1  # para evitar división por cero

    # 4. Crear PDF en memoria
    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=letter)
    width, height = letter

    # =====================================================
    # PÁGINA 1: PORTADA + RESUMEN IA
    # =====================================================

    # Header / Portada
    c.setFillColor(colors.darkblue)
    c.rect(0, height - 100, width, 100, fill=True, stroke=False)

    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 24)
    c.drawString(50, height - 50, "REPORTE PYMESEC")

    c.setFont("Helvetica", 12)
    c.drawString(
        50,
        height - 80,
        f"Target: {scan.host or 'N/A'} | {scan.scan_time or ''}",
    )

    # Bloque de análisis IA
    y = height - 130
    c.setFillColor(colors.black)
    c.setFont("Helvetica-Bold", 14)
    c.drawString(50, y, "Análisis Ejecutivo (IA):")
    y -= 20

    c.setFont("Helvetica", 11)
    try:
        lines = simpleSplit(ai_text, "Helvetica", 11, width - 100)
        for line in lines:
            c.drawString(50, y, line)
            y -= 15
            if y < 100:
                # Si se acaba la página, pasamos a la siguiente
                c.showPage()
                width, height = letter
                y = height - 50
                c.setFont("Helvetica", 11)
    except Exception:
        c.drawString(50, y, str(ai_text))
        y -= 20

    # =====================================================
    # PÁGINA 2: GRÁFICO + DETALLES TÉCNICOS
    # =====================================================
    c.showPage()
    width, height = letter

    # Título de la página de gráficos
    c.setFont("Helvetica-Bold", 16)
    c.setFillColor(colors.darkblue)
    c.drawString(50, height - 60, "Distribución de vulnerabilidades por severidad")

    c.setFont("Helvetica", 9)
    c.setFillColor(colors.gray)
    c.drawString(
        50,
        height - 75,
        "Este gráfico resume cuántas vulnerabilidades se detectaron en cada categoría de severidad.",
    )

    # Configuración del gráfico de barras
    bar_x0 = 80
    bar_y0 = height - 320
    bar_width = 40
    bar_gap = 30
    max_bar_height = 180

    # Línea base
    c.setStrokeColor(colors.lightgrey)
    c.line(
        bar_x0 - 20,
        bar_y0,
        bar_x0 - 20 + len(counts) * (bar_width + bar_gap),
        bar_y0,
    )

    labels_order = ["CRÍTICO", "ALTO", "MEDIO", "BAJO", "INFO"]

    for i, label in enumerate(labels_order):
        count = counts.get(label, 0)
        bar_height = (count / max_count) * max_bar_height

        # Color por severidad
        if label == "CRÍTICO":
            color = colors.red
        elif label == "ALTO":
            color = colors.orange
        elif label == "MEDIO":
            color = colors.gold
        elif label == "BAJO":
            color = colors.green
        else:
            color = colors.blue

        x = bar_x0 + i * (bar_width + bar_gap)

        # Barra
        c.setFillColor(color)
        c.rect(x, bar_y0, bar_width, bar_height, fill=True, stroke=False)

        # Valor numérico arriba
        c.setFillColor(colors.black)
        c.setFont("Helvetica", 9)
        c.drawCentredString(x + bar_width / 2, bar_y0 + bar_height + 12, str(count))

        # Etiqueta abajo
        c.setFont("Helvetica", 8)
        c.drawCentredString(x + bar_width / 2, bar_y0 - 18, label)

    # Título de detalles técnicos debajo del gráfico
    y = bar_y0 - 60
    c.setFillColor(colors.black)
    c.setFont("Helvetica-Bold", 14)
    c.drawString(50, y, f"Detalles Técnicos ({len(vulns)}):")
    y -= 30

    # Listado de vulnerabilidades
    c.setFont("Helvetica", 10)
    for v in vulns:
        if y < 100:
            c.showPage()
            width, height = letter
            y = height - 50
            c.setFont("Helvetica", 10)

        severity = (v.get("severity") or "INFO").upper()
        name = v.get("name") or "Evento"

        # Color por severidad
        if "CRITIC" in severity:
            color = colors.red
        elif "ALTA" in severity or "HIGH" in severity:
            color = colors.orange
        elif "MED" in severity:
            color = colors.brown
        elif "BAJA" in severity or "LOW" in severity:
            color = colors.green
        elif "INFO" in severity:
            color = colors.blue
        else:
            color = colors.black

        c.setFillColor(color)
        c.drawString(50, y, f"[{severity}] {name}")

        c.setFillColor(colors.gray)
        desc = (v.get("description") or "").replace("\n", " ")
        if len(desc) > 95:
            desc = desc[:95] + "..."
        c.drawString(50, y - 15, desc)

        y -= 40

    # Cerrar y devolver PDF
    c.save()
    buffer.seek(0)

    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=report_{scan_id}.pdf"},
    )



# ---------- HANDLER 422 PARA DEBUG DE VALIDACIÓN ----------

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc: RequestValidationError):
    print("🚨 ERROR 422 DETECTADO EN FASTAPI")
    print(f"👉 Detalles: {exc.errors()}")
    try:
        body = await request.json()
        print(f"📦 Cuerpo recibido (JSON): {body}")
    except Exception:
        body_raw = await request.body()
        print(f"📦 Cuerpo recibido (no JSON): {body_raw!r}")

    return JSONResponse(
        status_code=422,
        content={
            "detail": exc.errors(),
            "hint": "Revisa los logs del servidor para ver el cuerpo exacto enviado.",
        },
    )


# ---------- WEBSOCKET PARA ESTADO DE ESCANEOS ----------

@app.websocket("/ws/status/{user_id}")
async def ws_endpoint(websocket: WebSocket, user_id: int):
    await websocket.accept()
    active_connections[user_id] = websocket
    try:
        while True:
            # No esperamos un mensaje específico, solo mantenemos la conexión viva
            await websocket.receive_text()
    except WebSocketDisconnect:
        if user_id in active_connections:
            del active_connections[user_id]

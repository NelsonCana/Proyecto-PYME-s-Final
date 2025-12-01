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
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from datetime import datetime
import asyncio
import io
import json

from passlib.context import CryptContext
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.exceptions import RequestValidationError

# ReportLab para PDF
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.utils import simpleSplit

# BD y Modelos
from .db import get_db, init_db, ScanResult as DBScanResult, User as DBUser

# --- IMPORTS DE ESCÁNERES ---
from scanners.net.ping import check_ping
from scanners.net.custom_ports import scan_ports_native
from scanners.net.tls import tls_info
from scanners.web.headers import check_headers
from scanners.runner import scan_nuclei, scan_dirsearch, scan_sqlmap, scan_xsstrike

# NOTA: IA ELIMINADA POR AHORA PARA EVITAR ERRORES

app = FastAPI(title="PYMESec Security Evaluator API")
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# --- CORS ---
origins = ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =====================================================
#                    SCHEMAS
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
#                    UTILIDADES
# =====================================================
def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def get_password_hash(pwd: str) -> str:
    return pwd_context.hash(pwd)


active_connections: Dict[int, WebSocket] = {}


async def push_status(user_id: int, msg: str, status: str, scan_id: int):
    """
    Envía mensajes de estado en tiempo real vía WebSocket al usuario.
    """
    if user_id in active_connections:
        try:
            await active_connections[user_id].send_json(
                {"status": status, "message": msg, "scanId": scan_id}
            )
        except Exception:
            # Si falla el WS no queremos romper el escaneo
            pass


# =====================================================
#  CEREBRO CENTRAL (HÍBRIDO + PLAN B + FIX VARIABLES)
# =====================================================
async def run_scan_real(user_id: int, scan_id: int, target: str, db: Session):
    try:
        host = (
            target.replace("https://", "")
            .replace("http://", "")
            .split("/")[0]
        )
        url = target if target.startswith("http") else f"http://{target}"

        # --- FIX: Inicializamos variables SIEMPRE al principio ---
        findings = []
        open_ports: List[int] = []

        # ---------------------------------------------------------
        # FASE 1: RECONOCIMIENTO (PING + TCP PLAN B)
        # ---------------------------------------------------------
        await push_status(
            user_id,
            f"Verificando disponibilidad de {host}...",
            "Running",
            scan_id,
        )
        is_alive = await check_ping(host)

        # Plan B: si el ping no responde, probar con TCP
        if not is_alive:
            await push_status(
                user_id,
                "Ping bloqueado. Intentando conexión TCP directa (Plan B)...",
                "Running",
                scan_id,
            )
            fallback_check = await scan_ports_native(host)

            if len(fallback_check) > 0:
                is_alive = True
                open_ports = fallback_check
                await push_status(
                    user_id,
                    "Objetivo detectado por TCP (Firewall evadido).",
                    "Running",
                    scan_id,
                )
            else:
                error_msg = (
                    f"El objetivo {host} parece inactivo "
                    f"(Ni Ping ni TCP responden)."
                )
                scan_row = (
                    db.query(DBScanResult)
                    .filter(DBScanResult.id == scan_id)
                    .first()
                )
                if scan_row:
                    scan_row.status = "Error"
                    scan_row.results = {
                        "error": "Host Unreachable",
                        "summary": "Objetivo inaccesible.",
                    }
                    db.commit()
                await push_status(user_id, error_msg, "Error", scan_id)
                return

        # C. Escaneo de puertos (si aún no lo hicimos en el Plan B)
        if not open_ports:
            await push_status(
                user_id,
                "Analizando superficie de ataque (Sockets Nativos)...",
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
                    "mitigation": "Cerrar puertos innecesarios.",
                }
            )

        # ---------------------------------------------------------
        # FASE 2: ANÁLISIS WEB
        # ---------------------------------------------------------
        is_web = any(
            p in open_ports
            for p in [80, 443, 8000, 8080, 3000, 5000, 50000, 50001]
        ) or target.startswith("http")

        if is_web:
            # D. Headers
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
                        "mitigation": "Configurar headers en servidor web.",
                    }
                )

            # E. TLS
            if 443 in open_ports or url.startswith("https"):
                tls_res = await tls_info(host)
                if tls_res:
                    findings.append(
                        {
                            "severity": "INFO",
                            "name": "Info TLS/SSL",
                            "description": f"Emisor: {tls_res.get('issuer')}",
                            "mitigation": "N/A",
                        }
                    )

            # ---------------------------------------------------------
            # FASE 3: ATAQUE PROFUNDO (Censurado/Profesional)
            # ---------------------------------------------------------
            await push_status(
                user_id,
                "Iniciando motores de análisis heurístico y detección de anomalías...",
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
                "Ejecutando auditoría de integridad de Base de Datos y saneamiento de entradas...",
                "Running",
                scan_id,
            )
            sql_vulns = await scan_sqlmap(url)
            findings.extend(sql_vulns)
        else:
            await push_status(
                user_id,
                "No es servicio Web. Saltando pruebas HTTP.",
                "Running",
                scan_id,
            )

        # ---------------------------------------------------------
        # FASE 4: GUARDADO (SIN IA)
        # ---------------------------------------------------------
        ai_summary = "Análisis de Inteligencia Artificial pendiente de activación."

        raw_results: Dict[str, Any] = {
            "vulnerabilities": findings,
            "scan_meta": {"host": host, "ports": open_ports},
        }

        final_results = raw_results
        final_results["ai_summary"] = ai_summary

        # ---------------------------------------------------------
        # FASE 5: COMMIT DB
        # ---------------------------------------------------------
        scan_row = (
            db.query(DBScanResult).filter(DBScanResult.id == scan_id).first()
        )
        if scan_row:
            scan_row.results = final_results
            scan_row.status = "Completed"
            db.commit()

        await push_status(
            user_id,
            f"Escaneo completado. {len(findings)} hallazgos.",
            "Completed",
            scan_id,
        )

    except Exception as e:
        print(f"FATAL: {e}")
        scan_row = (
            db.query(DBScanResult).filter(DBScanResult.id == scan_id).first()
        )
        if scan_row:
            scan_row.status = "Error"
            scan_row.results = {"error": str(e)}
            db.commit()
        await push_status(
            user_id, f"Error interno: {str(e)}", "Error", scan_id
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
    try:
        uid = int(authorization.split(" ")[1].split("_")[-1])
        return db.query(DBUser).filter(DBUser.id == uid).first()
    except Exception:
        raise HTTPException(status_code=401, detail="Token error")


# ---------- HISTORIAL ----------
@app.get("/api/v1/evaluation/history", response_model=List[ScanResultResponse])
def hist(authorization: str = Header(None), db: Session = Depends(get_db)):
    try:
        token = authorization.split(" ")[1]
        uid = int(token.split("_")[-1])
    except Exception:
        raise HTTPException(status_code=401, detail="Token inválido o ausente")

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
    try:
        token = authorization.split(" ")[1]
        uid = int(token.split("_")[-1])
    except Exception:
        raise HTTPException(status_code=401, detail="Token inválido o ausente")

    new_scan = DBScanResult(
        status="Pending",
        results={},
        user_id=uid,
        host=p.ip_range,
    )
    db.add(new_scan)
    db.commit()
    db.refresh(new_scan)

    # Lanzar el escaneo real en background
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
    try:
        token = authorization.split(" ")[1]
        uid = int(token.split("_")[-1])
    except Exception:
        raise HTTPException(status_code=401, detail="Token inválido o ausente")

    res = (
        db.query(DBScanResult)
        .filter(DBScanResult.id == scan_id, DBScanResult.user_id == uid)
        .first()
    )
    if not res:
        raise HTTPException(
            status_code=404, detail="Escaneo no encontrado"
        )

    return res


# ---------- CONFIGURACIÓN DE LA PYME ----------
@app.get("/api/v1/config/company")
def get_company_config():
    # En el futuro podrías persistir esto en BD
    return {
        "sector": "tecnologia",
        "network_size": 10,
        "main_server_ip": "127.0.0.1",
    }


@app.post("/api/v1/config/company")
def update_company_config(config: ConfigUpdate):
    # Aquí podrías guardar en BD; por ahora devolvemos OK
    return {"message": "Configuración guardada"}


# ---------- DESCARGA DE REPORTE EN PDF ----------
@app.get("/api/v1/reports/{scan_id}/download")
def download_report_pdf(
    scan_id: int,
    authorization: str = Header(None),
    db: Session = Depends(get_db),
):
    # 1. Validar token y obtener ID de usuario
    try:
        token = authorization.split(" ")[1]
        uid = int(token.split("_")[-1])
    except Exception:
        raise HTTPException(status_code=401, detail="Token inválido o ausente")

    # 2. Buscar el escaneo y asegurarse de que sea del usuario
    scan = (
        db.query(DBScanResult)
        .filter(DBScanResult.id == scan_id, DBScanResult.user_id == uid)
        .first()
    )
    if not scan:
        raise HTTPException(status_code=404, detail="Reporte no encontrado")

    results = scan.results or {}
    vulns = results.get("vulnerabilities", []) or []
    ai_text = results.get("ai_summary", "Sin análisis IA.")

    # 3. Crear PDF en memoria
    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=letter)
    width, height = letter

    # --- HEADER ---
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

    y = height - 130

    # --- SECCIÓN IA ---
    c.setFillColor(colors.black)
    c.setFont("Helvetica-Bold", 14)
    c.drawString(50, y, "Análisis Ejecutivo (IA):")
    y -= 20

    c.setFont("Helvetica", 11)
    lines = simpleSplit(ai_text, "Helvetica", 11, width - 100)
    for line in lines:
        c.drawString(50, y, line)
        y -= 15
        if y < 100:
            c.showPage()
            y = height - 50

    y -= 30

    # --- SECCIÓN TÉCNICA ---
    c.setFont("Helvetica-Bold", 14)
    c.drawString(50, y, f"Detalles Técnicos ({len(vulns)}):")
    y -= 30

    c.setFont("Helvetica", 10)
    for v in vulns:
        if y < 100:
            c.showPage()
            y = height - 50

        severity = (v.get("severity") or "INFO").upper()
        name = v.get("name") or "Evento"

        color = colors.black
        if "CRITIC" in severity:
            color = colors.red
        elif "ALTA" in severity or "HIGH" in severity:
            color = colors.orange
        elif "MED" in severity:
            color = colors.brown
        elif "INFO" in severity:
            color = colors.blue

        c.setFillColor(color)
        c.drawString(50, y, f"[{severity}] {name}")

        c.setFillColor(colors.gray)
        desc = (v.get("description") or "").replace("\n", " ")
        if len(desc) > 95:
            desc = desc[:95] + "..."
        c.drawString(50, y - 15, desc)

        y -= 40

    # 4. Cerrar PDF y devolverlo
    c.save()
    buffer.seek(0)

    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=report_{scan_id}.pdf"
        },
    )


# =====================================================
#        MANEJADOR 422 (DEBUG DE VALIDACIONES)
# =====================================================
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc):
    print("🚨 ERROR DE VALIDACIÓN (422) DETECTADO 🚨")
    print(f"👉 Detalles del error: {exc.errors()}")
    try:
        body = await request.json()
        print(f"📦 Cuerpo recibido (JSON): {body}")
    except Exception:
        print("📦 Cuerpo recibido (No JSON):", await request.body())

    return JSONResponse(
        status_code=422,
        content={
            "detail": exc.errors(),
            "body": "Mira los logs del servidor para ver qué enviaste mal.",
        },
    )


# =====================================================
#                    WEBSOCKET
# =====================================================
@app.websocket("/ws/status/{user_id}")
async def ws_endpoint(websocket: WebSocket, user_id: int):
    await websocket.accept()
    active_connections[user_id] = websocket
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        del active_connections[user_id]

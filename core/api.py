# pymesec/core/api.py

from fastapi import FastAPI, Depends, HTTPException, status, WebSocket, WebSocketDisconnect, Header
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from pydantic import BaseModel, EmailStr
from datetime import datetime
import asyncio
import json
from passlib.context import CryptContext
from fastapi.responses import StreamingResponse
import io
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors


# BD y Modelos
from .db import get_db, init_db, ScanResult as DBScanResult, User as DBUser

# --- IMPORTAMOS LOS ESCÁNERES REALES ---
from scanners.net.ports import scan_host
from scanners.net.tls import tls_info
from scanners.web.headers import check_headers
# Nota: Si sqli/xss fallan por dependencias, los comentamos, pero intentémoslo.
from scanners.web.sqli import check_sqli
from scanners.web.xxs import check_xss  # Ojo con el nombre del archivo xxs.py vs xss
from scanners.web.enum import check_directories

app = FastAPI(title="PYMESec Security Evaluator API")
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# --- CORS ---
origins = ["*"] # Simplificado para evitar errores en esta fase
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- SCHEMAS ---
class UserSchema(BaseModel):
    id: int
    name: str
    email: EmailStr
    company_name: str
    class Config: from_attributes = True

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
    class Config: from_attributes = True

# --- UTILIDADES ---
def verify_password(plain, hashed): return pwd_context.verify(plain, hashed)
def get_password_hash(pwd): return pwd_context.hash(pwd)

active_connections: Dict[int, WebSocket] = {}

async def push_status(user_id: int, msg: str, status: str, scan_id: int):
    if user_id in active_connections:
        try:
            await active_connections[user_id].send_json({
                "status": status, "message": msg, "scanId": scan_id
            })
        except: pass

# --- LÓGICA REAL DE ESCANEO ---
async def run_scan_real(user_id: int, scan_id: int, target: str, db: Session):
    """Ejecuta los scripts de seguridad secuencialmente"""
    try:
        # 1. Inicio
        await push_status(user_id, f"Iniciando análisis sobre {target}...", "Running", scan_id)
        
        # Definir URL base (asumimos http si no se da)
        url = target if target.startswith("http") else f"http://{target}"
        host = target.replace("https://", "").replace("http://", "").split("/")[0]

        # 2. Red y Puertos
        await push_status(user_id, "Escaneando puertos TCP...", "Running", scan_id)
        # Escaneamos puertos comunes para ser rápidos
        ports_result = await scan_host(host, [21, 22, 80, 443, 3306, 8080])
        
        # 3. Cabeceras HTTP
        await push_status(user_id, "Analizando cabeceras de seguridad...", "Running", scan_id)
        headers_result = await check_headers(url)

        # 4. Directorios Ocultos
        await push_status(user_id, "Buscando directorios ocultos...", "Running", scan_id)
        enum_result = await check_directories(url)

        # 5. Vulnerabilidades Web (SQLi / XSS)
        await push_status(user_id, "Probando inyecciones (SQLi/XSS)...", "Running", scan_id)
        sqli_result = await check_sqli(url)
        xss_result = await check_xss(url)

        # 6. Compilar Resultados
        final_results = {
            "network": ports_result,
            "web": {
                "headers": headers_result,
                "directories": enum_result,
                "sqli": sqli_result,
                "xss": xss_result
            },
            # Generamos una lista simplificada de vulnerabilidades para el Reporte UI
            "vulnerabilities": []
        }

        # -- Post-procesamiento simple para la UI --
        # Si hay puertos peligrosos
        for p in ports_result.get("open_ports", []):
            if p in [21, 22, 3306]:
                final_results["vulnerabilities"].append({
                    "severity": "Alta", "name": f"Puerto {p} Expuesto", 
                    "description": "Puerto de administración abierto al público.", "host": host,
                    "mitigation_steps": ["Cerrar puerto en firewall", "Usar VPN"]
                })
        
        # Si faltan headers
        for f in headers_result.get("findings", []):
            final_results["vulnerabilities"].append({
                "severity": "Media", "name": "Cabecera de Seguridad Faltante",
                "description": f, "host": host,
                "mitigation_steps": ["Configurar servidor web correctamente"]
            })

        # Si hay SQLi
        if sqli_result.get("vulnerable"):
            final_results["vulnerabilities"].append({
                "severity": "Critica", "name": "SQL Injection Detectado",
                "description": str(sqli_result.get("findings")), "host": host,
                "mitigation_steps": ["Usar Prepared Statements", "Sanitizar inputs"]
            })

        # Guardar en BD
        scan_row = db.query(DBScanResult).filter(DBScanResult.id == scan_id).first()
        if scan_row:
            scan_row.results = final_results
            scan_row.status = "Completed"
            db.commit()

        await push_status(user_id, "Análisis finalizado exitosamente.", "Completed", scan_id)

    except Exception as e:
        print(f"Error en escaneo: {e}")
        scan_row = db.query(DBScanResult).filter(DBScanResult.id == scan_id).first()
        if scan_row:
            scan_row.status = "Error"
            db.commit()
        await push_status(user_id, f"Error: {str(e)}", "Error", scan_id)
    finally:
        db.close()

# --- ENDPOINTS ---

@app.on_event("startup")
def startup(): init_db()

@app.post("/api/v1/auth/register")
def reg(r: RegisterRequest, db: Session = Depends(get_db)):
    if db.query(DBUser).filter(DBUser.email == r.email).first(): raise HTTPException(400, "Email existe")
    u = DBUser(name=r.name, email=r.email, hashed_password=get_password_hash(r.password), company_name=r.companyName)
    db.add(u); db.commit(); db.refresh(u)
    return {"msg": "OK"}

@app.post("/api/v1/auth/login")
def login(r: LoginRequest, db: Session = Depends(get_db)):
    u = db.query(DBUser).filter(DBUser.email == r.email).first()
    if not u or not verify_password(r.password, u.hashed_password): raise HTTPException(401, "Bad creds")
    return {"token": f"fake_jwt_token_{u.id}", "user": UserSchema.model_validate(u).model_dump()}

@app.get("/api/v1/user/me", response_model=UserSchema)
def me(authorization: str = Header(None), db: Session = Depends(get_db)):
    try:
        uid = int(authorization.split(" ")[1].split("_")[-1])
        return db.query(DBUser).filter(DBUser.id == uid).first()
    except: raise HTTPException(401, "Token error")

@app.get("/api/v1/evaluation/history", response_model=List[ScanResultResponse])
def hist(db: Session = Depends(get_db)):
    return db.query(DBScanResult).order_by(DBScanResult.scan_time.desc()).all()

@app.post("/api/v1/evaluation/start")
async def start(p: ScanParams, authorization: str = Header(None), db: Session = Depends(get_db)):
    try:
        uid = int(authorization.split(" ")[1].split("_")[-1])
    except: uid = 1 # Fallback
    
    new_scan = DBScanResult(status="Pending", results={}, user_id=uid, host=p.ip_range)
    db.add(new_scan); db.commit(); db.refresh(new_scan)
    
    # Lanzar tarea en segundo plano real
    asyncio.create_task(run_scan_real(uid, new_scan.id, p.ip_range, get_db().__next__()))
    
    return {"message": "Iniciado", "scanId": new_scan.id}

@app.get("/api/v1/scan/{scan_id}", response_model=ScanResultResponse)
def detail(scan_id: int, db: Session = Depends(get_db)):
    res = db.query(DBScanResult).filter(DBScanResult.id == scan_id).first()
    if not res: raise HTTPException(404)
    return res

@app.get("/api/v1/config/company")
def get_company_config():
    # Mock: Devolvemos una config por defecto para que el formulario no falle
    return {"sector": "tecnologia", "network_size": 10, "main_server_ip": "127.0.0.1"}

@app.post("/api/v1/config/company")
def update_company_config(config: ConfigUpdate):
    # Aquí podrías guardar en un archivo o BD, por ahora solo confirmamos
    return {"message": "Configuración guardada"}

@app.get("/api/v1/reports/{scan_id}/download")
def download_report_pdf(scan_id: int, db: Session = Depends(get_db)):
    # 1. Obtener datos del escaneo
    scan = db.query(DBScanResult).filter(DBScanResult.id == scan_id).first()
    if not scan:
        raise HTTPException(404, "Reporte no encontrado")

    vulns = scan.results.get("vulnerabilities", [])

    # 2. Crear el PDF en memoria
    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=letter)
    width, height = letter

    # --- DISEÑO DEL REPORTE ---
    # Encabezado
    c.setFillColor(colors.darkblue)
    c.rect(0, height - 100, width, 100, fill=True, stroke=False)

    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 24)
    c.drawString(50, height - 50, "REPORTE DE SEGURIDAD PYMESEC")

    c.setFont("Helvetica", 12)
    c.drawString(50, height - 80, f"Objetivo: {scan.host} | Fecha: {scan.scan_time}")

    # Cuerpo
    y = height - 150
    c.setFillColor(colors.black)
    c.setFont("Helvetica-Bold", 16)
    c.drawString(50, y, f"Resumen de Hallazgos (Total: {len(vulns)})")
    y -= 30

    # Listado de Vulnerabilidades
    c.setFont("Helvetica", 10)
    for v in vulns:
        if y < 100: # Nueva página si se acaba el espacio
            c.showPage()
            y = height - 50

        severity = v.get('severity', 'Info')
        name = v.get('name', 'Sin nombre')

        # Color por severidad
        if severity == 'Critica': c.setFillColor(colors.red)
        elif severity == 'Alta': c.setFillColor(colors.orange)
        else: c.setFillColor(colors.black)

        c.drawString(50, y, f"[{severity.upper()}] {name}")
        c.setFillColor(colors.gray)
        c.drawString(50, y - 15, f"Detalle: {v.get('description', '')[:90]}...")

        y -= 40 # Espacio para la siguiente

    c.save()
    buffer.seek(0)

    # 3. Devolver el archivo
    return StreamingResponse(
        buffer, 
        media_type="application/pdf", 
        headers={"Content-Disposition": f"attachment; filename=reporte_pymesec_{scan_id}.pdf"}
    )

@app.websocket("/ws/status/{user_id}")
async def ws_endpoint(websocket: WebSocket, user_id: int):
    await websocket.accept()
    active_connections[user_id] = websocket
    try:
        while True: await websocket.receive_text()
    except: del active_connections[user_id]

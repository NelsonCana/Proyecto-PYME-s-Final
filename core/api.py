# pymesec/core/api.py

from fastapi import FastAPI, Depends, HTTPException, status, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict, Any, Generator
import asyncio
import random
import time
import os
import yaml
from pydantic import BaseModel, EmailStr
from passlib.context import CryptContext # Importación para Hashing
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError # Para manejar errores de BD

# Importaciones relativas de db.py
from .db import get_db, User as DBUser, ScanResult as DBScanResult 

# --- CONFIGURACIÓN PRINCIPAL ---
app = FastAPI(title="PYMESec Security Evaluator API")

# Configuración del Hashing de Contraseñas
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# --- CORS (Cross-Origin Resource Sharing) ---
# ⚠️ Asegúrate de que este puerto coincida con donde corre tu React (ej. Vite)
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- SCHEMAS DE ENTRADA/SALIDA (Pydantic) ---

class UserSchema(BaseModel):
    id: int
    name: str
    email: EmailStr
    company_name: str
    role: str = "admin" # Rol por defecto

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class RegisterRequest(LoginRequest):
    name: str
    companyName: str

class ConfigUpdate(BaseModel):
    sector: str
    network_size: int
    main_server_ip: str

class ScanParams(BaseModel):
    ip_range: str
    scan_type: str


# --- UTILERÍAS DE SEGURIDAD Y JWT (MOCK) ---

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

# Función MOCK para obtener el usuario autenticado (debería decodificar un JWT real)
def get_current_user(token: str = "fake_jwt_token_123") -> UserSchema:
    # Simulación de que el token decodifica al Usuario 1
    # En una aplicación real, usarías jose o pyjwt para decodificar.
    user_data = {"id": 1, "name": "Jano Dev", "email": "jano@pymesec.com", "company_name": "Jano Corp"}
    return UserSchema(**user_data)


# --- 1. GESTIÓN DE WEBSOCKETS ---

active_connections: Dict[int, WebSocket] = {}

async def push_scan_status(user_id: int, status_data: Dict[str, Any]):
    """Envía un JSON de estado al usuario conectado por WebSocket."""
    websocket = active_connections.get(user_id)
    if websocket:
        try:
            await websocket.send_json(status_data)
        except (RuntimeError, WebSocketDisconnect):
            if user_id in active_connections:
                 del active_connections[user_id]
            print(f"Conexión WS para el usuario {user_id} fallida o cerrada.")
        except Exception as e:
            print(f"Error al enviar WS: {e}")


# --- 2. ENDPOINTS DE AUTENTICACIÓN (INTEGRADOS CON DB) ---

@app.post("/api/auth/register")
async def register_user(request: RegisterRequest, db: Session = Depends(get_db)):
    """Ruta para registrar un nuevo usuario con hashing de contraseña."""
    
    # Verificar si el usuario ya existe
    db_user = db.query(DBUser).filter(DBUser.email == request.email).first()
    if db_user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El email ya está registrado.")
    
    # Crear nuevo usuario y hashear contraseña
    hashed_password = get_password_hash(request.password)
    db_user = DBUser(
        name=request.name,
        email=request.email,
        hashed_password=hashed_password,
        company_name=request.companyName
    )
    
    try:
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Error de integridad al registrar.")
    
    return {"message": "Usuario registrado exitosamente."}

@app.post("/api/auth/login", response_model=Dict[str, Any])
async def login_user(request: LoginRequest, db: Session = Depends(get_db)):
    """Ruta para iniciar sesión y verificar credenciales contra la BD."""
    
    db_user = db.query(DBUser).filter(DBUser.email == request.email).first()
    
    # Verificar existencia del usuario y contraseña hasheada
    if not db_user or not verify_password(request.password, db_user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciales inválidas.")

    # ⚠️ TOKEN REAL: Aquí generarías y firmarías un TOKEN JWT.
    
    user_data = UserSchema(id=db_user.id, name=db_user.name, email=db_user.email, company_name=db_user.company_name)
    return {"token": f"fake_jwt_token_{db_user.id}", "user": user_data.model_dump()}

@app.get("/api/user/me", response_model=UserSchema)
async def get_my_profile(current_user: UserSchema = Depends(get_current_user)):
    """Ruta protegida para obtener el perfil del usuario logueado."""
    # En una implementación real, buscarías al usuario en la BD
    return current_user


# --- 3. CONFIGURACIÓN Y REPORTES ---
# Se mantiene la lógica anterior (asumiendo que company.yaml está en pymesec/config/)

@app.get("/api/config/company")
async def get_company_config(current_user: UserSchema = Depends(get_current_user)):
    # Simulación de lectura de company.yaml
    path = os.path.join(os.path.dirname(__file__), '..', 'config', 'company.yaml')
    try:
        with open(path, 'r') as file:
            config = yaml.safe_load(file)
            return config.get('company', {}) 
    except FileNotFoundError:
        # Devolver valores por defecto si el archivo no existe
        return {"sector": "servicios", "network_size": 10, "main_server_ip": ""}

@app.post("/api/config/company")
async def update_company_config(config: ConfigUpdate, current_user: UserSchema = Depends(get_current_user)):
    # ⚠️ En la app real, aquí guardarías config.model_dump() en el YAML.
    await asyncio.sleep(0.3)
    return {"message": "Configuración de la compañía guardada."}

@app.get("/api/reports/{scan_id}")
async def get_report_detail(scan_id: str, current_user: UserSchema = Depends(get_current_user), db: Session = Depends(get_db)):
    # ⚠️ En la app real, buscarías en DBScanResult por scan_id y owner_id
    await asyncio.sleep(0.5)
    return {
        "reportId": scan_id,
        "companyName": current_user.company_name,
        "score": random.uniform(5.0, 9.5), # Score aleatorio para simulación
        "vulnerabilities": [
            {"id": "VUL-001", "name": "Puerto SSH Abierto", "severity": "Critica", "host": "1.1.1.1", "description": "...", "impact_pyme": "...", "mitigation_steps": ["Cerrar puerto 22"]},
            {"id": "VUL-002", "name": "Software Obsoleto", "severity": "Alta", "host": "2.2.2.2", "description": "...", "impact_pyme": "...", "mitigation_steps": ["Actualizar versión"]},
        ],
    }

@app.get("/api/evaluation/history")
async def get_scan_history(current_user: UserSchema = Depends(get_current_user), db: Session = Depends(get_db)):
    # ⚠️ En la app real, buscarías en DBScanResult por owner_id
    await asyncio.sleep(0.2)
    return [
        {"scanId": "SCAN-001", "date": "2025-10-20T10:00:00Z", "status": "Completed"},
        {"scanId": "SCAN-002", "date": "2025-11-01T15:30:00Z", "status": "Completed"},
        {"scanId": "SCAN-003", "date": "2025-11-10T09:00:00Z", "status": "Error"},
    ]


# --- 4. EVALUACIÓN (ASÍNCRONA CON WEBSOCKETS) ---

async def run_scan_in_background(user_id: int, scan_id: str, scan_params: ScanParams):
    """Simulación de la tarea pesada de escaneo."""
    
    # 1. Fase de Reconocimiento
    await push_scan_status(user_id, {'status': 'Running', 'message': '10% - Reconocimiento de red...', 'scanId': scan_id})
    await asyncio.sleep(3)
    
    # 2. Fase de Escaneo de Puertos
    await push_scan_status(user_id, {'status': 'Running', 'message': '50% - Escaneo de puertos y servicios...', 'scanId': scan_id})
    await asyncio.sleep(5)
    
    # 3. Finalización
    await push_scan_status(user_id, {'status': 'Completed', 'message': 'Escaneo finalizado. Reporte generado.', 'scanId': scan_id})


@app.post("/api/evaluation/start")
async def start_scan(params: ScanParams, current_user: UserSchema = Depends(get_current_user), db: Session = Depends(get_db)):
    """Inicia un nuevo escaneo y lo ejecuta en segundo plano."""
    scan_id = f"SCAN-{int(time.time())}"
    
    # ⚠️ En la aplicación real, aquí guardarías una entrada inicial en DBScanResult
    # para registrar que el escaneo ha comenzado.
    
    # Inicia la tarea de escaneo en segundo plano sin bloquear la API.
    asyncio.create_task(run_scan_in_background(current_user.id, scan_id, params))
    
    return {"message": "Escaneo iniciado", "scanId": scan_id}


# --- 5. ENDPOINT DE WEBSOCKET ---
@app.websocket("/ws/status/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: int):
    """Maneja la conexión de WebSocket para las actualizaciones de estado."""
    await websocket.accept()
    
    # Unirse a la sala del usuario
    active_connections[user_id] = websocket
    print(f"Cliente WS conectado y unido a la sala: {user_id}")
    
    try:
        while True:
            # Esperamos mensajes del cliente (mantener la conexión viva)
            await websocket.receive_text() 
    except WebSocketDisconnect:
        if user_id in active_connections:
            del active_connections[user_id]
        print(f"Cliente WS desconectado: {user_id}")


# --- 6. EVENTO DE INICIO (Crear Tablas) ---
@app.on_event("startup")
def startup_event():
    """Ejecutado al iniciar FastAPI para crear las tablas de la BD."""
    from .db import init_db
    init_db()
    print("Tablas de base de datos inicializadas (si no existían).")
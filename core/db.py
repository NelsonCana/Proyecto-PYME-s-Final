# pymesec/core/db.py

import os
# Importamos columnas adicionales y relaciones
from sqlalchemy import create_engine, Column, Integer, String, JSON, DateTime, ForeignKey
from sqlalchemy.orm import sessionmaker, declarative_base, relationship # Añadimos 'relationship'
from sqlalchemy.sql import func
from pydantic import BaseModel as PydanticBaseModel # Importación opcional si defines esquemas de Pydantic aquí


# --- 1. CONFIGURACIÓN DE LA BASE DE DATOS ---

# Lee la URL de la base de datos desde las variables de entorno
# Fallback a SQLite si no se encuentra la variable (Asegúrate que tu .env tenga DATABASE_URL)
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./pymesec_data.db")

# Configuración de SQLAlchemy
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# --- 2. MODELOS DE DATOS (SQLAlchemy ORM) ---

# ➡️ NUEVO: Modelo para los Usuarios y la PYME
class User(Base):
    """Modelo para la autenticación y datos de la PYME."""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False) # ⚠️ ALMACENAR SIEMPRE HASHES
    company_name = Column(String, nullable=False)
    
    # Relación: Un usuario puede tener múltiples resultados de escaneo
    scan_results = relationship("ScanResult", back_populates="owner")


# ➡️ MODELO EXISTENTE ACTUALIZADO
class ScanResult(Base):
    """Modelo de la tabla para guardar resultados y estado de escaneo."""
    __tablename__ = "scan_results"

    id = Column(Integer, primary_key=True, index=True)
    host = Column(String) 	
    # 🔗 NUEVO: Clave foránea para vincular el resultado al usuario
    scan_time = Column(DateTime(timezone=True), server_default=func.now())
    status = Column(String, default="pending") # ⚠️ NUEVO: Necesario para el Dashboard (Running, Completed, Error)
    results = Column(JSON)

    # Relación: Un resultado pertenece a un usuario
    user_id = Column(Integer, ForeignKey("users.id"))
    owner = relationship("User", back_populates="scan_results")


# --- 3. FUNCIONES DE INICIALIZACIÓN Y DEPENDENCIA ---

# Función para crear las tablas
def init_db():
    """Crea todas las tablas definidas por Base."""
    Base.metadata.create_all(bind=engine)

# Función para obtener una sesión de base de datos
def get_db():
    """Generador de sesión de base de datos para inyección de dependencia."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

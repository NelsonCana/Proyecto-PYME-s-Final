# pymesec/core/db.py

import os
from sqlalchemy import (
    create_engine,
    Column,
    Integer,
    String,
    JSON,
    DateTime,
    ForeignKey,
)
from sqlalchemy.orm import sessionmaker, declarative_base, relationship
from sqlalchemy.sql import func

# ---------------------------------
# 1) Configuración de la base de datos
# ---------------------------------
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./pymesec_data.db")

# Para que también funcione con SQLite en local
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(
    DATABASE_URL,
    future=True,
    connect_args=connect_args,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


# ---------------------------------
# 2) MODELOS
# ---------------------------------
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    company_name = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relación 1:N con ScanResult
    scans = relationship("ScanResult", back_populates="user")


class ScanResult(Base):
    __tablename__ = "scan_results"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    host = Column(String(255), nullable=True)
    status = Column(String(50), default="Pending", nullable=False)
    results = Column(JSON, default=dict)  # JSON con todo el reporte
    scan_time = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="scans")


# ---------------------------------
# 3) helpers de sesión
# ---------------------------------
def init_db():
    """Crea todas las tablas definidas por Base."""
    Base.metadata.create_all(bind=engine)


def get_db():
    """Generador de sesión para FastAPI (Depends)."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

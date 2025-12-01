import os
import time
import asyncio
import yaml
import traceback
from sqlalchemy.orm import Session
from core.db import SessionLocal, init_db, ScanResult

# Importar escáneres de RED
from scanners.net.ports import scan_host
from scanners.net.tls import tls_info

# Importar escáneres WEB
from scanners.web.headers import check_headers
from scanners.web.sqli import check_sqli         # <--- NUEVO
from scanners.web.xss import check_xss           # <--- NUEVO
from scanners.web.enum import check_directories  # <--- NUEVO

# Cargar configuración
COMPANY_PROFILE_PATH = os.getenv("COMPANY_PROFILE", "config/company.yaml")
SCAN_INTERVAL_MIN = int(os.getenv("SCAN_INTERVAL_MIN", "60"))

def load_targets(path: str):
    try:
        with open(path, "r", encoding="utf-8") as f:
            return yaml.safe_load(f)["targets"]
    except Exception as e:
        print(f"[Error] No se pudo leer {path}: {e}")
        return []

async def scan_one(target: dict):
    host = target.get("host")
    url = target.get("web_url", f"http://{host}")
    ports = target.get("ports", [80, 443])

    print(f"[+] Iniciando escaneo completo para: {host} ({url})")
    
    try:
        # Ejecutar TODOS los escáneres en paralelo usando asyncio.gather
        # Esto es muy eficiente porque espera todas las respuestas de red a la vez
        results = await asyncio.gather(
            scan_host(host, ports),        # 0. Puertos
            asyncio.to_thread(tls_info, host), # 1. TLS (síncrono envuelto en hilo)
            check_headers(url),            # 2. Headers HTTP
            check_sqli(url),               # 3. SQL Injection
            check_xss(url),                # 4. XSS
            check_directories(url)         # 5. Directorios ocultos
        )

        # Desempaquetar resultados para guardar en JSON estructurado
        results_json = {
            "network": {
                "ports": results[0],
                "tls": results[1]
            },
            "web": {
                "headers": results[2],
                "sqli": results[3],
                "xss": results[4],
                "directories": results[5]
            }
        }
        
        status = "completed"
        
        # Log simple de hallazgos en consola
        n_vulns = len(results[3].get("findings", [])) + len(results[4].get("findings", [])) + len(results[5].get("findings", []))
        print(f"[OK] {host} finalizado. {n_vulns} posibles problemas web detectados.")

    except Exception as e:
        print(f"[ERROR] Falló el escaneo de {host}: {e}")
        traceback.print_exc()
        results_json = {"error": str(e)}
        status = "error"
    
    # Guardar en la Base de Datos
    db: Session = SessionLocal()
    try:
        db_result = ScanResult(
            host=host, 
            results=results_json,
            status=status 
        )
        db.add(db_result)
        db.commit()
        print(f"[DB] Resultado guardado exitosamente.")
    except Exception as db_e:
        print(f"[DB ERROR] No se pudo guardar en BD: {db_e}")
    finally:
        db.close()

async def run_scan_cycle():
    targets = load_targets(COMPANY_PROFILE_PATH)
    if not targets:
        print("[Info] No hay objetivos definidos en company.yaml")
        return

    # Escanear todos los objetivos en paralelo (cuidado con el ancho de banda si son muchos)
    await asyncio.gather(*(scan_one(t) for t in targets))
    print(f"--- Ciclo de escaneo completo. Esperando {SCAN_INTERVAL_MIN} min ---")

if __name__ == "__main__":
    print("--- INICIANDO SCHEDULER PYMESEC ---")
    print("Esperando inicialización de BD...")
    time.sleep(5)
    init_db()
    
    while True:
        asyncio.run(run_scan_cycle())
        time.sleep(SCAN_INTERVAL_MIN * 60)
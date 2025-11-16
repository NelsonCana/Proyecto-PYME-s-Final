import os
import time
import asyncio
import yaml
from sqlalchemy.orm import Session
from core.db import SessionLocal, init_db, ScanResult
from scanners.net.ports import scan_host
from scanners.net.tls import tls_info
from scanners.web.headers import check_headers

# Cargar configuración desde variables de entorno
COMPANY_PROFILE_PATH = os.getenv("COMPANY_PROFILE", "company.yaml")
SCAN_INTERVAL_MIN = int(os.getenv("SCAN_INTERVAL_MIN", "60"))

def load_targets(path: str):
    with open(path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)["targets"]

async def scan_one(target: dict):
    host, url, ports = target["host"], target["web_url"], target["ports"]
    print(f"[+] Escaneando {host}...")
    
    # Ejecutar todos los escaneos en paralelo
    port_res, tls_res, web_res = await asyncio.gather(
        scan_host(host, ports),
        asyncio.to_thread(tls_info, host),
        check_headers(url)
    )

    results = {"ports": port_res, "tls": tls_res, "web": web_res}
    
    print(f"[OK] {host} => {len(port_res.get('open_ports', []))} puertos abiertos, {len(web_res.get('findings', []))} observaciones.")
    
    # Guardar en la base de datos
    db: Session = SessionLocal()
    try:
        db_result = ScanResult(host=host, results=results)
        db.add(db_result)
        db.commit()
        print(f"[DB] Resultados de {host} guardados.")
    finally:
        db.close()

async def run_scan_cycle():
    targets = load_targets(COMPANY_PROFILE_PATH)
    await asyncio.gather(*(scan_one(t) for t in targets))
    print("--- Ciclo de escaneo completo ---")

if __name__ == "__main__":
    print("Inicializando base de datos...")
    init_db()
    
    while True:
        print(f"Iniciando ciclo de escaneo...")
        asyncio.run(run_scan_cycle())
        print(f"[Scheduler] Esperando {SCAN_INTERVAL_MIN} minutos para el próximo ciclo...")
        time.sleep(SCAN_INTERVAL_MIN * 60)

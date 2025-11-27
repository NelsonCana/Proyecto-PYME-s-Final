import httpx
import asyncio
from typing import Dict, Any

# Lista corta de rutas críticas para mantener el escaneo rápido
PATHS_TO_CHECK = [
    "/.git/HEAD",
    "/.env",
    "/admin",
    "/administrator",
    "/wp-admin",
    "/backup",
    "/config.php.bak",
    "/db.sql",
    "/dashboard"
]

async def check_directories(base_url: str) -> Dict[str, Any]:
    """
    Realiza fuerza bruta de directorios y archivos comunes sensibles.
    """
    findings = []
    
    # Asegurar que la URL base no tenga path ni query params excesivos
    # (Simplificación: asumimos que base_url viene limpio tipo http://ejemplo.com)
    if base_url.endswith("/"):
        base_url = base_url[:-1]

    async with httpx.AsyncClient(verify=False, timeout=3.0) as client:
        
        # Función auxiliar para verificar una ruta
        async def check_path(path):
            url = f"{base_url}{path}"
            try:
                resp = await client.get(url)
                # Si devuelve 200 OK, es un hallazgo (potencialmente)
                if resp.status_code == 200:
                    return f"Recurso expuesto encontrado: {path} (Status 200)"
                elif resp.status_code == 403:
                    return f"Recurso existente pero protegido: {path} (Status 403)"
            except Exception:
                pass
            return None

        # Ejecutar todas las comprobaciones en paralelo
        tasks = [check_path(p) for p in PATHS_TO_CHECK]
        results = await asyncio.gather(*tasks)
        
        # Filtrar los nulos (no encontrados)
        findings = [r for r in results if r is not None]

    return {
        "scan_type": "directory_enum",
        "found": len(findings),
        "findings": findings
    }

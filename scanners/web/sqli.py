import httpx
import asyncio
import time
from typing import Dict, Any

# Payloads básicos para detección
ERROR_PAYLOADS = ["'", "\"", "' OR 1=1 --", "\" OR 1=1 --"]
TIME_PAYLOADS = ["'; WAITFOR DELAY '0:0:5'--", "'; SLEEP(5)--", "' OR PG_SLEEP(5)--"]

# Firmas de error comunes en el HTML
SQL_ERRORS = [
    "SQL syntax", "MySQL Error", "Unclosed quotation mark", "ORA-", "PostgreSQL query failed"
]

async def check_sqli(url: str) -> Dict[str, Any]:
    """
    Intenta detectar vulnerabilidades SQL Injection (Error y Time-based) en parámetros URL.
    """
    findings = []
    
    # Si la URL no tiene parámetros, es difícil inyectar por GET (simplificación para MVP)
    if "?" not in url:
        return {"url": url, "findings": [], "note": "No hay parámetros GET para probar SQLi"}

    try:
        async with httpx.AsyncClient(verify=False, timeout=10.0) as client:
            
            # 1. Detección basada en Errores (Error-Based)
            for payload in ERROR_PAYLOADS:
                # Inyectamos el payload al final de la URL (forma simple)
                target = f"{url}{payload}"
                try:
                    resp = await client.get(target)
                    text = resp.text.lower()
                    for error in SQL_ERRORS:
                        if error.lower() in text:
                            findings.append(f"Posible SQLi (Error-Based) detectado con payload: {payload}")
                            break
                except Exception:
                    continue # Seguir si falla una petición

            # 2. Detección basada en Tiempo (Time-Based)
            # Solo probamos si no hemos encontrado nada grave aún para ahorrar tiempo
            if not findings:
                for payload in TIME_PAYLOADS:
                    target = f"{url}{payload}"
                    start_time = time.time()
                    try:
                        await client.get(target)
                        duration = time.time() - start_time
                        # Si tarda más de 4.5s (el sleep es 5s), es sospechoso
                        if duration > 4.5:
                            findings.append(f"Posible Blind SQLi (Time-Based) detectado. Retraso de {duration:.2f}s con: {payload}")
                            break 
                    except httpx.TimeoutException:
                        # Si da timeout, también puede ser indicador de que el sleep funcionó
                        findings.append(f"Posible Blind SQLi (Timeout) con: {payload}")
                        break
                    except Exception:
                        continue

            return {
                "scan_type": "sqli",
                "vulnerable": len(findings) > 0,
                "findings": findings
            }

    except Exception as e:
        return {"scan_type": "sqli", "error": str(e)}

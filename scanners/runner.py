import asyncio
import os
import json
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("PymeSecEngine") # Nombre más pro en los logs también

# Rutas configuradas en Dockerfile
TOOLS_PATH = "/tools"
SQLMAP_PATH = os.path.join(TOOLS_PATH, "sqlmap", "sqlmap.py")
XSSTRIKE_PATH = os.path.join(TOOLS_PATH, "xsstrike", "xsstrike.py")
DIRSEARCH_PATH = os.path.join(TOOLS_PATH, "dirsearch", "dirsearch.py")

async def run_cmd(cmd_list, timeout=180):
    """Ejecutor genérico de comandos con timeout"""
    try:
        process = await asyncio.create_subprocess_exec(
            *cmd_list,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        stdout, stderr = await asyncio.wait_for(process.communicate(), timeout=timeout)
        return stdout.decode(errors='ignore'), stderr.decode(errors='ignore')
    except asyncio.TimeoutError:
        try: process.kill() 
        except: pass
        return "", "Timeout"
    except Exception as e:
        return "", str(e)

# --- 1. MOTOR DE VULNERABILIDADES (Antes Nuclei) ---
async def scan_nuclei(target):
    cmd = ["nuclei", "-u", target, "-json", "-s", "critical,high"]
    out, err = await run_cmd(cmd, timeout=200)
    
    findings = []
    for line in out.split("\n"):
        if line:
            try:
                data = json.loads(line)
                # Ocultamos "Nuclei" y ponemos "CVE Scanner"
                findings.append({
                    "severity": data.get("info", {}).get("severity", "info").upper(),
                    "name": data.get("info", {}).get("name", "Vulnerabilidad Detectada"),
                    "description": f"Análisis de CVEs y Patrones: {data.get('info', {}).get('description')}",
                    "mitigation": "Revisar boletines de seguridad asociados."
                })
            except: pass
    return findings

# --- 2. MOTOR DE ESTRUCTURA WEB (Antes Dirsearch) ---
async def scan_dirsearch(target):
    temp_file = f"/tmp/dir_{os.urandom(4).hex()}.json"
    cmd = ["python3", DIRSEARCH_PATH, "-u", target, "--format=json", "-o", temp_file, "-x", "400-599", "--max-time", "60"]
    
    await run_cmd(cmd, timeout=70)
    
    findings = []
    if os.path.exists(temp_file):
        try:
            with open(temp_file) as f:
                data = json.load(f)
                results = data.get("results", [])
                for res in results:
                    findings.append({
                        "severity": "MEDIA",
                        "name": "Recurso Oculto Expuesto",
                        "description": f"El módulo de estructura web detectó una ruta sensible accesible: {res.get('path')} (Código {res.get('status')})",
                        "mitigation": "Restringir acceso o eliminar si no es necesario."
                    })
        except: pass
        os.remove(temp_file)
    return findings

# --- 3. MOTOR DE INTEGRIDAD DE BASE DE DATOS (Antes SQLMap) ---
async def scan_sqlmap(target):
    # --crawl=2 y --level=2 para profundidad media
    cmd = ["python3", SQLMAP_PATH, "-u", target, "--batch", "--crawl=2", "--level=2", "--risk=1"]
    out, err = await run_cmd(cmd, timeout=600)
    
    findings = []
    full_text = out + err
    
    if "Parameter:" in full_text and "Type:" in full_text:
        findings.append({
            "severity": "CRITICA",
            "name": "Inyección SQL (SQLi)",
            # Ocultamos "SQLMap"
            "description": "El motor de auditoría de base de datos confirmó que los parámetros de entrada no están sanitizados, permitiendo la manipulación de consultas SQL.",
            "mitigation": "Implementar 'Prepared Statements' y validación estricta de tipos de datos."
        })
    return findings

# --- 4. MOTOR HEURÍSTICO DE SCRIPTS (Antes XSStrike) ---
async def scan_xsstrike(target):
    cmd = ["python3", XSSTRIKE_PATH, "-u", target, "--crawl", "-l", "1", "--skip"]
    out, err = await run_cmd(cmd, timeout=180)
    
    findings = []
    if "Vulnerable" in out:
        findings.append({
            "severity": "ALTA",
            "name": "Cross-Site Scripting (XSS)",
            # Ocultamos "XSStrike"
            "description": "El análisis heurístico de comportamiento detectó que la aplicación refleja entradas de usuario sin filtrar, permitiendo la ejecución de JavaScript malicioso.",
            "mitigation": "Aplicar codificación de salida (Output Encoding) y configurar cabeceras CSP."
        })
    return findings

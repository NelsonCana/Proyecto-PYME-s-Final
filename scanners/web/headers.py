import aiohttp

async def check_headers(url):
    """
    Analiza las cabeceras HTTP de seguridad.
    Debe ser ASYNC para que api.py pueda hacer 'await'.
    """
    findings = []
    headers_analyzed = {}
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(url, timeout=5, ssl=False) as response:
                headers = response.headers
                # Convertimos a dict simple para el reporte
                headers_analyzed = {k: v for k, v in headers.items()}
                
                # Lista de headers que DEBERÍAN estar
                security_headers = [
                    "Strict-Transport-Security",
                    "Content-Security-Policy",
                    "X-Content-Type-Options",
                    "X-Frame-Options",
                    "Referrer-Policy",
                    "Permissions-Policy"
                ]
                
                for sh in security_headers:
                    if sh not in headers:
                        findings.append(f"Cabecera faltante: {sh}")
                    
                # Chequeo extra: HSTS solo vale en HTTPS
                if url.startswith("http://") and "Strict-Transport-Security" not in headers:
                    findings.append("La URL no usa HTTPS (HSTS no aplica).")

    except Exception as e:
        # Si falla la conexión, no rompemos todo, solo retornamos error
        return {"error": str(e), "findings": [], "headers": {}}

    return {
        "findings": findings,
        "headers": headers_analyzed
    }

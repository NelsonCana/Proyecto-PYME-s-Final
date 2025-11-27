import httpx
from typing import Dict, Any

# Payload inofensivo pero detectable
XSS_PAYLOAD = "<script>alert('PYMESEC')</script>"

async def check_xss(url: str) -> Dict[str, Any]:
    """
    Busca vulnerabilidades de XSS Reflejado en parámetros GET.
    """
    findings = []
    
    if "?" not in url:
        return {"url": url, "findings": [], "note": "No hay parámetros para probar XSS"}

    try:
        # Construimos la URL inyectada. 
        # En un caso real, deberíamos parsear cada parámetro. 
        # Aquí concatenamos al final para probar el último parámetro o la query string.
        target = f"{url}&test={XSS_PAYLOAD}" if "?" in url else f"{url}?test={XSS_PAYLOAD}"
        
        async with httpx.AsyncClient(verify=False, timeout=5.0) as client:
            resp = await client.get(target)
            
            # Verificamos si el payload volvió en el cuerpo de la respuesta
            if XSS_PAYLOAD in resp.text:
                findings.append("XSS Reflejado detectado: El payload se reflejó en la respuesta sin sanitizar.")
            
            return {
                "scan_type": "xss",
                "vulnerable": len(findings) > 0,
                "findings": findings
            }

    except Exception as e:
        return {"scan_type": "xss", "error": str(e)}

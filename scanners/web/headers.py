import httpx
from typing import Dict, Any

SECURITY_HEADERS = [
    "Strict-Transport-Security",
    "Content-Security-Policy",
    "X-Content-Type-Options",
    "X-Frame-Options",
    "Referrer-Policy",
    "Permissions-Policy",
]

def _validate_values(headers_lc: Dict[str, str]) -> list[str]:
    findings = []

    hsts = headers_lc.get("strict-transport-security")
    if hsts is not None:
        if "max-age=" not in hsts.lower():
            findings.append("HSTS sin max-age")
    xcto = headers_lc.get("x-content-type-options")
    if xcto and xcto.lower() != "nosniff":
        findings.append("X-Content-Type-Options distinto de 'nosniff'")
    xfo = headers_lc.get("x-frame-options")
    if xfo and xfo.upper() not in {"DENY", "SAMEORIGIN"}:
        findings.append("X-Frame-Options con valor no recomendado")
    # Puedes añadir validaciones extra (Referrer-Policy, Permissions-Policy, CSP)
    return findings

async def check_headers(url: str) -> Dict[str, Any]:
    """
    Revisa cabeceras de seguridad de una URL.
    """
    findings: list[str] = []
    try:
        timeout = httpx.Timeout(connect=5.0, read=10.0, write=5.0, pool=5.0)
        async with httpx.AsyncClient(follow_redirects=True, timeout=timeout) as client:
            # INTENTA HEAD primero
            try:
                resp = await client.request("HEAD", url)
            except httpx.HTTPStatusError:
                raise
            except Exception:
                # fallback a GET si HEAD falla
                resp = await client.get(url)

            headers_lc = {k.lower(): v for k, v in resp.headers.items()}

            # Si no es HTTPS, avisa (HSTS no aplica)
            if url.lower().startswith("http://"):
                findings.append("La URL no usa HTTPS (HSTS no aplica).")

            # Presencia
            for name in SECURITY_HEADERS:
                if name.lower() not in headers_lc:
                    # No pidas HSTS en HTTP
                    if name != "Strict-Transport-Security" or url.lower().startswith("https://"):
                        findings.append(f"Cabecera faltante: {name}")

            # Valores
            findings.extend(_validate_values(headers_lc))

            return {
                "url": url,
                "status": resp.status_code,
                "headers": dict(resp.headers),
                "findings": findings,
                "error": None,
            }

    except httpx.RequestError as e:
        return {"url": url, "findings": [], "error": f"No se pudo conectar: {e}"}


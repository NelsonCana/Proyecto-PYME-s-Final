import ssl
import socket
from datetime import datetime

def tls_info(host: str, port: int = 443) -> dict:
    """
    Obtiene información del certificado TLS de un host.
    """
    context = ssl.create_default_context()
    try:
        with socket.create_connection((host, port), timeout=3.0) as sock:
            with context.wrap_socket(sock, server_hostname=host) as ssock:
                cert = ssock.getpeercert()
                expiry_date = datetime.strptime(cert['notAfter'], '%b %d %H:%M:%S %Y %Z')
                
                return {
                    "host": host,
                    "issuer": dict(x[0] for x in cert['issuer']),
                    "subject": dict(x[0] for x in cert['subject']),
                    "expires": expiry_date.isoformat(),
                    "error": None
                }
    except Exception as e:
        return {"host": host, "error": str(e)}

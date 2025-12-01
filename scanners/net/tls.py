import ssl
import socket
import asyncio

async def tls_info(host):
    """
    Obtiene información del certificado SSL/TLS de forma asíncrona.
    """
    # Ejecutamos la operación bloqueante de sockets en un hilo aparte
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, _get_tls_sync, host)

def _get_tls_sync(host):
    """Función interna síncrona para extraer el certificado"""
    try:
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        
        with socket.create_connection((host, 443), timeout=5) as sock:
            with ctx.wrap_socket(sock, server_hostname=host) as ssock:
                cert = ssock.getpeercert()
                if not cert:
                    return None
                
                # Extraemos datos básicos
                issuer = dict(x[0] for x in cert['issuer'])
                return {
                    "issuer": issuer.get('organizationName', 'Desconocido'),
                    "expires": cert.get('notAfter', 'N/A'),
                    "version": ssock.version()
                }
    except:
        return None

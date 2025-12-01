import asyncio
import socket

async def check_socket(ip, port, timeout=3.0): # <--- ¡CAMBIO AQUÍ! (Antes 0.5)
    """Intenta conectar a un puerto usando Sockets con más paciencia."""
    conn = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    conn.settimeout(timeout)
    try:
        res = conn.connect_ex((ip, port))
        conn.close()
        return port if res == 0 else None
    except:
        return None

async def scan_ports_native(ip):
    """Escanea puertos críticos de forma asíncrona."""
    # Agregué algunos puertos extra por si acaso
    target_ports = [21, 22, 23, 25, 53, 80, 110, 443, 3306, 3389, 5432, 8000, 8080, 8443, 3000, 5000]
    tasks = [check_socket(ip, p) for p in target_ports]
    results = await asyncio.gather(*tasks)
    return [p for p in results if p is not None]

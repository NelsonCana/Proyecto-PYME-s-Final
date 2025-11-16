import asyncio
import socket

async def check_port(host: str, port: int) -> tuple[int, bool]:
    """
    Comprueba si un puerto está abierto en un host específico.
    """
    try:
        # Intenta conectar de forma asíncrona
        reader, writer = await asyncio.wait_for(
            asyncio.open_connection(host, port), timeout=1.0
        )
        writer.close()
        await writer.wait_closed()
        return port, True
    except (socket.error, asyncio.TimeoutError):
        return port, False

async def scan_host(host: str, ports: list[int]) -> dict:
    """
    Escanea una lista de puertos en un host y devuelve los que están abiertos.
    """
    tasks = [check_port(host, port) for port in ports]
    results = await asyncio.gather(*tasks)
    
    open_ports = [port for port, is_open in results if is_open]
    
    return {"host": host, "open_ports": open_ports}


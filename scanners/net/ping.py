import asyncio
import platform
import subprocess

async def check_ping(host: str):
    """
    Verifica si el host responde a ping (ICMP).
    Devuelve True si está vivo, False si no.
    """
    # Detectar sistema operativo para el comando correcto
    param = '-n' if platform.system().lower() == 'windows' else '-c'
    command = ['ping', param, '1', host]

    try:
        # Ejecutamos el comando en segundo plano sin bloquear la API
        process = await asyncio.create_subprocess_exec(
            *command,
            stdout=asyncio.subprocess.DEVNULL,
            stderr=asyncio.subprocess.DEVNULL
        )
        await process.wait()
        return process.returncode == 0
    except:
        return False

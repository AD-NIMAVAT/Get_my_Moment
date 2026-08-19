"""
Get My Moment - Production Server Entrypoint for Railway, Docker & Cloud VPS
Dynamically binds to the runtime HTTP PORT and avoids collisions with Camera FTP on 2121.
"""

import os
import sys
import logging
import uvicorn

if __name__ == "__main__":
    port_str = os.environ.get("PORT", "8000")
    try:
        port = int(port_str)
    except ValueError:
        port = 8000

    # If PORT is set to 2121 (which is reserved for Camera FTP TCP Proxy), route HTTP API to 8000
    if port == 2121:
        port = int(os.environ.get("HTTP_PORT", "8000"))
        print(f"⚡ [PORT RESOLVER] Detected PORT=2121 reserved for Camera FTP. Routing FastAPI HTTP API to port {port}...")

    host = "0.0.0.0"
    print(f"🚀 [GET MY MOMENT] Launching FastAPI Backend HTTP API on {host}:{port}...")
    sys.stdout.flush()
    uvicorn.run("apps.api.main:app", host=host, port=port, log_level="info")

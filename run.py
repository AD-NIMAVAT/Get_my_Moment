"""
Get My Moment - Production Server Entrypoint for Railway, Docker & Cloud VPS
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

    # Ensure Uvicorn matches Railway Public Networking Port 8000
    if port == 2121:
        port = 8000

    host = "0.0.0.0"
    print(f"🚀 [GET MY MOMENT] Launching FastAPI Backend HTTP API on {host}:{port}...")
    sys.stdout.flush()
    uvicorn.run("apps.api.main:app", host=host, port=port, log_level="info")

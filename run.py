"""
Get My Moment - Production Server Entrypoint for Railway, Docker & Cloud VPS
Dynamically binds to the runtime PORT provided by the cloud container.
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

    host = "0.0.0.0"
    print(f"🚀 [GET MY MOMENT] Launching FastAPI Backend on {host}:{port}...")
    uvicorn.run("apps.api.main:app", host=host, port=port, log_level="info")

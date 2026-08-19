"""
Get My Moment - Wireless Camera Wi-Fi Bridge
Runs on photographer's laptop at event venue.
Listens for Camera FTP uploads over local Wi-Fi and instantly streams them to Get My Moment Cloud API.
"""

import os
import sys
import time
import socket
import logging
import argparse
from pathlib import Path
from PIL import Image
import httpx
from pyftpdlib.authorizers import DummyAuthorizer
from pyftpdlib.handlers import FTPHandler
from pyftpdlib.servers import FTPServer

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("CameraBridge")

DEFAULT_API_URL = "https://web-production-08582.up.railway.app/api/v1"
INCOMING_DIR = Path("./data/local_camera_incoming")
INCOMING_DIR.mkdir(parents=True, exist_ok=True)


def get_laptop_wifi_ip() -> str:
    """Detect the laptop's local Wi-Fi IP address on the current network."""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"


class CloudRelayFTPHandler(FTPHandler):
    """Custom FTP handler that forwards uploaded photos to Get My Moment Cloud."""
    active_event_id = None
    cloud_api_url = DEFAULT_API_URL

    def on_file_received(self, file_path):
        """Triggered immediately when a camera finishes uploading a photo."""
        logger.info(f"📷 [CAMERA CLICK RECEIVED] {file_path}")
        time.sleep(0.3)  # Settling delay for full file write
        
        try:
            # Verify image file integrity
            with Image.open(file_path) as img:
                img.verify()
            with Image.open(file_path) as img:
                img.load()

            # Upload to Cloud API
            filename = os.path.basename(file_path)
            target_url = f"{self.cloud_api_url}/wireless/events/{self.active_event_id}/http-ingest"
            
            with open(file_path, "rb") as f:
                file_bytes = f.read()
                
            files = {"files": (filename, file_bytes, "image/jpeg")}
            data = {"camera_model": "Sony/Canon Wi-Fi Bridge"}
            
            logger.info(f"⚡ [CLOUD STREAM] Uploading {filename} to Get My Moment Cloud ({target_url})...")
            with httpx.Client(timeout=30.0) as client:
                res = client.post(target_url, files=files, data=data)
                
            if res.status_code == 200:
                resp_json = res.json()
                logger.info(f"✅ [SUCCESS] {filename} ingested! Indexed faces: {resp_json.get('ingested', [{}])[0].get('faces_found', 0)}")
            else:
                logger.error(f"❌ [CLOUD UPLOAD FAILED] HTTP {res.status_code}: {res.text}")

        except Exception as e:
            logger.error(f"❌ [RELAY ERROR] Failed to process {file_path}: {e}")


def run_bridge(event_id: str, port: int = 2121, api_url: str = DEFAULT_API_URL):
    local_ip = get_laptop_wifi_ip()
    CloudRelayFTPHandler.active_event_id = event_id
    CloudRelayFTPHandler.cloud_api_url = api_url

    authorizer = DummyAuthorizer()
    authorizer.add_user("camera", "shoot123", str(INCOMING_DIR), perm="elradfmwMT")
    authorizer.add_anonymous(str(INCOMING_DIR), perm="elradfmwMT")

    handler = CloudRelayFTPHandler
    handler.authorizer = authorizer
    handler.banner = "Get My Moment Wireless Camera Bridge Ready."
    handler.passive_ports = range(60000, 60050)

    server = FTPServer(("0.0.0.0", port), handler)
    server.max_cons = 256
    server.max_cons_per_ip = 20

    print("\n" + "=" * 70)
    print("🚀 GET MY MOMENT — WIRELESS CAMERA LIVE SYNC BRIDGE")
    print("=" * 70)
    print(f"📡 Your Laptop Wi-Fi IP  : {local_ip}")
    print(f"🔌 Camera FTP Port       : {port}")
    print(f"👤 Camera Username       : camera")
    print(f"🔑 Camera Password       : shoot123")
    print(f"🎯 Target Cloud Event ID : {event_id}")
    print(f"☁️ Cloud Backend Target   : {api_url}")
    print("=" * 70)
    print(f"\n👉 Set your Sony / Canon / Nikon Camera FTP Host to: {local_ip}")
    print("👉 Now click your camera shutter — photos will stream directly to the cloud!\n")

    server.serve_forever()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Get My Moment Wireless Camera Bridge")
    parser.add_argument("--event", required=True, help="Target Event ID to stream photos into")
    parser.add_argument("--port", type=int, default=2121, help="FTP Port (default: 2121)")
    parser.add_argument("--api", default=DEFAULT_API_URL, help="Cloud API Base URL")
    args = parser.parse_args()

    run_bridge(event_id=args.event, port=args.port, api_url=args.api)

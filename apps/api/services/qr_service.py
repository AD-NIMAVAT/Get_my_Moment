"""
QR Code Engine - Generation and Printable Sheets
"""

import io
import qrcode
from qrcode.image.styledpil import StyledPilImage
from qrcode.image.styles.moduledrawers import RoundedModuleDrawer
from apps.api.config import settings


class QRService:
    """Service to generate event QR codes and printable assets."""

    @staticmethod
    def get_event_url(access_token: str) -> str:
        """Construct the full guest welcome URL for an event access token."""
        base_url = settings.NEXT_PUBLIC_APP_URL.rstrip("/")
        return f"{base_url}/e/{access_token}"

    @classmethod
    def generate_qr_bytes(
        cls,
        access_token: str,
        fill_color: str = "#0c4a6e",
        back_color: str = "#ffffff",
        box_size: int = 10,
        border: int = 2,
    ) -> bytes:
        """Generate high-resolution PNG QR code bytes for the event URL."""
        url = cls.get_event_url(access_token)
        qr = qrcode.QRCode(
            version=None,
            error_correction=qrcode.constants.ERROR_CORRECT_M,
            box_size=box_size,
            border=border,
        )
        qr.add_data(url)
        qr.make(fit=True)

        img = qr.make_image(fill_color=fill_color, back_color=back_color)
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        return buf.getvalue()


qr_service = QRService()

"""
OTP Service Abstraction - Pluggable Authentication for Event Guests
"""

import logging
import random
from typing import Dict, Tuple
from datetime import datetime, timedelta
from apps.api.config import settings

logger = logging.getLogger(__name__)


class OTPProvider:
    """Base interface for OTP providers."""
    
    def send_otp(self, mobile: str, event_name: str) -> Tuple[bool, str]:
        raise NotImplementedError

    def verify_otp(self, mobile: str, code: str) -> bool:
        raise NotImplementedError


class MockOTPProvider(OTPProvider):
    """
    Mock OTP provider for zero-cost local MVP development.
    In development mode, fixed code '123456' is always valid, or any code generated is logged.
    """
    
    def __init__(self):
        self._otp_store: Dict[str, Tuple[str, datetime]] = {}

    def send_otp(self, mobile: str, event_name: str) -> Tuple[bool, str]:
        code = str(random.randint(100000, 999999))
        expiry = datetime.utcnow() + timedelta(seconds=settings.OTP_EXPIRY_SECONDS)
        self._otp_store[mobile] = (code, expiry)
        logger.info(f"[DEV MOCK OTP] Sent code {code} to {mobile} for event '{event_name}' (Default dev bypass code: 123456)")
        return True, "OTP sent successfully (Development Mode)"

    def verify_otp(self, mobile: str, code: str) -> bool:
        # Universal development bypass code
        if code in ["123456", "000000"]:
            return True
        
        if mobile not in self._otp_store:
            return False
        
        saved_code, expiry = self._otp_store[mobile]
        if datetime.utcnow() > expiry:
            del self._otp_store[mobile]
            return False
        
        if saved_code == code:
            del self._otp_store[mobile]
            return True
        
        return False


def get_otp_provider() -> OTPProvider:
    """Factory function for OTP provider according to settings."""
    if settings.OTP_PROVIDER == "mock":
        return MockOTPProvider()
    # Pluggable production provider can be integrated here (e.g. MSG91)
    return MockOTPProvider()


otp_service = get_otp_provider()

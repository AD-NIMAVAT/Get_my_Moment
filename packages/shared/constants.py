"""
Get My Moment - Shared Constants
"""

from enum import Enum


class PhotoStatus(str, Enum):
    UPLOADED = "UPLOADED"
    PROCESSING = "PROCESSING"
    PROCESSED = "PROCESSED"
    FAILED = "FAILED"
    DUPLICATE = "DUPLICATE"


class EventStatus(str, Enum):
    DRAFT = "DRAFT"
    ACTIVE = "ACTIVE"
    PAUSED = "PAUSED"
    EXPIRED = "EXPIRED"
    ARCHIVED = "ARCHIVED"


class UserRole(str, Enum):
    PHOTOGRAPHER = "PHOTOGRAPHER"
    ADMIN = "ADMIN"


class StorageDriver(str, Enum):
    LOCAL = "local"
    S3 = "s3"
    R2 = "r2"


# AI Vector constants
FACE_EMBEDDING_DIMENSIONS = 128
DEFAULT_SIMILARITY_THRESHOLD = 0.65
THUMBNAIL_SIZES = {
    "small": (400, 400),
    "medium": (1200, 1200),
}

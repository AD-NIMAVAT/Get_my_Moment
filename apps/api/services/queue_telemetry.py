"""
Queue & Pipeline Observability Service (P1-BATCH-06)
"""

import logging
from typing import Dict, Any, Optional
from apps.api.config import settings

logger = logging.getLogger(__name__)


class QueueTelemetryService:
    """Safe, non-blocking inspector for Redis & Celery queue metrics."""

    def __init__(self):
        self._redis_client = None

    def _get_redis(self):
        if self._redis_client is None:
            try:
                import redis
                self._redis_client = redis.from_url(
                    settings.REDIS_URL,
                    socket_timeout=0.5,
                    socket_connect_timeout=0.5,
                )
            except Exception as e:
                logger.debug(f"Redis client initialization failed: {e}")
                self._redis_client = None
        return self._redis_client

    def get_queue_depth(self, queue_name: str = "celery") -> int:
        """Get the current number of pending tasks in the Redis queue."""
        r = self._get_redis()
        if not r:
            return 0
        try:
            length = r.llen(queue_name)
            return int(length) if length is not None else 0
        except Exception as e:
            logger.debug(f"Error fetching queue depth from Redis: {e}")
            return 0

    def get_pipeline_telemetry(self) -> Dict[str, Any]:
        """Aggregate safe operational queue metrics without exposing secrets."""
        depth = self.get_queue_depth()
        return {
            "queue_name": "celery",
            "queue_depth": depth,
            "broker_type": "redis",
            "is_backlogged": depth > 50,
        }


queue_telemetry = QueueTelemetryService()

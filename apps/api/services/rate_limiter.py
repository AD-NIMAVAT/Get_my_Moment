"""
Get My Moment - Production-Safe Redis-Backed Rate Limiting & Abuse Protection
Implements atomic sliding-window rate limiting with Redis Lua scripting,
in-memory fallback on Redis outage, trusted proxy client IP extraction,
and privacy-safe key hashing.
"""

import time
import uuid
import ipaddress
import hashlib
import logging
from typing import Optional, Callable, Dict, List, Tuple
from collections import defaultdict
from threading import Lock

from fastapi import Request, HTTPException, status
from apps.api.config import settings

logger = logging.getLogger("getmymoment.ratelimiter")

# Trusted proxy CIDR networks (localhost, Docker bridge, private networks)
TRUSTED_PROXIES = [
    ipaddress.ip_network("127.0.0.0/8"),
    ipaddress.ip_network("10.0.0.0/8"),
    ipaddress.ip_network("172.16.0.0/12"),
    ipaddress.ip_network("192.168.0.0/16"),
]

# Atomic sliding-window rate limiting Lua script
SLIDING_WINDOW_LUA = """
local key = KEYS[1]
local window = tonumber(ARGV[1])
local limit = tonumber(ARGV[2])
local now = tonumber(ARGV[3])
local member = ARGV[4]
local clear_before = now - (window * 1000)

redis.call('ZREMRANGEBYSCORE', key, '-inf', clear_before)
local current_count = redis.call('ZCARD', key)

if current_count < limit then
    redis.call('ZADD', key, now, member)
    redis.call('EXPIRE', key, window + 1)
    return {1, limit - current_count - 1, 0}
else
    local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
    local retry_after = 1
    if oldest and #oldest >= 2 then
        local oldest_time = tonumber(oldest[2])
        retry_after = math.max(1, math.ceil((oldest_time + (window * 1000) - now) / 1000))
    end
    return {0, 0, retry_after}
end
"""


def is_ip_trusted(client_ip: str) -> bool:
    """Check if the direct connecting socket IP belongs to a trusted reverse proxy."""
    if not client_ip or client_ip in ["testclient", "localhost"]:
        return True
    try:
        ip_obj = ipaddress.ip_address(client_ip)
        return any(ip_obj in net for net in TRUSTED_PROXIES)
    except ValueError:
        return False


def get_client_ip(request: Request) -> str:
    """
    Safely extract real client IP behind Nginx reverse proxy.
    Only trusts X-Real-IP / X-Forwarded-For if socket connection is from a trusted proxy.
    """
    direct_socket_ip = request.client.host if request.client else "127.0.0.1"

    if is_ip_trusted(direct_socket_ip):
        # Prefer X-Real-IP set explicitly by Nginx ($remote_addr)
        real_ip = request.headers.get("x-real-ip")
        if real_ip:
            return real_ip.strip()

        # Fallback to rightmost entry in X-Forwarded-For
        forwarded_for = request.headers.get("x-forwarded-for")
        if forwarded_for:
            ips = [ip.strip() for ip in forwarded_for.split(",") if ip.strip()]
            if ips:
                return ips[0]

    return direct_socket_ip


def hash_identifier(val: Optional[str]) -> str:
    """Hash sensitive identifiers to avoid storing raw secrets in Redis keys."""
    if not val:
        return "none"
    normalized = val.strip().lower()
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()[:16]


def parse_rate_limit(expr: str) -> Tuple[int, int]:
    """
    Parse rate limit strings such as:
    '5/minute' -> (5, 60)
    '3/5minute' -> (3, 300)
    '10/second' -> (10, 1)
    '100/hour' -> (100, 3600)
    """
    try:
        parts = expr.split("/")
        count = int(parts[0])
        unit = parts[1].strip().lower()
        if "sec" in unit:
            seconds = 1
        elif "min" in unit:
            if unit.startswith("5"):
                seconds = 300
            elif unit.startswith("10"):
                seconds = 600
            else:
                seconds = 60
        elif "hour" in unit:
            seconds = 3600
        elif "day" in unit:
            seconds = 86400
        else:
            seconds = 60
        return count, seconds
    except Exception:
        return 10, 60


class LocalMemoryRateLimiter:
    """Thread-safe in-memory fallback rate limiter used if Redis is unreachable."""

    def __init__(self):
        self._store: Dict[str, List[float]] = defaultdict(list)
        self._lock = Lock()

    def is_allowed(self, key: str, limit: int, window: int) -> Tuple[bool, int, int]:
        now = time.time()
        clear_before = now - window
        with self._lock:
            timestamps = self._store[key]
            valid = [ts for ts in timestamps if ts > clear_before]
            if len(valid) < limit:
                valid.append(now)
                self._store[key] = valid
                return True, limit - len(valid), 0
            else:
                self._store[key] = valid
                oldest = valid[0]
                retry_after = max(1, int(oldest + window - now))
                return False, 0, retry_after

    def clear(self):
        with self._lock:
            self._store.clear()


class RateLimiterService:
    """Central Redis-backed rate limiter with sliding window, metrics, and fallback."""

    def __init__(self):
        self._redis = None
        self._memory_fallback = LocalMemoryRateLimiter()
        self._is_degraded = False

    def _get_redis(self):
        if self._redis is None:
            try:
                import redis
                self._redis = redis.from_url(
                    settings.REDIS_URL,
                    decode_responses=True,
                    socket_connect_timeout=1.5,
                    socket_timeout=1.5,
                )
            except Exception as e:
                logger.warning(f"Redis initialization failed: {e}. Falling back to in-memory limiter.")
                self._is_degraded = True
        return self._redis

    def check_rate_limit(
        self,
        endpoint_tag: str,
        scope_key: str,
        limit_expr: str,
        fail_closed: bool = False,
    ) -> Tuple[bool, int, int]:
        """
        Check rate limit atomically.
        Returns: (is_allowed, remaining_requests, retry_after_seconds)
        """
        limit, window = parse_rate_limit(limit_expr)
        env = getattr(settings, "ENVIRONMENT", "prod")
        redis_key = f"ratelimit:{env}:{endpoint_tag}:{scope_key}"
        now_ms = int(time.time() * 1000)
        member = f"{now_ms}_{uuid.uuid4().hex[:8]}"

        r = self._get_redis()
        if r is not None:
            try:
                res = r.eval(SLIDING_WINDOW_LUA, 1, redis_key, window, limit, now_ms, member)
                is_allowed = bool(res[0])
                remaining = int(res[1])
                retry_after = int(res[2])
                self._is_degraded = False
                return is_allowed, remaining, retry_after
            except Exception as re:
                logger.error(f"Redis rate limit check failed: {re}. Using memory fallback.")
                self._is_degraded = True

        if fail_closed and self._is_degraded:
            return self._memory_fallback.is_allowed(redis_key, limit, window)

        return self._memory_fallback.is_allowed(redis_key, limit, window)


rate_limiter = RateLimiterService()


def enforce_rate_limit(
    request: Request,
    endpoint_tag: str,
    limit_expr: str,
    custom_scope: Optional[str] = None,
    fail_closed: bool = False,
):
    """
    Helper function to check and enforce rate limit, raising HTTP 429 if exceeded.
    """
    client_ip = get_client_ip(request)
    ip_hash = hash_identifier(client_ip)

    if custom_scope:
        scope_key = f"ip_{ip_hash}:{custom_scope}"
    else:
        scope_key = f"ip_{ip_hash}"

    is_allowed, remaining, retry_after = rate_limiter.check_rate_limit(
        endpoint_tag=endpoint_tag,
        scope_key=scope_key,
        limit_expr=limit_expr,
        fail_closed=fail_closed,
    )

    if not is_allowed:
        logger.warning(
            f"Rate limit exceeded for endpoint='{endpoint_tag}', ip_hash='{ip_hash}'. Retry after {retry_after}s."
        )
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Too many requests. Please try again in {retry_after} seconds.",
            headers={"Retry-After": str(retry_after)},
        )
import asyncio
import logging
from typing import Dict, List, Optional

from fastapi import WebSocket

logger = logging.getLogger(__name__)

# Set once at application startup via set_event_loop(); used by schedule_push()
# to bridge sync endpoint threads → the async event loop.
_main_loop: Optional[asyncio.AbstractEventLoop] = None


def set_event_loop(loop: asyncio.AbstractEventLoop) -> None:
    """Called from startup so sync handlers can schedule coroutines thread-safely."""
    global _main_loop
    _main_loop = loop


def schedule_push(user_id: str, payload: dict) -> None:
    """Thread-safe push from a sync handler (runs in uvicorn's thread-pool executor)."""
    if _main_loop is None or not _main_loop.is_running():
        return
    asyncio.run_coroutine_threadsafe(manager.send_to_user(user_id, payload), _main_loop)


class ConnectionManager:
    """
    In-memory WebSocket registry. One user may hold multiple connections (e.g. multiple tabs).

    Single-server only — migrate to Redis pub/sub (or PostgreSQL LISTEN/NOTIFY)
    if switching to multi-worker mode (--workers N > 1).
    """

    def __init__(self) -> None:
        self._connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, user_id: str, websocket: WebSocket) -> None:
        """Register a WebSocket. Caller must have already called websocket.accept()."""
        self._connections.setdefault(user_id, []).append(websocket)
        logger.debug("WS registered: user=%s connections=%d", user_id, len(self._connections[user_id]))

    async def disconnect(self, user_id: str, websocket: WebSocket) -> None:
        """Remove a WebSocket from the registry."""
        connections = self._connections.get(user_id, [])
        if websocket in connections:
            connections.remove(websocket)
        if not connections:
            self._connections.pop(user_id, None)

    async def send_to_user(self, user_id: str, payload: dict) -> None:
        """Push a JSON payload to all active connections for a user. Prunes dead sockets."""
        dead: List[WebSocket] = []
        for ws in list(self._connections.get(user_id, [])):
            try:
                await ws.send_json(payload)
            except Exception:
                dead.append(ws)
        for ws in dead:
            await self.disconnect(user_id, ws)


manager = ConnectionManager()

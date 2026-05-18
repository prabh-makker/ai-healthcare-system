import logging

from fastapi import APIRouter, Depends, Query, WebSocket, WebSocketDisconnect
from jose import JWTError
from sqlalchemy.orm import Session

from app.core.security import verify_token
from app.core.ws_manager import manager
from app.db.session import get_db
from app.models.models import User

logger = logging.getLogger(__name__)

router = APIRouter()


@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    token: str = Query(...),
    db: Session = Depends(get_db),
):
    """
    Real-time notification stream.
    Authenticate with a short-lived token from GET /api/v1/notifications/ws-token.
    Close code 4001 = auth failure; the client should not retry on this code.
    """
    # Validate the short-lived JWT before accepting
    try:
        user_id = verify_token(token)
    except JWTError:
        await websocket.close(code=4001)
        return

    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.is_active:
        await websocket.close(code=4001)
        return

    await websocket.accept()
    await manager.connect(user_id, websocket)
    logger.info("WS connected: user=%s", user.email)

    try:
        while True:
            # Receive loop keeps the connection alive and detects client disconnects.
            # Incoming data (e.g. ping frames) is intentionally ignored.
            await websocket.receive_text()
    except WebSocketDisconnect:
        logger.info("WS disconnected: user=%s", user.email)
    finally:
        await manager.disconnect(user_id, websocket)

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database.session import get_db

router = APIRouter(tags=["health"])


@router.get("/health", summary="Check API and database health")
def health_check(db: Session = Depends(get_db)) -> dict[str, str]:
    try:
        db.execute(text("SELECT 1"))
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"code": "DATABASE_UNAVAILABLE", "message": "Database is unavailable"},
        ) from exc
    return {"status": "ok", "database": "connected", "version": "1.0.0"}
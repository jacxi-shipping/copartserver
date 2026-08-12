from datetime import UTC, datetime
from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.auction import Auction
from app.models.import_job import ImportJob

router = APIRouter(prefix="/api/v1", tags=["statistics"])
@router.get("/stats")
def stats(db: Session = Depends(get_db)) -> dict:
    now = datetime.now(UTC)
    count = lambda condition: db.scalar(select(func.count()).select_from(Auction).where(condition)) or 0
    return {"success": True, "data": {"total_auctions": count(True), "upcoming_auctions": count(Auction.sale_datetime_utc >= now), "today_auctions": count(Auction.sale_date == now.date()), "past_auctions": count(Auction.sale_datetime_utc < now), "unscheduled_auctions": count(Auction.sale_datetime_utc.is_(None)), "unique_makes": db.scalar(select(func.count(func.distinct(Auction.make)))) or 0, "unique_states": db.scalar(select(func.count(func.distinct(Auction.location_state)))) or 0, "unique_yards": db.scalar(select(func.count(func.distinct(Auction.yard_name)))) or 0, "last_import": db.scalar(select(func.max(ImportJob.completed_at))), "last_update": db.scalar(select(func.max(Auction.updated_at)))}}
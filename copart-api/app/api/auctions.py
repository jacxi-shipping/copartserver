from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.encoders import jsonable_encoder
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.auction import Auction
from app.repositories.auction_repository import list_auctions
from app.schemas.common import Pagination

router = APIRouter(prefix="/api/v1/auctions", tags=["auctions"])


def response(rows: list[Auction], total: int, page: int, page_size: int) -> dict: return {"success": True, "pagination": Pagination.create(page, page_size, total).model_dump(), "data": jsonable_encoder(rows)}

@router.get("")
def auctions(page: int = Query(1, ge=1), page_size: int = Query(50, ge=1, le=500), sort: str = "sale_datetime_asc", db: Session = Depends(get_db)) -> dict:
    rows, total = list_auctions(db, {"include_past": True}, page, page_size, sort); return response(rows, total, page, page_size)

@router.get("/upcoming")
def upcoming(page: int = Query(1, ge=1), page_size: int = Query(50, ge=1, le=500), db: Session = Depends(get_db)) -> dict:
    rows, total = list_auctions(db, {}, page, page_size, "sale_datetime_asc"); return response(rows, total, page, page_size)

@router.get("/today")
def today(only_upcoming: bool = True, page: int = Query(1, ge=1), page_size: int = Query(50, ge=1, le=500), db: Session = Depends(get_db)) -> dict:
    rows, total = list_auctions(db, {"today": True, "include_past": not only_upcoming}, page, page_size, "sale_datetime_asc"); return response(rows, total, page, page_size)

@router.get("/lot/{lot_number}")
def lot(lot_number: int, db: Session = Depends(get_db)) -> dict:
    row = db.scalar(select(Auction).where(Auction.lot_number == lot_number))
    if not row: raise HTTPException(404, detail={"code": "LOT_NOT_FOUND", "message": f"Auction lot {lot_number} was not found"})
    return {"success": True, "data": jsonable_encoder(row)}

@router.get("/vin/{vin}")
def vin(vin: str, db: Session = Depends(get_db)) -> dict:
    rows = db.scalars(select(Auction).where(Auction.vin.ilike(vin))).all()
    if not rows: raise HTTPException(404, detail={"code": "VIN_NOT_FOUND", "message": f"VIN {vin} was not found"})
    return {"success": True, "data": jsonable_encoder(rows)}

@router.get("/{auction_id}")
def auction(auction_id: int, db: Session = Depends(get_db)) -> dict:
    row = db.get(Auction, auction_id)
    if not row: raise HTTPException(404, detail={"code": "AUCTION_NOT_FOUND", "message": "Auction was not found"})
    return {"success": True, "data": jsonable_encoder(row)}
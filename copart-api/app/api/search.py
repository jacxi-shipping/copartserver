from fastapi import APIRouter, Depends, Request
from fastapi.encoders import jsonable_encoder
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.auction import Auction
from app.repositories.auction_repository import list_auctions
from app.schemas.common import Pagination
from app.schemas.search import SearchRequest

router = APIRouter(prefix="/api/v1", tags=["search"])

def run(request: SearchRequest, db: Session) -> dict:
    filters = request.model_dump(by_alias=True, exclude_none=True)
    page, page_size, sort = request.page, request.page_size, request.sort
    filters.pop("page", None); filters.pop("page_size", None); filters.pop("sort", None)
    rows, total = list_auctions(db, filters, page, page_size, sort)
    return {"success": True, "query": filters.get("q") or filters.get("query"), "pagination": Pagination.create(page, page_size, total).model_dump(), "data": jsonable_encoder(rows)}

@router.get("/search")
def search(request: Request, db: Session = Depends(get_db)) -> dict:
    values = dict(request.query_params)
    states = request.query_params.getlist("states")
    if states:
        values["states"] = states
    return run(SearchRequest.model_validate(values), db)

@router.post("/search")
def post_search(request: SearchRequest, db: Session = Depends(get_db)) -> dict: return run(request, db)

@router.get("/autocomplete")
def autocomplete(q: str, db: Session = Depends(get_db)) -> dict:
    return {"success": True, "data": {key: db.scalars(select(column).where(column.ilike(f"%{q}%")).distinct().limit(10)).all() for key, column in {"makes": Auction.make, "models": Auction.model_group, "yards": Auction.yard_name, "cities": Auction.location_city, "states": Auction.location_state}.items()}}

@router.get("/search/facets")
def facets(q: str | None = None, db: Session = Depends(get_db)) -> dict:
    return {"success": True, "data": {key: [{"value": value, "count": count} for value, count in db.execute(select(column, func.count()).group_by(column).limit(100)).all()] for key, column in {"makes": Auction.make, "models": Auction.model_group, "states": Auction.location_state, "years": Auction.year, "damage": Auction.damage_description, "fuel_types": Auction.fuel_type, "transmissions": Auction.transmission, "drive": Auction.drive}.items()}}
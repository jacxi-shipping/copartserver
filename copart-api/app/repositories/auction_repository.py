from datetime import UTC, datetime
from typing import Any

from sqlalchemy import Select, String, func, or_, select
from sqlalchemy.orm import Session

from app.models.auction import Auction
from app.services.normalization import normalize_search_text

SORTS = {"sale_datetime_asc": Auction.sale_datetime_utc.asc(), "sale_datetime_desc": Auction.sale_datetime_utc.desc(), "year_asc": Auction.year.asc(), "year_desc": Auction.year.desc(), "price_asc": Auction.estimated_retail_value.asc(), "price_desc": Auction.estimated_retail_value.desc(), "odometer_asc": Auction.odometer.asc(), "odometer_desc": Auction.odometer.desc(), "lot_number_asc": Auction.lot_number.asc(), "lot_number_desc": Auction.lot_number.desc(), "updated_desc": Auction.updated_at.desc()}
FILTERS = {"lot_number": Auction.lot_number, "vin": Auction.vin, "make": Auction.make, "model_group": Auction.model_group, "model_detail": Auction.model_detail, "trim": Auction.trim, "year": Auction.year, "vehicle_type": Auction.vehicle_type, "body_style": Auction.body_style, "color": Auction.color, "damage": Auction.damage_description, "secondary_damage": Auction.secondary_damage, "sale_title_state": Auction.sale_title_state, "sale_title_type": Auction.sale_title_type, "lot_condition_code": Auction.lot_condition_code, "engine": Auction.engine, "drive": Auction.drive, "transmission": Auction.transmission, "fuel_type": Auction.fuel_type, "cylinders": Auction.cylinders, "runs_drives": Auction.runs_drives, "sale_status": Auction.sale_status, "location_city": Auction.location_city, "location_state": Auction.location_state, "location_zip": Auction.location_zip, "yard_number": Auction.yard_number, "yard_name": Auction.yard_name, "seller_name": Auction.seller_name, "sale_light": Auction.sale_light, "autograde": Auction.autograde, "has_keys": Auction.has_keys, "make_offer_eligible": Auction.make_offer_eligible}


def build_query(filters: dict[str, Any]) -> Select[tuple[Auction]]:
    statement = select(Auction)
    now = datetime.now(UTC)
    if filters.get("today"):
        statement = statement.where(Auction.sale_date == now.date())
        if filters.get("upcoming_only") and not filters.get("include_past"):
            statement = statement.where(Auction.sale_datetime_utc >= now)
    elif filters.get("upcoming_only", True) and not filters.get("include_past"):
        statement = statement.where(or_(Auction.sale_datetime_utc >= now, Auction.sale_datetime_utc.is_(None) if filters.get("include_unscheduled") else False))
    query = filters.get("q") or filters.get("query")
    if query:
        normalized = normalize_search_text(str(query))
        statement = statement.where(or_(Auction.lot_number.cast(String) == normalized, func.lower(Auction.vin) == str(query).lower(), Auction.search_text.contains(normalized)))
    for key, column in FILTERS.items():
        if filters.get(key) is not None: statement = statement.where(column.ilike(f"%{filters[key]}%") if isinstance(filters[key], str) else column == filters[key])
    if filters.get("year_min") is not None: statement = statement.where(Auction.year >= filters["year_min"])
    if filters.get("year_max") is not None: statement = statement.where(Auction.year <= filters["year_max"])
    for minimum_key, maximum_key, column in (("odometer_min", "odometer_max", Auction.odometer), ("estimated_retail_value_min", "estimated_retail_value_max", Auction.estimated_retail_value), ("repair_cost_min", "repair_cost_max", Auction.repair_cost), ("buy_it_now_min", "buy_it_now_max", Auction.buy_it_now_price)):
        if filters.get(minimum_key) is not None: statement = statement.where(column >= filters[minimum_key])
        if filters.get(maximum_key) is not None: statement = statement.where(column <= filters[maximum_key])
    if filters.get("sale_date_from") is not None: statement = statement.where(Auction.sale_date >= filters["sale_date_from"])
    if filters.get("sale_date_to") is not None: statement = statement.where(Auction.sale_date <= filters["sale_date_to"])
    if filters.get("states"): statement = statement.where(Auction.location_state.in_(filters["states"]))
    return statement


def list_auctions(db: Session, filters: dict[str, Any], page: int, page_size: int, sort: str) -> tuple[list[Auction], int]:
    statement = build_query(filters)
    total = db.scalar(select(func.count()).select_from(statement.subquery())) or 0
    rows = db.scalars(statement.order_by(SORTS.get(sort, SORTS["sale_datetime_asc"])).offset((page - 1) * page_size).limit(page_size)).all()
    return rows, total
import csv
from collections.abc import Iterator
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app.models.auction import Auction
from app.services.datetime_service import build_sale_datetimes
from app.services.normalization import clean_string, extract_url, normalize_header, normalize_search_text, parse_boolean, parse_datetime, parse_decimal, parse_integer

REQUIRED = {"lot_number", "sale_date_m_d_cy", "sale_time_hhmm", "time_zone", "year", "make", "model_group", "model_detail", "vin", "sale_status", "location_state"}
MAP = {
    "id": "source_id", "item": "item_number", "sale_date_m_d_cy": "sale_date",
    "sale_time_hhmm": "sale_time", "has_keys_yes_or_no": "has_keys",
    "high_bid_non_vix_sealed_vix": "high_bid", "est_retail_value": "estimated_retail_value",
    "lot_cond_code": "lot_condition_code", "create_date_time": "create_datetime",
    "location_zip": "location_zip", "grid_row": "grid_row",
    "make_an_offer_eligible": "make_offer_eligible", "buy_it_now_price": "buy_it_now_price",
    "autograde": "autograde",
}
BOOLEAN = {"has_keys", "make_offer_eligible", "rentals", "wholesale"}
INTEGER = {"yard_number", "year", "lot_number", "cylinders"}
DECIMAL = {"odometer", "estimated_retail_value", "repair_cost", "high_bid", "buy_it_now_price"}
SEARCH_FIELDS = ("make", "model_group", "model_detail", "trim", "body_style", "vehicle_type", "color", "damage_description", "secondary_damage", "engine", "drive", "transmission", "fuel_type", "runs_drives", "sale_status", "location_city", "location_state", "yard_name", "seller_name", "special_note", "announcements", "vin", "lot_number")
MAX_UPSERT_ROWS = 500


@dataclass(frozen=True)
class UpsertCounts:
    inserted: int = 0
    updated: int = 0
    skipped: int = 0

    def __add__(self, other: "UpsertCounts") -> "UpsertCounts":
        return UpsertCounts(
            inserted=self.inserted + other.inserted,
            updated=self.updated + other.updated,
            skipped=self.skipped + other.skipped,
        )


def normalized_headers(headers: list[str]) -> dict[str, str]: return {normalize_header(h): h for h in headers}

def normalize_row(row: dict[str, str], filename: str, job_id: object) -> dict[str, Any]:
    source = {normalize_header(key): value for key, value in row.items()}
    values: dict[str, Any] = {MAP.get(key, key): clean_string(value) for key, value in source.items()}
    if not values.get("lot_number"): raise ValueError("missing lot number")
    for key in BOOLEAN: values[key] = parse_boolean(values.get(key))
    for key in INTEGER: values[key] = parse_integer(values.get(key))
    for key in DECIMAL: values[key] = parse_decimal(values.get(key))
    local, utc = build_sale_datetimes(source.get("sale_date_m_d_cy"), source.get("sale_time_hhmm"), source.get("time_zone"))
    values.update(sale_date=local.date() if local else None, sale_time=local.time() if local else None, sale_datetime_local=local, sale_datetime_utc=utc, create_datetime=parse_datetime(values.get("create_datetime")), last_updated_time=parse_datetime(values.get("last_updated_time")), image_url=extract_url(values.get("image_url")), image_thumbnail=extract_url(values.get("image_thumbnail")), source_file=filename, source_import_job_id=job_id, raw_data=row)
    values["search_text"] = " ".join(normalize_search_text(str(values[field])) for field in SEARCH_FIELDS if values.get(field))
    values["extra_data"] = {key: value for key, value in source.items() if MAP.get(key, key) not in Auction.__table__.columns}
    return {key: value for key, value in values.items() if key in Auction.__table__.columns}


def stream_csv(path: Path) -> Iterator[tuple[int, dict[str, str]]]:
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        yield from enumerate(csv.DictReader(handle), start=2)


def _deduplicate_rows(rows: list[dict[str, Any]]) -> tuple[list[dict[str, Any]], int]:
    newest_by_lot: dict[int, dict[str, Any]] = {}
    skipped = 0
    for row in rows:
        lot_number = row["lot_number"]
        existing = newest_by_lot.get(lot_number)
        if existing is None:
            newest_by_lot[lot_number] = row
        elif (row.get("last_updated_time") or datetime.min.replace(tzinfo=UTC)) >= (existing.get("last_updated_time") or datetime.min.replace(tzinfo=UTC)):
            newest_by_lot[lot_number] = row
            skipped += 1
        else:
            skipped += 1
    return list(newest_by_lot.values()), skipped


def upsert_batch(db: Session, rows: list[dict[str, Any]]) -> UpsertCounts:
    if not rows:
        return UpsertCounts()
    rows, duplicate_skips = _deduplicate_rows(rows)
    counts = UpsertCounts(skipped=duplicate_skips)
    for start in range(0, len(rows), MAX_UPSERT_ROWS):
        counts += _upsert_rows(db, rows[start : start + MAX_UPSERT_ROWS])
    return counts


def _upsert_rows(db: Session, rows: list[dict[str, Any]]) -> UpsertCounts:
    existing = dict(db.execute(select(Auction.lot_number, Auction.last_updated_time).where(Auction.lot_number.in_([row["lot_number"] for row in rows]))).all())
    insert_count = sum(row["lot_number"] not in existing for row in rows)
    update_count = sum(
        row["lot_number"] in existing and (existing[row["lot_number"]] is None or row.get("last_updated_time") is not None and row["last_updated_time"] > existing[row["lot_number"]])
        for row in rows
    )
    statement = insert(Auction).values(rows)
    excluded = statement.excluded
    updates = {column.name: getattr(excluded, column.name) for column in Auction.__table__.columns if column.name not in {"id", "lot_number", "created_at"}}
    db.execute(statement.on_conflict_do_update(index_elements=[Auction.lot_number], set_=updates, where=(Auction.last_updated_time.is_(None) | (excluded.last_updated_time > Auction.last_updated_time))))
    return UpsertCounts(inserted=insert_count, updated=update_count, skipped=len(rows) - insert_count - update_count)
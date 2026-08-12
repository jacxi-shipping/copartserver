from datetime import date, datetime, time
from decimal import Decimal
from typing import Any, Optional

from sqlalchemy import (
    BIGINT,
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    Time,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base


class Auction(Base):
    __tablename__ = "auctions"
    __table_args__ = (
        UniqueConstraint("lot_number", name="uq_auctions_lot_number"),
        Index("ix_auctions_search_text_trgm", "search_text", postgresql_using="gin", postgresql_ops={"search_text": "gin_trgm_ops"}),
        Index("ix_auctions_vin_lower", func.lower("vin")),
    )

    id: Mapped[int] = mapped_column(BIGINT, primary_key=True, autoincrement=True)
    source_id: Mapped[Optional[str]] = mapped_column(String(100))
    yard_number: Mapped[Optional[int]] = mapped_column(Integer, index=True)
    yard_name: Mapped[Optional[str]] = mapped_column(String(255), index=True)
    sale_date: Mapped[Optional[date]] = mapped_column(Date, index=True)
    day_of_week: Mapped[Optional[str]] = mapped_column(String(20))
    sale_time: Mapped[Optional[time]] = mapped_column(Time)
    time_zone: Mapped[Optional[str]] = mapped_column(String(64))
    item_number: Mapped[Optional[str]] = mapped_column(String(100))
    lot_number: Mapped[int] = mapped_column(BIGINT, nullable=False, index=True)
    vehicle_type: Mapped[Optional[str]] = mapped_column(String(100), index=True)
    year: Mapped[Optional[int]] = mapped_column(Integer, index=True)
    make: Mapped[Optional[str]] = mapped_column(String(100), index=True)
    model_group: Mapped[Optional[str]] = mapped_column(String(150), index=True)
    model_detail: Mapped[Optional[str]] = mapped_column(String(255), index=True)
    body_style: Mapped[Optional[str]] = mapped_column(String(100))
    color: Mapped[Optional[str]] = mapped_column(String(100))
    damage_description: Mapped[Optional[str]] = mapped_column(String(255))
    secondary_damage: Mapped[Optional[str]] = mapped_column(String(255))
    sale_title_state: Mapped[Optional[str]] = mapped_column(String(20))
    sale_title_type: Mapped[Optional[str]] = mapped_column(String(100))
    has_keys: Mapped[Optional[bool]] = mapped_column(Boolean)
    lot_condition_code: Mapped[Optional[str]] = mapped_column(String(100))
    vin: Mapped[Optional[str]] = mapped_column(String(17), index=True)
    odometer: Mapped[Optional[Decimal]] = mapped_column(Numeric)
    odometer_brand: Mapped[Optional[str]] = mapped_column(String(100))
    estimated_retail_value: Mapped[Optional[Decimal]] = mapped_column(Numeric(14, 2))
    repair_cost: Mapped[Optional[Decimal]] = mapped_column(Numeric(14, 2))
    engine: Mapped[Optional[str]] = mapped_column(String(100))
    drive: Mapped[Optional[str]] = mapped_column(String(100))
    transmission: Mapped[Optional[str]] = mapped_column(String(100))
    fuel_type: Mapped[Optional[str]] = mapped_column(String(100))
    cylinders: Mapped[Optional[int]] = mapped_column(Integer)
    runs_drives: Mapped[Optional[str]] = mapped_column(String(255))
    sale_status: Mapped[Optional[str]] = mapped_column(String(100), index=True)
    high_bid: Mapped[Optional[Decimal]] = mapped_column(Numeric(14, 2))
    special_note: Mapped[Optional[str]] = mapped_column(Text)
    location_city: Mapped[Optional[str]] = mapped_column(String(100), index=True)
    location_state: Mapped[Optional[str]] = mapped_column(String(20), index=True)
    location_zip: Mapped[Optional[str]] = mapped_column(String(20))
    location_country: Mapped[Optional[str]] = mapped_column(String(100))
    currency_code: Mapped[Optional[str]] = mapped_column(String(10))
    image_thumbnail: Mapped[Optional[str]] = mapped_column(Text)
    create_datetime: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    grid_row: Mapped[Optional[str]] = mapped_column(String(100))
    make_offer_eligible: Mapped[Optional[bool]] = mapped_column(Boolean)
    buy_it_now_price: Mapped[Optional[Decimal]] = mapped_column(Numeric(14, 2))
    image_url: Mapped[Optional[str]] = mapped_column(Text)
    trim: Mapped[Optional[str]] = mapped_column(String(150))
    last_updated_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), index=True)
    rentals: Mapped[Optional[bool]] = mapped_column(Boolean)
    wholesale: Mapped[Optional[bool]] = mapped_column(Boolean)
    seller_name: Mapped[Optional[str]] = mapped_column(String(255))
    offsite_address1: Mapped[Optional[str]] = mapped_column(String(255))
    offsite_state: Mapped[Optional[str]] = mapped_column(String(20))
    offsite_city: Mapped[Optional[str]] = mapped_column(String(100))
    offsite_zip: Mapped[Optional[str]] = mapped_column(String(20))
    sale_light: Mapped[Optional[str]] = mapped_column(String(100))
    autograde: Mapped[Optional[str]] = mapped_column(String(100))
    announcements: Mapped[Optional[str]] = mapped_column(Text)
    sale_datetime_local: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    sale_datetime_utc: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), index=True)
    search_text: Mapped[str] = mapped_column(Text, nullable=False, default="")
    source_file: Mapped[Optional[str]] = mapped_column(String(512))
    source_import_job_id: Mapped[Optional[object]] = mapped_column(UUID(as_uuid=True), ForeignKey("import_jobs.id"))
    raw_data: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    extra_data: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
from datetime import date
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class SearchRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="forbid")

    query: str | None = Field(default=None, alias="q")
    lot_number: int | None = None
    vin: str | None = None
    make: str | None = None
    model_group: str | None = None
    model_detail: str | None = None
    trim: str | None = None
    year: int | None = None
    year_min: int | None = None
    year_max: int | None = None
    vehicle_type: str | None = None
    body_style: str | None = None
    color: str | None = None
    damage: str | None = None
    secondary_damage: str | None = None
    sale_title_state: str | None = None
    sale_title_type: str | None = None
    has_keys: bool | None = None
    lot_condition_code: str | None = None
    odometer_min: Decimal | None = None
    odometer_max: Decimal | None = None
    estimated_retail_value_min: Decimal | None = None
    estimated_retail_value_max: Decimal | None = None
    repair_cost_min: Decimal | None = None
    repair_cost_max: Decimal | None = None
    engine: str | None = None
    drive: str | None = None
    transmission: str | None = None
    fuel_type: str | None = None
    cylinders: int | None = None
    runs_drives: str | None = None
    sale_status: str | None = None
    location_city: str | None = None
    location_state: str | None = None
    location_zip: str | None = None
    states: list[str] = Field(default_factory=list)
    yard_number: int | None = None
    yard_name: str | None = None
    seller_name: str | None = None
    sale_light: str | None = None
    autograde: str | None = None
    make_offer_eligible: bool | None = None
    buy_it_now_min: Decimal | None = None
    buy_it_now_max: Decimal | None = None
    sale_date_from: date | None = None
    sale_date_to: date | None = None
    today: bool = False
    upcoming_only: bool = True
    include_past: bool = False
    include_unscheduled: bool = False
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=50, ge=1, le=500)
    sort: str = "sale_datetime_asc"
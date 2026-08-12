from datetime import UTC, datetime
from zoneinfo import ZoneInfo

from app.services.normalization import parse_sale_date, parse_sale_time

TIMEZONE_MAP = {
    "PST": "America/Los_Angeles", "PDT": "America/Los_Angeles",
    "MST": "America/Denver", "MDT": "America/Denver",
    "CST": "America/Chicago", "CDT": "America/Chicago",
    "EST": "America/New_York", "EDT": "America/New_York",
}


def build_sale_datetimes(sale_date_value: object, sale_time_value: object, timezone_value: object) -> tuple[datetime | None, datetime | None]:
    sale_date = parse_sale_date(sale_date_value)
    sale_time = parse_sale_time(sale_time_value)
    if sale_date is None or sale_time is None:
        return None, None
    zone_name = TIMEZONE_MAP.get(str(timezone_value).strip().upper())
    if zone_name is None:
        raise ValueError(f"invalid timezone: {timezone_value}")
    local_datetime = datetime.combine(sale_date, sale_time, tzinfo=ZoneInfo(zone_name))
    return local_datetime, local_datetime.astimezone(UTC)
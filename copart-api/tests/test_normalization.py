from datetime import UTC, datetime

import pytest

from app.services.datetime_service import build_sale_datetimes
from app.services.normalization import (
    extract_url,
    normalize_search_text,
    parse_datetime,
    parse_boolean,
    parse_sale_date,
    parse_sale_time,
)


def test_unscheduled_date_is_null() -> None:
    assert parse_sale_date("0") is None
    assert build_sale_datetimes("0", "1200", "PDT") == (None, None)


@pytest.mark.parametrize("raw, expected", [("1200", "12:00"), ("930", "09:30"), ("0930", "09:30")])
def test_sale_time_parsing(raw: str, expected: str) -> None:
    assert parse_sale_time(raw).strftime("%H:%M") == expected  # type: ignore[union-attr]


def test_timezone_conversion() -> None:
    local, utc = build_sale_datetimes("20260814", "1200", "PDT")
    assert local == datetime(2026, 8, 14, 12, tzinfo=local.tzinfo)  # type: ignore[union-attr]
    assert utc == datetime(2026, 8, 14, 19, tzinfo=UTC)


@pytest.mark.parametrize("raw, expected", [("YES", True), ("n", False), ("", None)])
def test_boolean_normalization(raw: str, expected: bool | None) -> None:
    assert parse_boolean(raw) is expected


@pytest.mark.parametrize("raw", ["4runner", "4 runner", "4-runner", "4_runner"])
def test_search_normalization_equates_model_variants(raw: str) -> None:
    assert normalize_search_text(raw) == "4runner"


def test_copart_thumbnail_without_a_scheme_is_normalized_to_https() -> None:
    assert extract_url("cs.copart.com/v1/images/thumbnail.jpg") == "https://cs.copart.com/v1/images/thumbnail.jpg"


def test_copart_create_datetime_format_is_parsed() -> None:
    assert parse_datetime("2026-08-07-04.40.15.000347") == datetime(2026, 8, 7, 4, 40, 15, 347, tzinfo=UTC)
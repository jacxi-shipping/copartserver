from datetime import UTC, datetime
from decimal import Decimal

from app.services.csv_importer import normalize_row


def test_normalize_row_maps_copart_header_variants_to_typed_fields() -> None:
    row = {
        "Lot number": "48301246", "Sale Date M/D/CY": "20260814", "Sale time (HHMM)": "1200",
        "Time Zone": "PDT", "Year": "2022", "Make": "TOYOTA", "Model Group": "4RUNNER",
        "Model Detail": "4RUNNER", "VIN": "JT123456789012345", "Sale Status": "Pure Sale",
        "Location state": "CA", "Est. Retail Value": "$12,345.67", "Lot Cond. Code": "A",
        "Create Date/Time": "20260801 0930", "Last Updated Time": "2026-08-02T10:15:00Z",
    }

    result = normalize_row(row, "salesdata.csv", "00000000-0000-0000-0000-000000000000")

    assert result["estimated_retail_value"] == Decimal("12345.67")
    assert result["lot_condition_code"] == "A"
    assert result["create_datetime"] == datetime(2026, 8, 1, 9, 30, tzinfo=UTC)
    assert result["last_updated_time"] == datetime(2026, 8, 2, 10, 15, tzinfo=UTC)
    assert result["extra_data"] == {}
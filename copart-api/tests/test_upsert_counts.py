from datetime import UTC, datetime

from app.services.csv_importer import MAX_UPSERT_ROWS, _deduplicate_rows


def test_batch_duplicate_lots_keep_the_newest_record() -> None:
    older = {"lot_number": 48301246, "last_updated_time": datetime(2026, 8, 1, tzinfo=UTC)}
    newer = {"lot_number": 48301246, "last_updated_time": datetime(2026, 8, 2, tzinfo=UTC)}

    rows, skipped = _deduplicate_rows([older, newer])

    assert rows == [newer]
    assert skipped == 1


def test_upsert_statement_size_stays_below_postgresql_parameter_limit() -> None:
    assert MAX_UPSERT_ROWS * 66 < 65535
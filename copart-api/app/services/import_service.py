from datetime import UTC, datetime
from pathlib import Path

from sqlalchemy.orm import Session

from app.config import get_settings
from app.models.import_job import ImportJob
from app.services.csv_importer import REQUIRED, normalized_headers, normalize_row, stream_csv, upsert_batch


def preview_csv(path: Path) -> dict:
    iterator = stream_csv(path)
    rows = []
    for _, row in iterator:
        rows.append(row)
        if len(rows) == 10: break
    headers = normalized_headers(list(rows[0]) if rows else [])
    return {"detected_columns": list(headers), "missing_columns": sorted(REQUIRED - set(headers)), "unknown_columns": [], "sample_rows": rows, "estimated_row_count": sum(1 for _ in stream_csv(path)), "validation_errors": []}


def run_import(db: Session, job: ImportJob, path: Path) -> None:
    job.status, job.started_at = "processing", datetime.now(UTC); db.commit()
    batch, settings = [], get_settings()
    try:
        for row_number, row in stream_csv(path):
            job.total_rows += 1
            try: batch.append(normalize_row(row, job.filename, job.id))
            except ValueError: job.failed_rows += 1; continue
            if len(batch) >= settings.import_batch_size:
                counts = upsert_batch(db, batch); job.processed_rows += len(batch); job.inserted_rows += counts.inserted; job.updated_rows += counts.updated; job.skipped_rows += counts.skipped; batch.clear(); db.commit()
        if batch:
            counts = upsert_batch(db, batch); job.processed_rows += len(batch); job.inserted_rows += counts.inserted; job.updated_rows += counts.updated; job.skipped_rows += counts.skipped
        job.status = "completed"; job.completed_at = datetime.now(UTC); db.commit()
    except Exception as exc:
        db.rollback(); job.status = "failed"; job.error_message = str(exc)[:2000]; job.completed_at = datetime.now(UTC); db.commit()
    finally: path.unlink(missing_ok=True)
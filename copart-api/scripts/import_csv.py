import argparse
from pathlib import Path
from app.database.session import SessionLocal
from app.models.import_job import ImportJob
from app.services.import_service import run_import

parser = argparse.ArgumentParser(); parser.add_argument("csv_file", type=Path)
args = parser.parse_args()
with SessionLocal() as db:
    job = ImportJob(filename=args.csv_file.name, file_size=args.csv_file.stat().st_size); db.add(job); db.commit()
    run_import(db, job, args.csv_file)
    print(f"Import completed\nRows processed: {job.processed_rows}\nInserted: {job.inserted_rows}\nFailed: {job.failed_rows}")
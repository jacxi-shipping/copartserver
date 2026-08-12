import shutil
import tempfile
from pathlib import Path
from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, Query, UploadFile
from fastapi.encoders import jsonable_encoder
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from app.api.dependencies import require_api_key
from app.database.session import SessionLocal, get_db
from app.models.import_job import ImportJob
from app.services.import_service import preview_csv, run_import

router = APIRouter(prefix="/api/v1/import", tags=["imports"], dependencies=[Depends(require_api_key)])


@router.get("")
def list_jobs(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=500),
    db: Session = Depends(get_db),
) -> dict:
    total = db.scalar(select(func.count()).select_from(ImportJob)) or 0
    jobs = db.scalars(
        select(ImportJob)
        .order_by(ImportJob.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()
    return {
        "success": True,
        "pagination": {
            "page": page,
            "page_size": page_size,
            "total": total,
            "total_pages": (total + page_size - 1) // page_size,
        },
        "data": jsonable_encoder(jobs),
    }

@router.post("")
def upload(background_tasks: BackgroundTasks, file: UploadFile = File(...), db: Session = Depends(get_db)) -> dict:
    if not file.filename or not file.filename.lower().endswith(".csv"): raise HTTPException(400, detail={"code": "INVALID_CSV", "message": "A CSV file is required"})
    temporary = Path(tempfile.mkstemp(suffix=".csv")[1])
    with temporary.open("wb") as output: shutil.copyfileobj(file.file, output)
    job = ImportJob(filename=file.filename, file_size=temporary.stat().st_size); db.add(job); db.commit(); db.refresh(job)
    def task() -> None:
        with SessionLocal() as session: run_import(session, session.get(ImportJob, job.id), temporary)
    background_tasks.add_task(task)
    return {"success": True, "job_id": str(job.id), "status": "processing"}

@router.post("/preview")
def preview(file: UploadFile = File(...)) -> dict:
    temporary = Path(tempfile.mkstemp(suffix=".csv")[1])
    try:
        with temporary.open("wb") as output: shutil.copyfileobj(file.file, output)
        return {"success": True, "data": preview_csv(temporary)}
    finally: temporary.unlink(missing_ok=True)

@router.get("/{job_id}")
def job_status(job_id: str, db: Session = Depends(get_db)) -> dict:
    job = db.get(ImportJob, job_id)
    if not job: raise HTTPException(404, detail={"code": "IMPORT_NOT_FOUND", "message": "Import job was not found"})
    return {"success": True, "data": {field: getattr(job, field) for field in ("id", "status", "total_rows", "processed_rows", "inserted_rows", "updated_rows", "skipped_rows", "failed_rows", "error_message")}}
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from app.api.health import router as health_router
from app.api.auctions import router as auctions_router
from app.api.imports import router as imports_router
from app.api.search import router as search_router
from app.api.stats import router as stats_router
from app.config import get_settings
from app.logging import RequestLoggingMiddleware, configure_logging

settings = get_settings()


@asynccontextmanager
async def lifespan(_: FastAPI):
    configure_logging(settings.log_level)
    yield


app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    description="PostgreSQL-native Copart auction data API.",
    lifespan=lifespan,
)
app.add_middleware(RequestLoggingMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "X-API-Key", "X-Request-ID"],
)
app.include_router(health_router)
app.include_router(auctions_router)
app.include_router(imports_router)
app.include_router(search_router)
app.include_router(stats_router)

@app.exception_handler(Exception)
async def unhandled_error(_: Request, __: Exception) -> JSONResponse:
    return JSONResponse(status_code=500, content={"success": False, "error": {"code": "INTERNAL_ERROR", "message": "An unexpected error occurred"}})
from functools import lru_cache
from typing import Literal

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "Copart Auction API"
    environment: Literal["development", "test", "production"] = "development"
    database_url: str = "postgresql+psycopg://copart:copart@localhost:5432/copart"
    api_auth_enabled: bool = False
    api_key: str = "change-me"
    cors_origins: list[str] = Field(default_factory=lambda: ["http://localhost:3000"])
    import_batch_size: int = Field(default=5000, ge=1, le=50000)
    max_page_size: int = Field(default=500, ge=1, le=1000)
    log_level: str = "INFO"
    db_pool_size: int = Field(default=10, ge=1)
    db_max_overflow: int = Field(default=20, ge=0)

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, value: object) -> list[str]:
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value  # type: ignore[return-value]


@lru_cache
def get_settings() -> Settings:
    return Settings()
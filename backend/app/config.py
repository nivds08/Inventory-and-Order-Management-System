from functools import lru_cache

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    database_url: str = "postgresql://postgres:postgres@localhost:5432/inventory_db"
    cors_origins: str = "http://localhost:5173"
    environment: str = "development"
    port: int = 8000

    # Railway may expose a private URL under this name when linking Postgres
    database_private_url: str | None = None

    @field_validator("database_url", mode="before")
    @classmethod
    def normalize_database_url(cls, value: str | None) -> str | None:
        if isinstance(value, str) and value.startswith("postgres://"):
            return value.replace("postgres://", "postgresql://", 1)
        return value

    @property
    def resolved_database_url(self) -> str:
        if self.database_private_url and (
            self.database_url == "postgresql://postgres:postgres@localhost:5432/inventory_db"
            or "localhost" in self.database_url
        ):
            url = self.database_private_url
            if url.startswith("postgres://"):
                return url.replace("postgres://", "postgresql://", 1)
            return url
        return self.database_url

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

@lru_cache
def get_settings() -> Settings:
    return Settings()

from collections.abc import Generator

import logging
import time
from urllib.parse import urlparse

from sqlalchemy import create_engine, text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


def _engine_connect_args(database_url: str) -> dict:
    if "sslmode=" in database_url:
        return {}
    # Railway public proxy URLs require SSL; private .railway.internal URLs do not
    if "rlwy.net" in database_url:
        return {"sslmode": "require"}
    return {}


def _validate_database_url(url: str) -> None:
    if "${{" in url or "}}" in url:
        raise RuntimeError(
            "DATABASE_URL contains unresolved Railway template syntax (e.g. ${{...}}). "
            "Use Add Reference on the backend service to link Postgres DATABASE_URL directly."
        )
    parsed = urlparse(url)
    if not parsed.hostname:
        raise RuntimeError("DATABASE_URL is missing a hostname. Check your Railway variable reference.")


engine = create_engine(
    settings.resolved_database_url,
    pool_pre_ping=True,
    connect_args=_engine_connect_args(settings.resolved_database_url),
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def init_db(max_retries: int = 10, retry_delay: float = 3.0) -> None:
    from app import models  # noqa: F401

    _validate_database_url(settings.resolved_database_url)
    logger.info("Connecting to database at %s", settings.database_host_label)

    last_error: Exception | None = None
    for attempt in range(1, max_retries + 1):
        try:
            with engine.connect() as connection:
                connection.execute(text("SELECT 1"))
            Base.metadata.create_all(bind=engine)
            logger.info("Database connection established and tables ready")
            return
        except Exception as exc:
            last_error = exc
            logger.warning(
                "Database not ready (attempt %s/%s): %s: %s",
                attempt,
                max_retries,
                type(exc).__name__,
                exc,
            )
            if attempt < max_retries:
                time.sleep(retry_delay)

    raise RuntimeError(
        f"Could not connect to PostgreSQL at {settings.database_host_label} "
        f"after {max_retries} attempts. Last error: {type(last_error).__name__}: {last_error}"
    ) from last_error

from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import get_settings


class Base(DeclarativeBase):
    pass


_settings = get_settings()
engine = create_engine(_settings.database_url, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    """Create tables if they don't exist yet.

    Good enough for a single-clinic pilot. If the schema needs to evolve
    after real data exists, switch this to Alembic migrations (the
    dependency is already in requirements.txt).
    """
    from app import db_models  # noqa: F401  (ensure models are registered)

    Base.metadata.create_all(bind=engine)

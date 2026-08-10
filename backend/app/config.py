from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime configuration, sourced from environment variables / .env.

    See .env.example at the repo root for the full list of variables and
    their defaults.
    """

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # -- Model --
    model_path: str = "models/pneumonia_model.keras"
    image_size: int = 150
    # Threshold tuned to maximize pneumonia recall (0.91 recall / 0.92
    # precision at 0.8) rather than the default 0.5 — see docs/intended-use.md.
    classification_threshold: float = 0.8

    # -- Database --
    database_url: str = "postgresql+psycopg://pneumonia:pneumonia@localhost:5432/pneumonia"

    # -- Uploads --
    upload_dir: str = "uploads"
    max_upload_size_bytes: int = 10 * 1024 * 1024  # 10 MB

    # -- CORS --
    cors_origins: list[str] = ["http://localhost:5173"]


@lru_cache
def get_settings() -> Settings:
    return Settings()

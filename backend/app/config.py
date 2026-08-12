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
    # Threshold is a property of THIS trained model, not a fixed constant.
    # pneumonia_model_combined_v2 was retrained on a combined corpus (original
    # Guangzhou dataset + Nigerian dataset, trained together) and its sigmoid
    # output is calibrated differently than the earlier single-dataset model,
    # which used 0.8. If the model is retrained again, this value must be
    # re-derived against the new model's precision/recall curve, not copied
    # forward — see docs/intended-use.md.
    classification_threshold: float = 0.2

    # -- Database --
    database_url: str = "postgresql+psycopg://pneumonia:pneumonia@localhost:5432/pneumonia"

    # -- Uploads --
    upload_dir: str = "uploads"
    max_upload_size_bytes: int = 10 * 1024 * 1024  # 10 MB

    # -- CORS --
    cors_origins: list[str] = ["http://localhost:5173"]

    # -- Admin --
    # Gates the /admin/* API and the frontend admin dashboard. This is a
    # single shared password, not a per-user account system — clinicians
    # are still identified by the free-text name they enter on confirm.
    # CHANGE BOTH in any non-local deployment.
    admin_password: str = "changeme"
    secret_key: str = "dev-secret-change-me"


@lru_cache
def get_settings() -> Settings:
    return Settings()

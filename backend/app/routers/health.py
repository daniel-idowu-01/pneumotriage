from fastapi import APIRouter

from app import inference
from app.schemas import HealthResponse

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    try:
        inference.get_inference_model()
        model_loaded = True
    except RuntimeError:
        model_loaded = False

    return HealthResponse(status="ok" if model_loaded else "degraded", model_loaded=model_loaded)

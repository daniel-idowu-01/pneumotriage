import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import inference
from app.config import get_settings
from app.db import init_db
from app.routers import admin, health, history, predict

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    inference.load_inference_model()
    init_db()
    yield


app = FastAPI(
    title="Pneumonia Screening Decision-Support API",
    description=(
        "Decision-support inference service for pediatric chest X-ray "
        "screening. Every prediction requires clinician review and "
        "confirmation before it is considered final — see /docs/intended-use.md."
    ),
    version="0.1.0",
    lifespan=lifespan,
)

settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, tags=["health"])
app.include_router(predict.router, tags=["prediction"])
app.include_router(history.router, tags=["history"])
app.include_router(admin.router)

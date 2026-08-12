"""Model loading and preprocessing.

Preprocessing intentionally mirrors the training notebook exactly
(cv2.imread(..., IMREAD_GRAYSCALE) -> cv2.resize -> /255.0 -> reshape),
so that inference-time inputs match what the model was trained on. Do not
"improve" this (e.g. swap in PIL resizing) without retraining, since a
different resize/decoding path can silently shift the model's score
distribution — the configured classification_threshold was tuned against
this exact pipeline for the current model file specifically (see
docs/intended-use.md).
"""

import logging

import cv2
import numpy as np
from keras.layers import Layer
from keras.models import Sequential, load_model

from app.config import get_settings

logger = logging.getLogger(__name__)

_model: Sequential | None = None


class InvalidImageError(ValueError):
    """Raised when an uploaded file cannot be decoded as an image."""


def _patch_keras_quantization_config_compat() -> None:
    """Allow loading models saved with a newer Keras than is pip-installable.

    Originally added for the earlier single-dataset model (which, like the
    current combined-trained model, was distributed as
    `pneumonia_model.keras` — same filename, different weights), saved
    from a Keras build (Colab) that adds a `quantization_config` field to
    every layer's serialized config. The latest Keras on PyPI at the time
    of writing (3.12.4) doesn't recognize that field yet and raises on
    load. The model itself wasn't quantized (the field was always None),
    so it was safe to drop the kwarg rather than reject the load. This
    patch is a no-op for model files that don't have the field, so it's
    left in place for the current model file unverified — confirm whether
    it was saved from the same Keras build before assuming this is still
    needed. Remove this patch once PyPI's `keras` package round-trips
    `quantization_config` on its own.
    """
    original_init = Layer.__init__
    if getattr(original_init, "_quantization_config_patched", False):
        return

    def patched_init(self, *args, **kwargs):
        kwargs.pop("quantization_config", None)
        original_init(self, *args, **kwargs)

    patched_init._quantization_config_patched = True
    Layer.__init__ = patched_init


def load_inference_model() -> Sequential:
    global _model
    settings = get_settings()
    _patch_keras_quantization_config_compat()
    logger.info("Loading model from %s", settings.model_path)
    _model = load_model(settings.model_path)
    # Warm up the graph so the first real request isn't the slow one.
    dummy = np.zeros((1, settings.image_size, settings.image_size, 1), dtype=np.float32)
    _model.predict(dummy, verbose=0)
    logger.info("Model loaded and warmed up")
    return _model


def get_inference_model() -> Sequential:
    if _model is None:
        raise RuntimeError("Model is not loaded yet")
    return _model


def preprocess_image_bytes(raw_bytes: bytes) -> np.ndarray:
    """Decode raw upload bytes into a (1, size, size, 1) float32 array in [0, 1].

    Raises InvalidImageError if the bytes cannot be decoded as an image.
    """
    settings = get_settings()

    buffer = np.frombuffer(raw_bytes, dtype=np.uint8)
    if buffer.size == 0:
        raise InvalidImageError("Uploaded file is empty")

    img_arr = cv2.imdecode(buffer, cv2.IMREAD_GRAYSCALE)
    if img_arr is None:
        raise InvalidImageError("File could not be decoded as an image")

    resized = cv2.resize(img_arr, (settings.image_size, settings.image_size))
    normalized = resized.astype(np.float32) / 255.0
    return normalized.reshape(1, settings.image_size, settings.image_size, 1)


def predict(raw_bytes: bytes) -> dict:
    """Run inference and apply the configured decision threshold.

    Model output is P(Normal): low scores mean Pneumonia, high scores mean
    Normal. The threshold is deliberately NOT 0.5 — see docs/intended-use.md.

    The threshold itself (settings.classification_threshold, currently 0.2)
    is a calibration property of pneumonia_model_combined_v2 specifically,
    not a universal constant. That model was trained on a combined corpus
    (original Guangzhou dataset + Nigerian dataset, trained together rather
    than fine-tuned sequentially), which shifted its score distribution
    relative to the earlier single-dataset model (which used 0.8). If the
    model is retrained — on new data, a new architecture, or even the same
    data reshuffled — this threshold must be re-derived from that model's
    own precision/recall curve, not carried forward.
    """
    settings = get_settings()
    model = get_inference_model()

    x = preprocess_image_bytes(raw_bytes)
    raw_score = float(model.predict(x, verbose=0)[0][0])

    is_normal = raw_score >= settings.classification_threshold
    prediction = "Normal" if is_normal else "Pneumonia"
    # Confidence is expressed relative to the predicted class, not raw P(Normal).
    confidence = raw_score if is_normal else 1.0 - raw_score

    return {
        "prediction": prediction,
        "confidence": confidence,
        "threshold_used": settings.classification_threshold,
        "raw_score": raw_score,
    }

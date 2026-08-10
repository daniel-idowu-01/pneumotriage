import os
import sys

import cv2
import numpy as np
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app import inference  # noqa: E402
from app.config import get_settings  # noqa: E402

MODEL_PATH = get_settings().model_path
MODEL_AVAILABLE = os.path.exists(MODEL_PATH)


def _encode_png(img: np.ndarray) -> bytes:
    ok, buf = cv2.imencode(".png", img)
    assert ok
    return buf.tobytes()


def test_preprocess_image_bytes_shape_and_range():
    img = (np.random.rand(400, 300) * 255).astype("uint8")
    x = inference.preprocess_image_bytes(_encode_png(img))

    assert x.shape == (1, 150, 150, 1)
    assert x.dtype == np.float32
    assert x.min() >= 0.0
    assert x.max() <= 1.0


def test_preprocess_image_bytes_rejects_garbage():
    with pytest.raises(inference.InvalidImageError):
        inference.preprocess_image_bytes(b"this is not an image")


def test_preprocess_image_bytes_rejects_empty():
    with pytest.raises(inference.InvalidImageError):
        inference.preprocess_image_bytes(b"")


@pytest.mark.skipif(not MODEL_AVAILABLE, reason="pneumonia_model.keras not present")
def test_predict_applies_threshold_not_default_half():
    inference.load_inference_model()
    img = (np.random.rand(400, 400) * 255).astype("uint8")
    result = inference.predict(_encode_png(img))

    settings = get_settings()
    assert result["threshold_used"] == settings.classification_threshold
    assert result["prediction"] in ("Pneumonia", "Normal")
    is_normal = result["raw_score"] >= settings.classification_threshold
    assert result["prediction"] == ("Normal" if is_normal else "Pneumonia")

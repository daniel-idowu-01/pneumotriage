# Model weights

This directory is where the backend expects to find `pneumonia_model.keras`
at startup (configurable via `MODEL_PATH` in `.env`).

The trained weights are **not** committed to this repository (see
`.gitignore` — binary model weights don't belong in git history; distribute
them as a release artifact, object storage download, or Git LFS pointer
instead). Place your own `pneumonia_model.keras` here before starting the
backend.

Model contract the backend assumes:

- Input: grayscale, shape `(150, 150, 1)`, pixel values normalized to `[0, 1]`
- Output: single sigmoid unit representing P(Normal)

See [docs/intended-use.md](../../docs/intended-use.md) for why the
classification threshold applied to that output is 0.8, not the default 0.5.

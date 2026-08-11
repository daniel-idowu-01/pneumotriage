# Pneumonia Screening — Decision Support

An open-source clinical decision-support tool that screens pediatric chest
X-rays for radiographic signs consistent with pneumonia, built for
hospitals and clinics in Nigeria and across Africa where radiologist
availability is limited and fast triage matters.

**This tool does not diagnose patients.** It produces a screening
suggestion that a clinician must review and confirm before it counts as a
final result. See [docs/intended-use.md](docs/intended-use.md) for the
full reasoning behind the threshold choice and the human-in-the-loop
requirement — read it before deploying this anywhere near real patients.

## How it works

1. A clinician uploads a chest X-ray (JPEG/PNG) through the web UI.
2. The FastAPI backend preprocesses the image (grayscale, resize to
   150x150, normalize) and runs it through a trained CNN.
3. The model outputs P(Normal). Because missing a true pneumonia case in
   triage is far more costly than a false alarm, the decision threshold
   is set to **0.8** instead of the default 0.5 (0.91 pneumonia recall /
   0.92 pneumonia precision at that threshold) — anything the model isn't
   confidently "Normal" about is flagged as Pneumonia for review.
4. The result — with a persistent "decision support only" notice — is
   shown to the clinician, who must explicitly confirm or override it.
   Only that clinician decision is treated as final.
5. Every prediction and its eventual clinician disposition are recorded
   in an audit log, viewable and filterable in the History view.
6. An `/admin` dashboard (password-gated — see below) aggregates that log
   into usage stats: request volume over time, pneumonia rate, clinician
   override rate, and per-clinician activity. Clinicians are still
   identified by the free-text name they enter on confirm, not a login
   account — see [docs/intended-use.md](docs/intended-use.md).

## Known limitations

- **Training data provenance.** The model was trained on the public
  [Chest X-Ray Images (Pneumonia)](https://www.kaggle.com/datasets/paultimothymooney/chest-xray-pneumonia)
  dataset (pediatric patients, Guangzhou, China) — **not** on X-rays from
  Nigerian or broader African clinical populations. Do not assume the
  reported precision/recall transfers to a different population without
  local validation.
- Binary output only (Pneumonia vs. Normal) — no localization, severity
  grading, or detection of other pathology.
- No prospective clinical validation trial has been run.

See [docs/intended-use.md](docs/intended-use.md) for the full list.

## Project structure

```
backend/    FastAPI inference service + PostgreSQL audit log
frontend/   React + TypeScript + Tailwind + shadcn/ui dashboard
docs/       Intended use, threshold rationale, human-in-the-loop policy
```

## Setup

### Prerequisites

- Python 3.10+
- Node.js 20+
- Docker (for local PostgreSQL) or an existing PostgreSQL instance
- The trained model file, `pneumonia_model.keras` (not included in this
  repo — see [backend/models/README.md](backend/models/README.md))

### 1. Environment variables

```bash
cp .env.example .env
```

Edit `.env` if you need non-default values. Never commit `.env`. In
particular, change `ADMIN_PASSWORD` and `SECRET_KEY` before deploying
anywhere beyond your own machine — they gate the `/admin` dashboard.

### 2. Model file

Place your trained model at `backend/models/pneumonia_model.keras`. The
model must accept grayscale `(150, 150, 1)` input and output a single
sigmoid value representing P(Normal) — see
[docs/intended-use.md](docs/intended-use.md) for why the classification
threshold is 0.8, not 0.5.

### 3. Database

```bash
docker compose up -d db
```

### 4. Backend

```bash
cd backend
python -m venv .venv
.venv/Scripts/activate   # Windows; use `source .venv/bin/activate` on macOS/Linux
pip install -r requirements.txt
uvicorn app.main:app --reload
```

The API is now at `http://localhost:8000` (`/docs` for interactive
OpenAPI docs, `/health` for a liveness check).

### 5. Frontend

```bash
cd frontend
npm install
npm run dev
```

The app is now at `http://localhost:5173`.

### Running everything with Docker

```bash
docker compose up -d db backend
cd frontend && npm run dev
```

(The frontend is intentionally not containerized in v1 — pilot deployments
run it as a static build behind whatever the clinic already uses to serve
web assets.)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

Apache License 2.0 — see [LICENSE](LICENSE).

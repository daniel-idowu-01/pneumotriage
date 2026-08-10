# Contributing

Thanks for considering a contribution. This is a clinical decision-support
tool, so a couple of rules apply beyond the usual open-source hygiene:

## The human-in-the-loop invariant is non-negotiable

Read [docs/intended-use.md](docs/intended-use.md) before touching the
prediction flow. Any PR that makes a model prediction presentable or
storable as a "final" result without an explicit clinician confirmation
step will be rejected, no matter how it's framed (a new endpoint, a
"quick mode", a batch import, etc).

## Changing the classification threshold or model

If your change affects the classification threshold, the model file, or
the preprocessing pipeline, update
[docs/intended-use.md](docs/intended-use.md) in the same PR with the new
precision/recall numbers and your reasoning. Silent threshold or model
changes are not acceptable for a tool used in clinical triage.

## Development setup

See the [README](README.md#setup) for getting the backend, frontend, and
database running locally.

## Before opening a PR

- Backend: `cd backend && pytest`
- Frontend: `cd frontend && npm run lint && npx tsc -b`
- Make sure you haven't committed `.env`, model weights, or any uploaded
  images (check `git status` — these are gitignored by default for a
  reason).

## Reporting issues

Open a GitHub issue. For anything touching patient data handling or
suspected security issues, please don't open a public issue — contact the
maintainers directly first.

## Code style

- Backend: standard FastAPI/SQLAlchemy conventions, type-hinted Python.
- Frontend: TypeScript, functional React components, Tailwind utility
  classes. Keep new UI primitives in `src/components/ui` consistent with
  the existing shadcn/ui components rather than introducing a second
  styling approach.

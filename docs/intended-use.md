# Intended Use

## What this tool is

A decision-support aid that screens pediatric chest X-rays for radiographic
signs consistent with pneumonia, to help triage and prioritize cases in
resource-constrained clinical settings.

## What this tool is not

This tool does **not** diagnose patients. It is not a Software as a Medical
Device in the sense of an autonomous decision-maker, and it must not be
deployed as one. Every prediction is a screening suggestion that requires
review and confirmation by a qualified clinician before it informs patient
care. This constraint is enforced in the product itself, not just in this
document:

- The result screen always shows the model's output alongside a persistent
  notice that the result is decision support only.
- A prediction cannot be marked "final" in the audit log without a clinician
  explicitly confirming or overriding it (`POST /predictions/{id}/confirm`).
- The audit log records the model's prediction and the clinician's final
  call as separate fields, so the two are never conflated after the fact.

## Model version: combined-trained, not single-dataset

The production model file is `pneumonia_model.keras` — as of this version,
that filename refers to the **combined-trained** model (previously it
referred to the older Guangzhou-only model; the filename was not changed
across this retrain, only its contents). It was **trained on one combined
corpus**: the original Guangzhou-sourced dataset plus a Nigerian chest
X-ray dataset, trained together in a single pass — not sequential
fine-tuning of the Guangzhou-only model on Nigerian data afterward.

This retraining happened because an earlier version of this tool used a
model trained only on the Guangzhou dataset (see "Training data
provenance" below). That model had high pneumonia recall on its own
held-out test split, but when evaluated against Nigerian normal X-rays it
produced a high false-positive rate — it too often flagged genuinely
normal Nigerian films as Pneumonia, consistent with the general risk that
a model trained on one population's imaging equipment and patient profile
doesn't generalize cleanly to another. Combining both datasets into one
training corpus closed most of this gap, rather than trying to patch it
with threshold tuning alone.

## Why the threshold is 0.2, not 0.8

The model outputs a single sigmoid value representing P(Normal); a naive
classifier would threshold at 0.5. **The threshold is a property of the
specific trained model, not a fixed constant of the problem.** An earlier
version of this tool used the previous, Guangzhou-only model (also
distributed as `pneumonia_model.keras`, before the combined retrain
replaced its contents) at a threshold of **0.8**. The current
combined-trained model has a different score calibration, and requires a
**much lower** threshold of **0.2** to hit an equivalent operating point.
Do not carry a threshold value forward across a model swap — if this model
is retrained again (more data, a different architecture, even the same
data reshuffled), the threshold must be re-derived from that new model's
own precision/recall curve, not copied from this section.

> **TODO before this document is considered current:** fill in this
> model's actual precision/recall at 0.2 from its held-out evaluation, the
> way the previous version of this document did for the 0.8 model. This
> section currently states the threshold _value_ and _why it differs_ but
> does not yet carry verified performance numbers for the current
> combined-trained model — don't deploy on the strength of this doc alone
> until that's filled in.

As before, the qualitative reasoning for biasing away from 0.5 is
unchanged: in a triage context a missed pneumonia case is far more costly
than a false alarm a clinician reviews and clears, so the operating point
is deliberately chosen to favor pneumonia recall over precision. This is a
choice made for a specific clinical workflow (triage prioritization with
mandatory clinician review), not a claim that 0.2 is universally "better,"
and it should be revisited if the tool is adapted to a different workflow.

## Known limitations

- **Training data provenance.** The model was trained on a combined
  corpus: the public
  [Chest X-Ray Images (Pneumonia)](https://www.kaggle.com/datasets/paultimothymooney/chest-xray-pneumonia)
  dataset (pediatric population, Guangzhou, China) plus a Nigerian chest
  X-ray dataset, trained together. This is an improvement over the earlier
  Guangzhou-only model (see above), but "trained on some Nigerian data" is
  not the same as "clinically validated across Nigerian and broader
  African clinical populations." Differences in imaging equipment,
  patient demographics, comorbidity patterns (e.g. malnutrition, HIV,
  sickle cell disease), and disease prevalence between the training data
  and a specific deployment site can still degrade real-world accuracy in
  ways a held-out test split cannot fully reveal. Do not treat reported
  precision/recall numbers as a guarantee of performance at a new site.
- **Nigerian training data is viral-pneumonia-only.** The Nigerian dataset
  used in the combined training labels its positive class specifically as
  "viral pneumonia." The model's performance on **bacterial** pneumonia
  presentations has not been separately validated against Nigerian data —
  the Nigerian contribution to the combined corpus does not confirm the
  model generalizes equally well to bacterial cases, only viral ones. This
  matters clinically since bacterial and viral pediatric pneumonia can
  differ in radiographic presentation. Treat any "Pneumonia" flag as
  etiology-agnostic and requiring full clinical correlation, not just
  radiographic confirmation.
- **Binary output only.** The model distinguishes Pneumonia vs. Normal. It
  does not localize findings, grade severity, distinguish bacterial from
  viral pneumonia, or detect other pathology (e.g. tuberculosis, effusion,
  pneumothorax) that may be present on the same film.
- **Image quality dependence.** Preprocessing (grayscale, 150x150 resize)
  is fixed to match training. Very low-resolution, rotated, cropped, or
  otherwise non-standard captures may fall outside the distribution the
  model was trained on and produce unreliable scores.
- **No clinical validation trial.** The reported metrics come from a
  held-out split of the training dataset, not a prospective clinical study.

## Clinician identity in the admin dashboard

The `/admin` dashboard aggregates the audit log into usage stats (request
volume, pneumonia rate, override rate, per-clinician activity). It
deliberately does **not** introduce a user account system: clinicians are
still identified by the free-text name they type when confirming a
result, exactly as in the rest of the app. "Per-clinician" stats are
therefore grouped by that typed name, not a verified identity — two
clinicians who type their name differently ("Dr. Bello" vs "T. Bello")
will appear as two rows. This was a deliberate scope call for the
single-clinic pilot (see `backend/app/security.py`), not an oversight;
if this dashboard needs to attribute activity to verified individuals,
that requires real clinician accounts, not just a bigger admin feature.

The dashboard itself sits behind a single shared admin password
(`ADMIN_PASSWORD` / `SECRET_KEY` in `.env`), separate from the rest of
the app, which remains unauthenticated. Change both before deploying
anywhere beyond a trusted local network.

## Human-in-the-loop requirement

Anyone deploying or extending this tool must preserve the following
invariants:

1. A model prediction is never presented as a final result in the UI.
2. Every prediction requires an explicit clinician confirm-or-override
   action before it is recorded as final in the audit log.
3. The audit log retains both the model's original prediction and the
   clinician's final decision, so disagreement between the two remains
   visible for quality review and model monitoring.
4. Any change to the classification threshold must be re-validated (ideally
   against local/regional data) and documented here, including the
   precision/recall tradeoff it produces.

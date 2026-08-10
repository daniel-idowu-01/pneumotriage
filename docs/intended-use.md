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

## Why the threshold is 0.8, not 0.5

The model outputs a single sigmoid value representing P(Normal). A naive
classifier would threshold at 0.5. This tool uses **0.8** instead:

| Threshold | Pneumonia recall | Pneumonia precision |
|-----------|-------------------|----------------------|
| 0.8       | 0.91              | 0.92                 |

Raising the threshold for "Normal" means the model only calls an X-ray
Normal when it is quite confident — anything more ambiguous is flagged as
Pneumonia instead. This deliberately trades some false-positive Pneumonia
flags for fewer missed true Pneumonia cases, because in a triage context a
missed pneumonia case is far more costly than a false alarm that a
clinician reviews and clears. This is a threshold choice made for a
specific clinical workflow (triage prioritization with mandatory clinician
review) — it is not a claim that 0.8 is a universally "better" threshold,
and it should be revisited if the tool is adapted to a different workflow.

## Known limitations

- **Training data provenance.** The model was trained on the public
  [Chest X-Ray Images (Pneumonia)](https://www.kaggle.com/datasets/paultimothymooney/chest-xray-pneumonia)
  dataset, which was collected from a pediatric population in Guangzhou,
  China. It was **not** trained or validated on X-rays from Nigerian or
  broader African clinical populations. Differences in imaging equipment,
  patient demographics, comorbidity patterns (e.g. malnutrition, HIV,
  sickle cell disease), and disease prevalence between the training
  population and a deployment population can degrade real-world accuracy
  in ways that a held-out test split from the same source dataset cannot
  reveal. Do not treat the reported precision/recall numbers as a
  guarantee of performance on a new population.
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

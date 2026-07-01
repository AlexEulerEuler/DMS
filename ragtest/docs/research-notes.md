# Research Notes

## Upstage Findings

Checked on 2026-07-01:

- Solar Pro 3 has alias `solar-pro3`; the docs list `solar-pro3-260323` as the
  current alias target and `solar-pro3-260126` as an earlier version.
- Solar Pro 3 is documented as a Mixture-of-Experts model with 102B total
  parameters, 12B active parameters, and 128K context length.
- Upstage File Search supports uploading files, building vector stores, searching
  vector stores, and generating grounded answers with the Responses API.
- File Search docs list limits such as 50 vector stores per user, 500 files per
  vector store, and 50 files per batch.
- File Search indexing batches should be monitored through `file_counts`, because
  batch `status` may remain `in_progress` even after individual files are done.

Sources:

- https://developers.upstage.ai/docs/models/solar-pro-3
- https://developers.upstage.ai/docs/capabilities/search/file-search

## Design Decision

Use a hybrid path:

1. HUB API normalizer for treatment, checkup, medication, and immunization.
2. Local normalizer for non-HUB structured data such as microbiome JSON.
3. Upstage File Search for report-heavy PDF retrieval.
4. Optional local keyword index for repeatable experiments without API calls.
5. Solar Pro 3 / custom Upstage agent for synthesis, with strict citation
   requirements.

## Open Questions

- Are the JSON files from a fixed institution schema or multiple providers?
- Should the VCF be clinically annotated before indexing?
- Are PDF reports allowed to leave the local environment?
- Does the answer product need Korean-only, bilingual, or clinician-facing tone?
- Should the vector store be one store per patient, per consent scope, or per
  source category?

# Architecture Notes

## Goal

Build a medical MyData RAG system that can answer patient-record questions over
mixed raw data and reports while preserving source traceability, privacy, and
clinical caution.

## Pipeline

```text
data/raw
  -> file catalog
  -> category-specific loaders
  -> normalized documents
  -> chunks with source metadata
  -> retrieval index
  -> answer generation with cited evidence
```

## Source Handling

Structured JSON:

- gut microbiome report data

HUB API:

- treatment/pharmacy visit history: `/v1/records/treatments`
- checkup records: `/v1/records/health-checkup`
- medication history: `/v1/records/medication-dispense`
- immunization records: `/v1/records/immunizations`

These are fetched with `patientSeq` and Bearer token, then flattened
conservatively and chunked with category, API endpoint, patient sequence,
transaction id, and record locator.

Structured local JSON:

- gut microbiome report data

This is loaded as records, flattened conservatively, and chunked with category,
source path, and record locator.

PDF reports:

- glucose report
- Holter report

The local loader can use `pypdf` when installed, but production should prefer
Upstage Document Parse or File Search because clinical PDFs often include tables,
charts, and multi-column layouts.

VCF:

- `*.vcf.gz` is parsed into bounded variant summaries.
- `*.vcf.gz.tbi` is cataloged as an index companion, not directly embedded.
- Production should enrich VCF records through a clinically governed annotation
  service before retrieval.

## Retrieval Strategy

Short term:

- local keyword index for fast offline experiments
- metadata filters by category and source
- Solar Pro 3 generation over retrieved snippets

Production candidate:

- Upstage Files API for upload
- Upstage Vector Stores / File Search for indexing
- Upstage Responses API for grounded answers
- local metadata database for consent, provenance, record ownership, and audit

## Prompt Contract

Every generation request should instruct the model to:

- answer only from supplied evidence
- cite source ids or source paths
- mark uncertainty when evidence is incomplete
- avoid diagnosis or treatment directives
- recommend professional review for clinically significant findings

## Privacy Controls

Minimum viable controls:

- never commit raw data, `.env`, or generated PHI-bearing indexes
- log counts and file ids, not record contents
- hash patient identifiers before indexing
- keep source-level consent and revocation state
- support full deletion by source file id and vector store file id

Upstage Solar Pro 3 docs state API input data is not used for model training and
is not stored unless required for service delivery and explicitly stated, but the
application should still treat every upload as sensitive medical data.

## Evaluation

Evaluation sets should include:

- evidence recall by category
- cross-source questions, such as medication plus checkup
- date-range filtering
- PDF table/chart extraction accuracy
- Korean medical terminology robustness
- refusal behavior when evidence is absent
- citation accuracy

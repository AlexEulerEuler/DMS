# Mock Data

The generated files in `test/data/raw` are synthetic non-HUB records for RAG
experiments. They are not real patient data and must not be used for diagnosis,
treatment, or clinical decision-making.

Generate or refresh them with:

```bash
/Users/alex/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 scripts/generate_mock_data.py
```

Use the same bundled Python when building the local index, because it includes
the PDF dependencies needed to extract report text.

Generated files:

- `GUTINSIDE.json`: gut microbiome summary and taxa
- `L01.vcf.gz`: synthetic VCF records
- `L01.vcf.gz.tbi`: tabix index when `pysam` is available, otherwise a placeholder
- `2026-04-10_2026-04-14-OOO 입원환자 연속혈당 리포트.pdf`: synthetic CGM report
- `홀터리포트_샘플.pdf`: synthetic Holter report

API-backed records:

- treatment: HUB `/v1/records/treatments`
- checkup: HUB `/v1/records/health-checkup`
- medication: HUB `/v1/records/medication-dispense`
- immunization: HUB `/v1/records/immunizations`

Suggested smoke-test questions:

- "2026년 4월 입원 중 혈당 변동과 퇴원 약 변경을 근거와 함께 요약해줘."
- "심계항진 외래 방문과 홀터 리포트에서 연결되는 근거를 찾아줘."
- "검진의 HbA1c 변화와 현재 당뇨 관련 약물 이력을 함께 정리해줘."
- "장내미생물 리포트에서 식이 관련으로 참고할 수 있는 항목만 찾아줘."

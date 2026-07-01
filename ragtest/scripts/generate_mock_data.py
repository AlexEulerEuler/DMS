from __future__ import annotations

import gzip
import json
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
RAW_DIR = ROOT / "data" / "raw"
API_BACKED_LEGACY_FILES = [
    "treatment (1).json",
    "checkup (1).json",
    "medication (1).json",
    "immunization (1).json",
]


def write_json(path: Path, payload: Any) -> None:
    path.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def healthy_reference_notes() -> dict[str, str]:
    return {
        "blood_pressure": "AHA normal category is systolic <120 and diastolic <80 mmHg.",
        "bmi": "CDC adult healthy weight BMI category is 18.5 to <25 kg/m^2.",
        "a1c": "NIDDK notes normal A1C is below 5.7%.",
        "cholesterol": "MedlinePlus lists adult total cholesterol <200 mg/dL and LDL <100 mg/dL as healthy levels.",
        "glucose": "MedlinePlus describes blood glucose tests as routine screening; values here are synthetic normal-range examples.",
        "heart_rate": "AHA target heart-rate guidance is used only as a general synthetic exercise reference.",
    }


def make_adult_profile() -> dict[str, Any]:
    return {
        "synthetic": True,
        "patient_id": "MOCK-PATIENT-001",
        "profile_type": "generally healthy average adult",
        "demographics": {
            "age_years": 34,
            "age_band": "30-39",
            "sex_at_birth": "female",
            "gender": "female",
            "language": "ko-KR",
            "timezone": "Asia/Seoul",
        },
        "body_metrics": {
            "height_cm": 168.0,
            "usual_weight_kg": 61.8,
            "bmi": 21.9,
            "bmi_category": "healthy_weight",
            "waist_cm": 73.5,
        },
        "baseline_health_context": {
            "smoking_status": "never_smoker",
            "alcohol_pattern": "0-1 standard drinks per week",
            "exercise_pattern": "brisk walking, yoga, and light resistance training",
            "known_chronic_conditions": [],
            "pregnancy_status": "not_pregnant",
            "functional_status": "independent",
        },
        "data_coverage": {
            "start_date": "2026-03-01",
            "end_date": "2026-04-30",
            "sources": [
                "home blood pressure cuff",
                "consumer wearable",
                "annual wellness lab panel",
                "synthetic PDF reports",
            ],
        },
        "reference_notes": healthy_reference_notes(),
        "fixture_note": "Synthetic normal-range profile for RAG testing only; not medical advice.",
    }


def make_home_vitals() -> dict[str, Any]:
    records = [
        ("2026-04-01", "07:12", 108, 68, 61, 61.7, 36.5, "rested morning seated"),
        ("2026-04-02", "07:20", 110, 70, 62, 61.8, 36.4, "rested morning seated"),
        ("2026-04-03", "21:05", 112, 71, 64, 61.9, 36.6, "evening after dinner walk"),
        ("2026-04-04", "08:02", 106, 67, 59, 61.6, 36.5, "weekend morning seated"),
        ("2026-04-05", "20:48", 114, 72, 66, 61.8, 36.7, "evening seated"),
        ("2026-04-06", "07:15", 109, 69, 60, 61.7, 36.4, "rested morning seated"),
        ("2026-04-07", "07:18", 111, 70, 61, 61.8, 36.5, "rested morning seated"),
        ("2026-04-08", "22:10", 116, 74, 68, 62.0, 36.6, "late evening after commute"),
        ("2026-04-09", "07:05", 107, 68, 60, 61.8, 36.4, "rested morning seated"),
        ("2026-04-10", "07:25", 110, 69, 62, 61.9, 36.5, "rested morning seated"),
        ("2026-04-11", "08:15", 105, 66, 58, 61.6, 36.4, "post-rest day morning"),
        ("2026-04-12", "20:30", 113, 71, 65, 61.7, 36.6, "evening seated"),
        ("2026-04-13", "07:08", 109, 68, 60, 61.8, 36.5, "rested morning seated"),
        ("2026-04-14", "07:18", 108, 69, 61, 61.7, 36.5, "rested morning seated"),
    ]
    return {
        "synthetic": True,
        "patient_id": "MOCK-PATIENT-001",
        "device": "MockArmCuff-2 and MockScale-Lite",
        "reference_notes": healthy_reference_notes(),
        "records": [
            {
                "date": date,
                "time": time,
                "systolic_bp_mm_hg": systolic,
                "diastolic_bp_mm_hg": diastolic,
                "blood_pressure_category": "normal",
                "resting_hr_bpm": heart_rate,
                "weight_kg": weight,
                "temperature_c": temp,
                "measurement_context": context,
            }
            for date, time, systolic, diastolic, heart_rate, weight, temp, context in records
        ],
    }


def make_wellness_labs() -> dict[str, Any]:
    panels = [
        {
            "panel_id": "LAB-2024-09-WELLNESS",
            "date": "2024-09-12",
            "provider": "National Health Screening Center",
            "fasting_status": "fasting_10_hours",
            "results": [
                {"name": "fasting_glucose", "value": 91, "unit": "mg/dL", "reference_range": "roughly 70-99", "interpretation": "normal"},
                {"name": "hba1c", "value": 5.2, "unit": "%", "reference_range": "<5.7", "interpretation": "normal"},
                {"name": "total_cholesterol", "value": 178, "unit": "mg/dL", "reference_range": "<200", "interpretation": "healthy"},
                {"name": "ldl_cholesterol", "value": 92, "unit": "mg/dL", "reference_range": "<100", "interpretation": "healthy"},
                {"name": "hdl_cholesterol", "value": 64, "unit": "mg/dL", "reference_range": ">=60 best", "interpretation": "favorable"},
                {"name": "triglycerides", "value": 82, "unit": "mg/dL", "reference_range": "<150", "interpretation": "normal"},
                {"name": "ast", "value": 19, "unit": "U/L", "reference_range": "lab normal", "interpretation": "normal"},
                {"name": "alt", "value": 17, "unit": "U/L", "reference_range": "lab normal", "interpretation": "normal"},
                {"name": "egfr", "value": 106, "unit": "mL/min/1.73m2", "reference_range": ">=90", "interpretation": "normal kidney filtration estimate"},
                {"name": "hemoglobin", "value": 13.2, "unit": "g/dL", "reference_range": "lab normal", "interpretation": "normal"},
            ],
        },
        {
            "panel_id": "LAB-2025-10-WELLNESS",
            "date": "2025-10-07",
            "provider": "National Health Screening Center",
            "fasting_status": "fasting_9_hours",
            "results": [
                {"name": "fasting_glucose", "value": 88, "unit": "mg/dL", "reference_range": "roughly 70-99", "interpretation": "normal"},
                {"name": "hba1c", "value": 5.1, "unit": "%", "reference_range": "<5.7", "interpretation": "normal"},
                {"name": "total_cholesterol", "value": 172, "unit": "mg/dL", "reference_range": "<200", "interpretation": "healthy"},
                {"name": "ldl_cholesterol", "value": 86, "unit": "mg/dL", "reference_range": "<100", "interpretation": "healthy"},
                {"name": "hdl_cholesterol", "value": 67, "unit": "mg/dL", "reference_range": ">=60 best", "interpretation": "favorable"},
                {"name": "triglycerides", "value": 76, "unit": "mg/dL", "reference_range": "<150", "interpretation": "normal"},
                {"name": "tsh", "value": 1.8, "unit": "mIU/L", "reference_range": "lab normal", "interpretation": "normal"},
                {"name": "vitamin_d_25oh", "value": 32, "unit": "ng/mL", "reference_range": "lab sufficient", "interpretation": "sufficient"},
                {"name": "ferritin", "value": 58, "unit": "ng/mL", "reference_range": "lab normal", "interpretation": "normal"},
                {"name": "urine_protein", "value": "negative", "unit": "", "reference_range": "negative", "interpretation": "normal"},
            ],
        },
        {
            "panel_id": "LAB-2026-04-WELLNESS",
            "date": "2026-04-15",
            "provider": "Hanbit Wellness Clinic",
            "fasting_status": "fasting_10_hours",
            "results": [
                {"name": "fasting_glucose", "value": 90, "unit": "mg/dL", "reference_range": "roughly 70-99", "interpretation": "normal"},
                {"name": "hba1c", "value": 5.2, "unit": "%", "reference_range": "<5.7", "interpretation": "normal"},
                {"name": "total_cholesterol", "value": 181, "unit": "mg/dL", "reference_range": "<200", "interpretation": "healthy"},
                {"name": "ldl_cholesterol", "value": 95, "unit": "mg/dL", "reference_range": "<100", "interpretation": "healthy"},
                {"name": "hdl_cholesterol", "value": 66, "unit": "mg/dL", "reference_range": ">=60 best", "interpretation": "favorable"},
                {"name": "triglycerides", "value": 88, "unit": "mg/dL", "reference_range": "<150", "interpretation": "normal"},
                {"name": "wbc", "value": 5.8, "unit": "10^3/uL", "reference_range": "lab normal", "interpretation": "normal"},
                {"name": "platelets", "value": 254, "unit": "10^3/uL", "reference_range": "lab normal", "interpretation": "normal"},
                {"name": "creatinine", "value": 0.72, "unit": "mg/dL", "reference_range": "lab normal", "interpretation": "normal"},
                {"name": "crp", "value": 0.4, "unit": "mg/L", "reference_range": "low", "interpretation": "low inflammatory marker"},
            ],
        },
    ]
    return {
        "synthetic": True,
        "patient_id": "MOCK-PATIENT-001",
        "reference_notes": healthy_reference_notes(),
        "records": panels,
    }


def make_activity_sleep_nutrition() -> dict[str, Any]:
    rows = [
        ("2026-04-01", 8420, 42, 24, 61, 445, 89, 2300, 29, 95, 0, "balanced meals, evening walk"),
        ("2026-04-02", 10120, 56, 30, 62, 432, 87, 2100, 31, 80, 0, "commute walking plus yoga"),
        ("2026-04-03", 7680, 38, 18, 64, 418, 86, 2000, 26, 120, 1, "social dinner, one drink"),
        ("2026-04-04", 11240, 68, 42, 59, 472, 91, 2450, 34, 60, 0, "park hike and high-fiber meals"),
        ("2026-04-05", 6950, 32, 20, 66, 456, 88, 2200, 27, 90, 0, "light recovery day"),
        ("2026-04-06", 9340, 48, 25, 60, 438, 88, 2150, 30, 100, 0, "regular workday activity"),
        ("2026-04-07", 10480, 59, 35, 61, 464, 90, 2350, 32, 70, 0, "resistance training"),
        ("2026-04-08", 8210, 41, 22, 68, 401, 84, 1950, 24, 110, 0, "short sleep after late work"),
        ("2026-04-09", 9870, 52, 28, 60, 447, 89, 2250, 29, 85, 0, "normal weekday"),
        ("2026-04-10", 12110, 74, 46, 62, 470, 92, 2500, 35, 55, 0, "long walk and early bedtime"),
        ("2026-04-11", 7540, 36, 20, 58, 486, 93, 2400, 33, 45, 0, "restful weekend"),
        ("2026-04-12", 8890, 44, 26, 65, 430, 87, 2150, 28, 100, 1, "family meal, moderate sodium"),
        ("2026-04-13", 9650, 51, 30, 60, 452, 90, 2300, 31, 75, 0, "normal weekday"),
        ("2026-04-14", 10330, 57, 34, 61, 459, 91, 2350, 32, 65, 0, "cycling commute"),
    ]
    return {
        "synthetic": True,
        "patient_id": "MOCK-PATIENT-001",
        "source_device": "MockBand Active",
        "records": [
            {
                "date": date,
                "steps": steps,
                "active_minutes": active_minutes,
                "exercise_minutes": exercise_minutes,
                "resting_hr_bpm": resting_hr,
                "sleep_duration_minutes": sleep_minutes,
                "sleep_efficiency_percent": sleep_efficiency,
                "water_ml": water_ml,
                "fiber_estimate_g": fiber_g,
                "caffeine_mg": caffeine_mg,
                "alcohol_servings": alcohol_servings,
                "smoking_status": "never_smoker",
                "notes": notes,
            }
            for (
                date,
                steps,
                active_minutes,
                exercise_minutes,
                resting_hr,
                sleep_minutes,
                sleep_efficiency,
                water_ml,
                fiber_g,
                caffeine_mg,
                alcohol_servings,
                notes,
            ) in rows
        ],
    }


def make_preventive_screening() -> dict[str, Any]:
    return {
        "synthetic": True,
        "patient_id": "MOCK-PATIENT-001",
        "records": [
            {
                "date": "2025-10-07",
                "screening_type": "annual wellness check",
                "facility": "National Health Screening Center",
                "result_summary": "normal vital signs and normal-range metabolic screening",
                "next_due_date": "2026-10-07",
                "source_document": "WELLNESS_LABS.json",
            },
            {
                "date": "2025-11-02",
                "screening_type": "dental cleaning",
                "facility": "Bright Dental Clinic",
                "result_summary": "no cavities, mild plaque, gum pockets within routine monitoring range",
                "next_due_date": "2026-05-02",
                "source_document": "DENTAL_VISION.json",
            },
            {
                "date": "2026-01-19",
                "screening_type": "vision exam",
                "facility": "ClearView Optometry",
                "result_summary": "corrected visual acuity 1.0 both eyes, intraocular pressure within expected range",
                "next_due_date": "2027-01-19",
                "source_document": "DENTAL_VISION.json",
            },
            {
                "date": "2026-03-04",
                "screening_type": "skin check",
                "facility": "Hanbit Dermatology",
                "result_summary": "benign-appearing nevi, sunscreen counseling only",
                "next_due_date": "2027-03-04",
                "source_document": "PREVENTIVE_SCREENING.json",
            },
            {
                "date": "2026-04-15",
                "screening_type": "mental wellbeing PHQ-2/GAD-2",
                "facility": "Hanbit Wellness Clinic",
                "result_summary": "PHQ-2 score 0, GAD-2 score 1, no follow-up required in this fixture",
                "next_due_date": "2027-04-15",
                "source_document": "MENTAL_WELLBEING.json",
            },
        ],
    }


def make_dental_vision() -> dict[str, Any]:
    return {
        "synthetic": True,
        "patient_id": "MOCK-PATIENT-001",
        "records": [
            {
                "record_type": "dental_visit",
                "date": "2025-05-03",
                "provider": "Bright Dental Clinic",
                "findings": ["no caries", "healthy gingiva", "minor calculus lower incisors"],
                "procedures": ["routine cleaning", "fluoride varnish"],
                "recommendations": ["floss daily", "repeat cleaning in 6 months"],
                "next_due_date": "2025-11-03",
            },
            {
                "record_type": "dental_visit",
                "date": "2025-11-02",
                "provider": "Bright Dental Clinic",
                "findings": ["no cavities", "stable enamel", "mild plaque"],
                "procedures": ["routine cleaning"],
                "recommendations": ["continue twice-daily brushing", "repeat in 6 months"],
                "next_due_date": "2026-05-02",
            },
            {
                "record_type": "vision_visit",
                "date": "2026-01-19",
                "provider": "ClearView Optometry",
                "visual_acuity_corrected": "1.0/1.0",
                "intraocular_pressure_mm_hg": {"right": 15, "left": 14},
                "findings": ["mild myopia stable", "no retinal abnormality noted"],
                "recommendations": ["annual eye exam", "screen breaks during computer work"],
                "next_due_date": "2027-01-19",
            },
        ],
    }


def make_mental_wellbeing() -> dict[str, Any]:
    return {
        "synthetic": True,
        "patient_id": "MOCK-PATIENT-001",
        "records": [
            {
                "date": "2025-10-07",
                "instrument": "PHQ-2",
                "score": 0,
                "severity_band": "none_minimal",
                "sleep_stress_note": "sleep generally restorative; work stress manageable",
                "followup_recommended": False,
            },
            {
                "date": "2025-10-07",
                "instrument": "GAD-2",
                "score": 1,
                "severity_band": "minimal",
                "sleep_stress_note": "occasional deadline worry without functional impairment",
                "followup_recommended": False,
            },
            {
                "date": "2026-04-15",
                "instrument": "PHQ-2",
                "score": 0,
                "severity_band": "none_minimal",
                "sleep_stress_note": "regular exercise and social support documented",
                "followup_recommended": False,
            },
            {
                "date": "2026-04-15",
                "instrument": "GAD-2",
                "score": 1,
                "severity_band": "minimal",
                "sleep_stress_note": "uses breathing exercises before sleep",
                "followup_recommended": False,
            },
        ],
    }


def make_self_reported_history() -> dict[str, Any]:
    return {
        "synthetic": True,
        "patient_id": "MOCK-PATIENT-001",
        "records": [
            {
                "record_type": "allergy",
                "name": "no known drug allergies",
                "status": "active_statement",
                "onset_or_start_date": None,
                "notes": "Patient reports no medication allergy history in this synthetic fixture.",
                "source": "self_reported_intake_2026-04-15",
            },
            {
                "record_type": "allergy",
                "name": "seasonal pollen sensitivity",
                "status": "mild_intermittent",
                "onset_or_start_date": "2019",
                "notes": "Occasional spring sneezing; no asthma or emergency visits.",
                "source": "self_reported_intake_2026-04-15",
            },
            {
                "record_type": "family_history",
                "name": "parent hypertension",
                "status": "family_history_only",
                "onset_or_start_date": None,
                "notes": "One parent developed hypertension in late 50s; no early cardiovascular disease reported.",
                "source": "self_reported_intake_2026-04-15",
            },
            {
                "record_type": "surgery",
                "name": "wisdom tooth extraction",
                "status": "completed",
                "onset_or_start_date": "2014",
                "notes": "No complications.",
                "source": "self_reported_intake_2026-04-15",
            },
            {
                "record_type": "supplement",
                "name": "vitamin D3",
                "status": "intermittent",
                "onset_or_start_date": "2025-11",
                "notes": "1000 IU a few times per week during winter.",
                "source": "self_reported_intake_2026-04-15",
            },
        ],
    }


def make_treatment() -> list[dict[str, Any]]:
    return [
        {
            "synthetic": True,
            "patient_id": "MOCK-PATIENT-001",
            "visit_id": "OPD-20251118-001",
            "visit_date": "2025-11-18",
            "facility": "Hanbit Internal Medicine Clinic",
            "department": "internal_medicine",
            "visit_type": "outpatient",
            "chief_complaint": "3 days of cough and mild fever",
            "diagnoses": [
                {"code": "J20.9", "name": "acute bronchitis, unspecified"}
            ],
            "orders": [
                {"type": "lab", "name": "CBC", "result_summary": "no leukocytosis"},
                {"type": "medication", "name": "acetylcysteine", "days": 5},
            ],
            "pharmacy": {
                "dispense_date": "2025-11-18",
                "pharmacy_name": "Mirae Pharmacy",
                "dispensed_items": ["acetylcysteine 200mg", "levodropropizine 60mg"],
            },
            "note": "Symptoms improved without follow-up visit.",
        },
        {
            "synthetic": True,
            "patient_id": "MOCK-PATIENT-001",
            "visit_id": "OPD-20260203-001",
            "visit_date": "2026-02-03",
            "facility": "Hanbit Family Medicine Clinic",
            "department": "family_medicine",
            "visit_type": "outpatient",
            "chief_complaint": "routine diabetes follow-up",
            "diagnoses": [
                {"code": "E11.9", "name": "type 2 diabetes mellitus without complications"},
                {"code": "E78.5", "name": "hyperlipidemia, unspecified"},
            ],
            "vitals": {"bp": "128/78", "weight_kg": 72.4},
            "orders": [
                {"type": "lab", "name": "HbA1c", "result_summary": "7.1%"},
                {"type": "lab", "name": "LDL-C", "result_summary": "118 mg/dL"},
            ],
            "pharmacy": {
                "dispense_date": "2026-02-03",
                "pharmacy_name": "Mirae Pharmacy",
                "dispensed_items": ["metformin XR 500mg", "rosuvastatin 5mg"],
            },
            "note": "Medication adherence discussed. Lifestyle counseling documented.",
        },
        {
            "synthetic": True,
            "patient_id": "MOCK-PATIENT-001",
            "visit_id": "OPD-20260321-001",
            "visit_date": "2026-03-21",
            "facility": "Seoul Cardiology Center",
            "department": "cardiology",
            "visit_type": "outpatient",
            "chief_complaint": "intermittent palpitations",
            "diagnoses": [
                {"code": "R00.2", "name": "palpitations"}
            ],
            "orders": [
                {"type": "test", "name": "24-hour Holter monitoring", "status": "completed"},
                {"type": "test", "name": "12-lead ECG", "result_summary": "sinus rhythm"},
            ],
            "pharmacy": {
                "dispense_date": None,
                "pharmacy_name": None,
                "dispensed_items": [],
            },
            "note": "Holter report uploaded as separate PDF source.",
        },
        {
            "synthetic": True,
            "patient_id": "MOCK-PATIENT-001",
            "visit_id": "ADM-20260410-001",
            "visit_date": "2026-04-10",
            "facility": "Daejeon General Hospital",
            "department": "endocrinology",
            "visit_type": "short_stay_admission",
            "chief_complaint": "glucose variability evaluation",
            "diagnoses": [
                {"code": "E11.65", "name": "type 2 diabetes mellitus with hyperglycemia"}
            ],
            "orders": [
                {"type": "monitoring", "name": "continuous glucose monitoring", "days": 5},
                {"type": "nutrition", "name": "diabetes meal education", "status": "done"},
            ],
            "pharmacy": {
                "dispense_date": "2026-04-14",
                "pharmacy_name": "Daejeon Hospital Pharmacy",
                "dispensed_items": ["metformin XR 500mg", "insulin glargine pen"],
            },
            "note": "CGM report uploaded as separate PDF source.",
        },
    ]


def make_checkup() -> dict[str, Any]:
    return {
        "synthetic": True,
        "patient_id": "MOCK-PATIENT-001",
        "records": [
            {
                "checkup_id": "CHK-2024-001",
                "date": "2024-09-12",
                "facility": "National Health Screening Center",
                "measurements": {
                    "height_cm": 171.2,
                    "weight_kg": 73.8,
                    "bmi": 25.2,
                    "waist_cm": 88.0,
                    "bp_systolic": 132,
                    "bp_diastolic": 82,
                },
                "labs": {
                    "fasting_glucose_mg_dl": 126,
                    "hba1c_percent": 6.8,
                    "total_cholesterol_mg_dl": 216,
                    "ldl_mg_dl": 134,
                    "hdl_mg_dl": 43,
                    "triglyceride_mg_dl": 178,
                    "ast_u_l": 28,
                    "alt_u_l": 36,
                    "egfr_ml_min_1_73m2": 92,
                },
                "findings": [
                    "borderline elevated blood pressure",
                    "impaired fasting glucose range",
                    "LDL cholesterol above target for metabolic risk",
                ],
                "recommendations": [
                    "repeat metabolic labs in 3-6 months",
                    "dietary counseling and regular exercise",
                ],
            },
            {
                "checkup_id": "CHK-2025-001",
                "date": "2025-10-07",
                "facility": "National Health Screening Center",
                "measurements": {
                    "height_cm": 171.0,
                    "weight_kg": 72.9,
                    "bmi": 24.9,
                    "waist_cm": 86.5,
                    "bp_systolic": 126,
                    "bp_diastolic": 78,
                },
                "labs": {
                    "fasting_glucose_mg_dl": 119,
                    "hba1c_percent": 6.6,
                    "total_cholesterol_mg_dl": 198,
                    "ldl_mg_dl": 121,
                    "hdl_mg_dl": 45,
                    "triglyceride_mg_dl": 152,
                    "ast_u_l": 25,
                    "alt_u_l": 31,
                    "egfr_ml_min_1_73m2": 89,
                },
                "imaging": {
                    "chest_xray": "no active pulmonary lesion",
                    "abdominal_ultrasound": "mild fatty liver change",
                },
                "findings": [
                    "glycemic marker remains above normal",
                    "mild hepatic steatosis",
                ],
                "recommendations": [
                    "continue glucose monitoring",
                    "follow up liver enzymes annually",
                ],
            },
        ],
    }


def make_medication() -> list[dict[str, Any]]:
    return [
        {
            "synthetic": True,
            "patient_id": "MOCK-PATIENT-001",
            "medication_id": "MED-001",
            "drug_name": "metformin XR 500mg",
            "ingredient": "metformin",
            "route": "oral",
            "dose": "500mg",
            "frequency": "twice daily",
            "start_date": "2025-10-08",
            "end_date": None,
            "status": "active",
            "source": "family medicine outpatient prescription",
            "linked_visit_id": "OPD-20260203-001",
        },
        {
            "synthetic": True,
            "patient_id": "MOCK-PATIENT-001",
            "medication_id": "MED-002",
            "drug_name": "rosuvastatin 5mg",
            "ingredient": "rosuvastatin",
            "route": "oral",
            "dose": "5mg",
            "frequency": "once nightly",
            "start_date": "2026-02-03",
            "end_date": None,
            "status": "active",
            "source": "family medicine outpatient prescription",
            "linked_visit_id": "OPD-20260203-001",
        },
        {
            "synthetic": True,
            "patient_id": "MOCK-PATIENT-001",
            "medication_id": "MED-003",
            "drug_name": "insulin glargine pen",
            "ingredient": "insulin glargine",
            "route": "subcutaneous",
            "dose": "8 units",
            "frequency": "once daily at bedtime",
            "start_date": "2026-04-14",
            "end_date": None,
            "status": "active",
            "source": "short stay discharge prescription",
            "linked_visit_id": "ADM-20260410-001",
        },
        {
            "synthetic": True,
            "patient_id": "MOCK-PATIENT-001",
            "medication_id": "MED-004",
            "drug_name": "levodropropizine 60mg",
            "ingredient": "levodropropizine",
            "route": "oral",
            "dose": "60mg",
            "frequency": "three times daily as needed",
            "start_date": "2025-11-18",
            "end_date": "2025-11-23",
            "status": "completed",
            "source": "bronchitis prescription",
            "linked_visit_id": "OPD-20251118-001",
        },
    ]


def make_immunization() -> list[dict[str, Any]]:
    return [
        {
            "synthetic": True,
            "patient_id": "MOCK-PATIENT-001",
            "immunization_id": "IMM-20231012-FLU",
            "date": "2023-10-12",
            "vaccine": "influenza quadrivalent",
            "manufacturer": "MockBio",
            "lot_number": "FLU23-MOCK-019",
            "site": "left deltoid",
            "facility": "Hanbit Family Medicine Clinic",
            "status": "completed",
        },
        {
            "synthetic": True,
            "patient_id": "MOCK-PATIENT-001",
            "immunization_id": "IMM-20240221-TDAP",
            "date": "2024-02-21",
            "vaccine": "Tdap",
            "manufacturer": "MockVax",
            "lot_number": "TD24-MOCK-441",
            "site": "right deltoid",
            "facility": "Community Health Center",
            "status": "completed",
        },
        {
            "synthetic": True,
            "patient_id": "MOCK-PATIENT-001",
            "immunization_id": "IMM-20251010-FLU",
            "date": "2025-10-10",
            "vaccine": "influenza quadrivalent",
            "manufacturer": "MockBio",
            "lot_number": "FLU25-MOCK-088",
            "site": "left deltoid",
            "facility": "Hanbit Family Medicine Clinic",
            "status": "completed",
        },
    ]


def make_microbiome() -> dict[str, Any]:
    return {
        "synthetic": True,
        "patient_id": "MOCK-PATIENT-001",
        "provider": "GUTINSIDE mock lab",
        "sample": {
            "sample_id": "GUT-20260402-001",
            "collection_date": "2026-04-02",
            "report_date": "2026-04-09",
            "specimen": "stool",
        },
        "summary": {
            "diversity_index": 4.6,
            "diversity_interpretation": "diverse profile within expected mock cohort range",
            "dysbiosis_score": 18,
            "short_chain_fatty_acid_potential": "adequate",
            "pathogen_signal": "not_detected_in_fixture",
        },
        "taxa": [
            {"name": "Bifidobacterium", "relative_abundance_percent": 5.6, "reference": "within expected range"},
            {"name": "Faecalibacterium", "relative_abundance_percent": 8.4, "reference": "fiber-associated range"},
            {"name": "Akkermansia", "relative_abundance_percent": 1.8, "reference": "within expected range"},
            {"name": "Bacteroides", "relative_abundance_percent": 26.2, "reference": "common dominant genus"},
            {"name": "Roseburia", "relative_abundance_percent": 4.1, "reference": "butyrate-associated range"},
            {"name": "Lactobacillus", "relative_abundance_percent": 1.1, "reference": "detected"},
            {"name": "Prevotella", "relative_abundance_percent": 7.9, "reference": "diet-sensitive genus"},
        ],
        "interpretation": [
            "fiber-associated taxa are present in this healthy synthetic profile",
            "no pathogen signal included in this synthetic report",
            "dietary pattern includes vegetables, legumes, fruit, and fermented foods",
            "results are for RAG pipeline testing only",
        ],
    }


def make_vcf() -> str:
    variants = [
        ("1", "11856378", "mockvar0001", "G", "A", "99", "MTOR", "modifier", "benign_research_only"),
        ("2", "233760498", "mockvar0002", "C", "T", "87", "UGT1A1", "low", "pharmacogenomic_mock_no_action"),
        ("3", "128200789", "mockvar0003", "A", "C", "93", "RPL32", "modifier", "common_population_variant"),
        ("4", "100239319", "mockvar0004", "T", "C", "88", "ADH1B", "modifier", "lifestyle_research_marker"),
        ("5", "112176756", "mockvar0005", "C", "G", "91", "APC", "modifier", "benign_fixture_marker"),
        ("6", "26091179", "mockvar0006", "G", "A", "96", "HFE", "modifier", "carrier_screen_negative_context"),
        ("7", "117199644", "mockvar0007", "A", "G", "91", "CFTR", "modifier", "benign_mock"),
        ("8", "19819724", "mockvar0008", "C", "T", "90", "LPL", "modifier", "lipid_trait_research_only"),
        ("9", "22125504", "mockvar0009", "G", "T", "92", "CDKN2A", "modifier", "benign_fixture_marker"),
        ("10", "114758349", "mockvar0010", "T", "G", "86", "TCF7L2", "modifier", "metabolic_trait_research_only"),
        ("11", "5227002", "mockvar0011", "T", "C", "76", "HBB", "modifier", "carrier_screen_mock"),
        ("12", "111803962", "mockvar0012", "A", "G", "95", "SH2B3", "modifier", "common_population_variant"),
        ("13", "32906729", "mockvar0013", "C", "T", "89", "BRCA2", "modifier", "benign_fixture_marker"),
        ("14", "105246551", "mockvar0014", "G", "A", "94", "AKT1", "modifier", "research_only"),
        ("15", "42680015", "mockvar0015", "T", "A", "88", "FBN1", "modifier", "benign_fixture_marker"),
        ("16", "53767042", "mockvar0016", "C", "A", "97", "FTO", "modifier", "body_weight_trait_research_only"),
        ("17", "43045782", "mockvar0017", "G", "A", "92", "BRCA1", "modifier", "benign_fixture_marker"),
        ("18", "31592978", "mockvar0018", "A", "T", "90", "NEDD4L", "modifier", "blood_pressure_trait_research_only"),
        ("19", "44908684", "mockvar0019", "T", "C", "95", "APOE", "modifier", "risk_model_not_for_clinical_use"),
        ("22", "19963748", "mockvar0020", "C", "G", "89", "COMT", "modifier", "wellbeing_trait_research_only"),
    ]
    lines = [
        "##fileformat=VCFv4.2",
        "##source=synthetic-mydata-rag-mock",
        "##INFO=<ID=GENE,Number=1,Type=String,Description=\"Synthetic gene symbol\">",
        "##INFO=<ID=IMPACT,Number=1,Type=String,Description=\"Synthetic impact level\">",
        "##INFO=<ID=NOTE,Number=1,Type=String,Description=\"Mock annotation note\">",
        "#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO\tFORMAT\tMOCK-PATIENT-001",
    ]
    for idx, (chrom, pos, variant_id, ref, alt, qual, gene, impact, note) in enumerate(variants):
        genotype = "0/1" if idx % 3 else "0/0"
        depth = 36 + (idx % 9) * 3
        lines.append(
            (
                f"{chrom}\t{pos}\t{variant_id}\t{ref}\t{alt}\t{qual}\tPASS\t"
                f"GENE={gene};IMPACT={impact};NOTE={note}\tGT:DP\t{genotype}:{depth}"
            )
        )
    return "\n".join(lines) + "\n"


def write_vcf_with_index() -> None:
    vcf_text = make_vcf()
    plain_vcf = RAW_DIR / "L01.vcf"
    plain_vcf.write_text(vcf_text, encoding="utf-8")

    try:
        import pysam  # type: ignore

        pysam.tabix_index(str(plain_vcf), preset="vcf", force=True, keep_original=False)
    except Exception:
        gz_path = RAW_DIR / "L01.vcf.gz"
        with gzip.open(gz_path, "wt", encoding="utf-8") as handle:
            handle.write(vcf_text)
        (RAW_DIR / "L01.vcf.gz.tbi").write_bytes(
            b"MOCK_TABIX_INDEX_PLACEHOLDER_FOR_RAG_TESTING\n"
        )
        plain_vcf.unlink(missing_ok=True)


def register_pdf_font() -> str:
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont

    font_candidates = [
        ("AppleGothic", "/System/Library/Fonts/Supplemental/AppleGothic.ttf"),
        ("ArialUnicode", "/System/Library/Fonts/Supplemental/Arial Unicode.ttf"),
        ("Arial", "/System/Library/Fonts/Supplemental/Arial.ttf"),
    ]
    for font_name, font_path in font_candidates:
        if not Path(font_path).exists():
            continue
        try:
            pdfmetrics.registerFont(TTFont(font_name, font_path))
            return font_name
        except Exception:
            continue
    return "Helvetica"


def draw_report(path: Path, title: str, subtitle: str, sections: list[tuple[str, list[str]]]) -> None:
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import mm
    from reportlab.pdfgen import canvas

    font_name = register_pdf_font()
    c = canvas.Canvas(str(path), pagesize=A4)
    width, height = A4
    x = 18 * mm
    y = height - 20 * mm

    c.setFont(font_name, 16)
    c.drawString(x, y, title)
    y -= 9 * mm
    c.setFont(font_name, 9)
    c.drawString(x, y, subtitle)
    y -= 11 * mm

    c.setStrokeColorRGB(0.2, 0.2, 0.2)
    c.line(x, y, width - x, y)
    y -= 9 * mm

    for heading, lines in sections:
        if y < 35 * mm:
            c.showPage()
            y = height - 20 * mm
        c.setFont(font_name, 12)
        c.drawString(x, y, heading)
        y -= 7 * mm
        c.setFont(font_name, 9)
        for line in lines:
            if y < 25 * mm:
                c.showPage()
                y = height - 20 * mm
                c.setFont(font_name, 9)
            c.drawString(x + 4 * mm, y, line)
            y -= 5.2 * mm
        y -= 4 * mm

    c.setFont(font_name, 8)
    c.drawString(x, 14 * mm, "SYNTHETIC MOCK DATA - not for diagnosis, treatment, or patient care.")
    c.save()


def write_glucose_pdf() -> None:
    path = RAW_DIR / "2026-04-10_2026-04-14-OOO 입원환자 연속혈당 리포트.pdf"
    sections = [
        (
            "Patient / Device",
            [
                "patient_id: MOCK-PATIENT-001",
                "date_range: 2026-04-10 to 2026-04-14",
                "device: MockCGM Pro Sensor",
                "context: optional wellness CGM snapshot, no diabetes diagnosis in fixture",
            ],
        ),
        (
            "Summary Metrics",
            [
                "average_glucose_mg_dl: 96",
                "estimated_gmi_percent: 5.3",
                "time_in_range_70_140_percent: 94",
                "time_in_range_70_180_percent: 99",
                "time_above_180_percent: 0",
                "time_below_70_percent: 1",
                "glucose_variability_cv_percent: 16",
                "largest_postprandial_rise: lunch on 2026-04-12, peak 136 mg/dL",
            ],
        ),
        (
            "Daily Pattern",
            [
                "2026-04-10: fasting 88, daytime peak 126 after lunch",
                "2026-04-11: fasting 90, steady overnight trace",
                "2026-04-12: fasting 91, brief post-lunch peak 136, returned to baseline",
                "2026-04-13: fasting 87, exercise walk associated with stable readings",
                "2026-04-14: fasting 89, average 95 with no sustained high or low episodes",
            ],
        ),
        (
            "RAG Extraction Targets",
            [
                "connect this report with WELLNESS_LABS HbA1c 5.2% in 2026",
                "compare CGM trend with fasting glucose values in HEALTHY_BASELINE and WELLNESS_LABS",
                "cite this PDF when answering normal glucose-variability questions",
            ],
        ),
    ]
    draw_report(path, "연속혈당 리포트 (Synthetic CGM Report)", "Healthy-range mock wellness report", sections)


def write_holter_pdf() -> None:
    path = RAW_DIR / "홀터리포트_샘플.pdf"
    sections = [
        (
            "Patient / Recording",
            [
                "patient_id: MOCK-PATIENT-001",
                "recording_start: 2026-03-21 09:30",
                "duration: 24 hours",
                "linked_context: routine wellness wearable cross-check",
                "indication: reassurance after consumer wearable flagged high exercise heart rate",
            ],
        ),
        (
            "Heart Rate Summary",
            [
                "minimum_hr_bpm: 52 at 04:12 during sleep",
                "average_hr_bpm: 72",
                "maximum_hr_bpm: 154 during interval cycling",
                "dominant_rhythm: sinus rhythm",
            ],
        ),
        (
            "Arrhythmia Findings",
            [
                "premature_atrial_complexes: 14 isolated beats",
                "premature_ventricular_complexes: 3 isolated beats",
                "supraventricular_tachycardia_runs: none",
                "atrial_fibrillation: not detected in this synthetic recording",
                "pause_over_2_seconds: none",
            ],
        ),
        (
            "Symptom Correlation",
            [
                "button_event_1: 2026-03-21 15:44, exercise marker, sinus tachycardia 132 bpm",
                "button_event_2: 2026-03-22 07:10, wake marker, sinus rhythm 64 bpm",
                "summary: healthy-range sinus rhythm with rare isolated ectopy in this fixture",
            ],
        ),
    ]
    draw_report(path, "홀터 리포트 (Synthetic Holter Report)", "Healthy-range mock ambulatory ECG report", sections)


def write_wellness_pdf() -> None:
    path = RAW_DIR / "2026-04-15_건강검진_웰니스_요약.pdf"
    sections = [
        (
            "Patient / Visit",
            [
                "patient_id: MOCK-PATIENT-001",
                "visit_date: 2026-04-15",
                "visit_type: routine wellness review",
                "facility: Hanbit Wellness Clinic",
            ],
        ),
        (
            "Vital Signs",
            [
                "blood_pressure_mm_hg: 110/69",
                "resting_hr_bpm: 61",
                "height_cm: 168.0",
                "weight_kg: 61.8",
                "bmi: 21.9 healthy_weight",
            ],
        ),
        (
            "Lab Snapshot",
            [
                "fasting_glucose_mg_dl: 90",
                "hba1c_percent: 5.2",
                "total_cholesterol_mg_dl: 181",
                "ldl_cholesterol_mg_dl: 95",
                "hdl_cholesterol_mg_dl: 66",
                "triglycerides_mg_dl: 88",
            ],
        ),
        (
            "Lifestyle Summary",
            [
                "average_steps_last_14_days: 9285",
                "average_sleep_minutes_last_14_days: 452",
                "exercise_pattern: brisk walking, yoga, light resistance, cycling commute",
                "smoking_status: never smoker",
                "alcohol_pattern: 0-1 drinks per week",
            ],
        ),
        (
            "RAG Extraction Targets",
            [
                "use this PDF as a compact cross-source wellness summary",
                "connect blood pressure with HOME_VITALS normal morning readings",
                "connect labs with WELLNESS_LABS 2026-04 panel",
                "connect lifestyle summary with ACTIVITY_SLEEP_NUTRITION records",
            ],
        ),
    ]
    draw_report(path, "건강검진 웰니스 요약 (Synthetic Wellness Summary)", "Healthy average adult mock report", sections)


def main() -> None:
    RAW_DIR.mkdir(parents=True, exist_ok=True)

    for filename in API_BACKED_LEGACY_FILES:
        (RAW_DIR / filename).unlink(missing_ok=True)

    write_json(RAW_DIR / "ADULT_PROFILE.json", make_adult_profile())
    write_json(RAW_DIR / "HOME_VITALS.json", make_home_vitals())
    write_json(RAW_DIR / "WELLNESS_LABS.json", make_wellness_labs())
    write_json(RAW_DIR / "ACTIVITY_SLEEP_NUTRITION.json", make_activity_sleep_nutrition())
    write_json(RAW_DIR / "PREVENTIVE_SCREENING.json", make_preventive_screening())
    write_json(RAW_DIR / "DENTAL_VISION.json", make_dental_vision())
    write_json(RAW_DIR / "MENTAL_WELLBEING.json", make_mental_wellbeing())
    write_json(RAW_DIR / "SELF_REPORTED_HISTORY.json", make_self_reported_history())
    write_json(RAW_DIR / "GUTINSIDE.json", make_microbiome())
    write_vcf_with_index()
    write_glucose_pdf()
    write_holter_pdf()
    write_wellness_pdf()

    generated = sorted(
        path.name
        for path in RAW_DIR.iterdir()
        if path.is_file() and path.name != ".gitkeep"
    )
    print(json.dumps({"raw_dir": str(RAW_DIR), "generated": generated}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()

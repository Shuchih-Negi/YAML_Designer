import uuid
from typing import Dict, List, Optional, Any
from datetime import datetime, timezone


FINLENS_CONTEXT_SCHEMA = {
    "tenant_id": "string (uuid)",
    "tenant_name": "string",
    "total_accounts": "integer",
    "consolidated_tier_1_metrics": {
        "total_credits": "number",
        "total_debits": "number",
        "net_cashflow": "number",
        "average_monthly_balance": "number",
        "credit_turnover_ratio": "number",
    },
    "monthly_analysis_summary": "array[{month: string, credits: number, debits: number, balance: number}]",
    "repayments": "array[{amount: number, date: string, type: string}]",
    "possible_repayments": "array[{amount: number, confidence: string, source_account: string}]",
    "possible_internal_transfers": "array[{amount: number, from: string, to: string, confidence: string}]",
    "disbursements": "array[{amount: number, date: string, recipient: string}]",
    "large_loan_disbursals": "array[{amount: number, date: string, loan_ref: string}]",
    "top_10_parties_with_highest_credits": "array[{party: string, total_credit: number, transaction_count: integer}]",
    "top_10_parties_with_highest_debits": "array[{party: string, total_debit: number, transaction_count: integer}]",
    "recurring_debits_tabular_summary": "array[{description: string, frequency: string, avg_amount: number, next_date: string}]",
    "declared_revenue": "number",
    "computed_revenue_signal": "object{value: number, confidence: string, source: string}",
    "WEIGHTS": "object{revenue_weight: number, credit_weight: number, debit_weight: number}",
    "THRESHOLDS": "object{large_txn: number, suspicious: number, approval: number}",
}


_TENANTS: List[Dict[str, Any]] = [
    {
        "tenant_id": "2bcf402b-1a2b-3c4d-5e6f-7a8b9c0d1e2f",
        "tenant_name": "Eastbridge Corp",
        "total_accounts": 4,
        "consolidated_tier_1_metrics": {
            "total_credits": 12_450_000.00,
            "total_debits": 9_870_000.00,
            "net_cashflow": 2_580_000.00,
            "average_monthly_balance": 3_200_000.00,
            "credit_turnover_ratio": 1.26,
        },
        "monthly_analysis_summary": [
            {"month": "2025-07", "credits": 1_850_000, "debits": 1_200_000, "balance": 3_100_000},
            {"month": "2025-08", "credits": 2_100_000, "debits": 1_450_000, "balance": 3_750_000},
            {"month": "2025-09", "credits": 1_950_000, "debits": 1_600_000, "balance": 4_100_000},
            {"month": "2025-10", "credits": 2_300_000, "debits": 1_800_000, "balance": 4_600_000},
            {"month": "2025-11", "credits": 1_750_000, "debits": 1_900_000, "balance": 4_450_000},
            {"month": "2025-12", "credits": 2_500_000, "debits": 1_920_000, "balance": 5_030_000},
        ],
        "repayments": [
            {"amount": 250_000, "date": "2025-11-15", "type": "scheduled"},
            {"amount": 250_000, "date": "2025-12-15", "type": "scheduled"},
        ],
        "possible_repayments": [
            {"amount": 150_000, "confidence": "high", "source_account": "INV-2025-089"},
            {"amount": 45_000, "confidence": "medium", "source_account": "INV-2025-092"},
        ],
        "possible_internal_transfers": [
            {"amount": 500_000, "from": "operating", "to": "reserve", "confidence": "high"},
        ],
        "disbursements": [
            {"amount": 1_200_000, "date": "2025-12-01", "recipient": "Vertex Suppliers Ltd"},
            {"amount": 850_000, "date": "2025-12-10", "recipient": "Pacific Logistics Inc"},
        ],
        "large_loan_disbursals": [],
        "top_10_parties_with_highest_credits": [
            {"party": "GlobalTrade AG", "total_credit": 3_200_000, "transaction_count": 12},
            {"party": "Pacific Logistics Inc", "total_credit": 1_800_000, "transaction_count": 8},
        ],
        "top_10_parties_with_highest_debits": [
            {"party": "Vertex Suppliers Ltd", "total_debit": 2_100_000, "transaction_count": 15},
            {"party": "Zenith Consulting", "total_debit": 980_000, "transaction_count": 6},
        ],
        "recurring_debits_tabular_summary": [
            {"description": "Office lease — Eastbridge Tower", "frequency": "monthly", "avg_amount": 120_000, "next_date": "2026-01-01"},
            {"description": "Cloud infrastructure — AWS", "frequency": "monthly", "avg_amount": 45_000, "next_date": "2026-01-05"},
        ],
        "declared_revenue": 14_200_000.00,
        "computed_revenue_signal": {"value": 13_850_000, "confidence": "high", "source": "credit_turnover_analysis"},
        "WEIGHTS": {"revenue_weight": 0.4, "credit_weight": 0.35, "debit_weight": 0.25},
        "THRESHOLDS": {"large_txn": 500_000, "suspicious": 100_000, "approval": 250_000},
    },
    {
        "tenant_id": "3a9c714c-2b3c-4d5e-6f7a-8b9c0d1e2f3a",
        "tenant_name": "Noble Healthcare Pvt Ltd",
        "total_accounts": 3,
        "consolidated_tier_1_metrics": {
            "total_credits": 8_750_000.00,
            "total_debits": 7_200_000.00,
            "net_cashflow": 1_550_000.00,
            "average_monthly_balance": 2_100_000.00,
            "credit_turnover_ratio": 1.22,
        },
        "monthly_analysis_summary": [
            {"month": "2025-07", "credits": 1_200_000, "debits": 950_000, "balance": 1_800_000},
            {"month": "2025-08", "credits": 1_450_000, "debits": 1_100_000, "balance": 2_150_000},
            {"month": "2025-09", "credits": 1_300_000, "debits": 1_050_000, "balance": 2_400_000},
            {"month": "2025-10", "credits": 1_600_000, "debits": 1_300_000, "balance": 2_700_000},
            {"month": "2025-11", "credits": 1_100_000, "debits": 1_400_000, "balance": 2_400_000},
            {"month": "2025-12", "credits": 2_100_000, "debits": 1_400_000, "balance": 3_100_000},
        ],
        "repayments": [
            {"amount": 180_000, "date": "2025-11-20", "type": "scheduled"},
            {"amount": 180_000, "date": "2025-12-20", "type": "scheduled"},
        ],
        "possible_repayments": [
            {"amount": 75_000, "confidence": "medium", "source_account": "INV-2025-156"},
        ],
        "possible_internal_transfers": [],
        "disbursements": [
            {"amount": 600_000, "date": "2025-12-05", "recipient": "MedSupply Corp"},
        ],
        "large_loan_disbursals": [
            {"amount": 2_000_000, "date": "2025-10-01", "loan_ref": "LN-2025-0042"},
        ],
        "top_10_parties_with_highest_credits": [
            {"party": "NHI Insurance", "total_credit": 2_800_000, "transaction_count": 24},
            {"party": "Govt Health Grant", "total_credit": 1_500_000, "transaction_count": 4},
        ],
        "top_10_parties_with_highest_debits": [
            {"party": "MedSupply Corp", "total_debit": 1_600_000, "transaction_count": 18},
        ],
        "recurring_debits_tabular_summary": [
            {"description": "Pharma inventory — MedSupply", "frequency": "biweekly", "avg_amount": 80_000, "next_date": "2026-01-03"},
            {"description": "Staff payroll", "frequency": "monthly", "avg_amount": 340_000, "next_date": "2026-01-01"},
        ],
        "declared_revenue": 9_500_000.00,
        "computed_revenue_signal": {"value": 9_100_000, "confidence": "high", "source": "credit_turnover_analysis"},
        "WEIGHTS": {"revenue_weight": 0.4, "credit_weight": 0.35, "debit_weight": 0.25},
        "THRESHOLDS": {"large_txn": 300_000, "suspicious": 75_000, "approval": 180_000},
    },
    {
        "tenant_id": "4b8d825c-3c4d-5e6f-7a8b-9c0d1e2f3a4b",
        "tenant_name": "Apex Manufacturing Ltd",
        "total_accounts": 5,
        "consolidated_tier_1_metrics": {
            "total_credits": 22_100_000.00,
            "total_debits": 18_400_000.00,
            "net_cashflow": 3_700_000.00,
            "average_monthly_balance": 5_800_000.00,
            "credit_turnover_ratio": 1.20,
        },
        "monthly_analysis_summary": [
            {"month": "2025-07", "credits": 3_200_000, "debits": 2_800_000, "balance": 5_200_000},
            {"month": "2025-08", "credits": 3_600_000, "debits": 3_100_000, "balance": 5_700_000},
            {"month": "2025-09", "credits": 3_400_000, "debits": 3_000_000, "balance": 6_100_000},
            {"month": "2025-10", "credits": 4_100_000, "debits": 3_300_000, "balance": 6_900_000},
            {"month": "2025-11", "credits": 3_800_000, "debits": 3_200_000, "balance": 7_500_000},
            {"month": "2025-12", "credits": 4_000_000, "debits": 3_000_000, "balance": 8_500_000},
        ],
        "repayments": [
            {"amount": 500_000, "date": "2025-11-10", "type": "scheduled"},
            {"amount": 500_000, "date": "2025-12-10", "type": "scheduled"},
        ],
        "possible_repayments": [],
        "possible_internal_transfers": [
            {"amount": 1_000_000, "from": "operating", "to": "capital_expenditure", "confidence": "high"},
            {"amount": 250_000, "from": "reserve", "to": "operating", "confidence": "medium"},
        ],
        "disbursements": [
            {"amount": 2_500_000, "date": "2025-12-02", "recipient": "RawMart Industries"},
            {"amount": 1_800_000, "date": "2025-12-15", "recipient": "ExportHaul Logistics"},
        ],
        "large_loan_disbursals": [
            {"amount": 5_000_000, "date": "2025-09-15", "loan_ref": "LN-2025-0031"},
        ],
        "top_10_parties_with_highest_credits": [
            {"party": "ExportMart USA", "total_credit": 6_500_000, "transaction_count": 28},
            {"party": "Domestic Retail Corp", "total_credit": 4_200_000, "transaction_count": 35},
        ],
        "top_10_parties_with_highest_debits": [
            {"party": "RawMart Industries", "total_debit": 5_100_000, "transaction_count": 42},
            {"party": "MechServe Engineering", "total_debit": 2_300_000, "transaction_count": 12},
        ],
        "recurring_debits_tabular_summary": [
            {"description": "Raw materials — RawMart", "frequency": "weekly", "avg_amount": 120_000, "next_date": "2026-01-02"},
            {"description": "Warehouse lease", "frequency": "monthly", "avg_amount": 200_000, "next_date": "2026-01-01"},
            {"description": "Logistics — ExportHaul", "frequency": "biweekly", "avg_amount": 90_000, "next_date": "2026-01-06"},
        ],
        "declared_revenue": 24_000_000.00,
        "computed_revenue_signal": {"value": 23_200_000, "confidence": "high", "source": "credit_turnover_analysis"},
        "WEIGHTS": {"revenue_weight": 0.4, "credit_weight": 0.35, "debit_weight": 0.25},
        "THRESHOLDS": {"large_txn": 1_000_000, "suspicious": 200_000, "approval": 500_000},
    },
]


def search_tenants(query: str) -> List[Dict[str, Any]]:
    q = query.lower().strip()
    if not q:
        return [
            {"tenant_id": t["tenant_id"], "tenant_name": t["tenant_name"], "total_accounts": t["total_accounts"]}
            for t in _TENANTS
        ]
    return [
        {"tenant_id": t["tenant_id"], "tenant_name": t["tenant_name"], "total_accounts": t["total_accounts"]}
        for t in _TENANTS
        if q in t["tenant_name"].lower()
    ]


def get_tenant_context(tenant_id: str) -> Optional[Dict[str, Any]]:
    for t in _TENANTS:
        if t["tenant_id"] == tenant_id:
            return dict(t)
    return None

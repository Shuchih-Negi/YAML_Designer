import pytest
from services.context_service import (
    validate_context_data,
    compute_derived_metrics,
    build_context_schema,
    context_to_initial_context,
)

SAMPLE_CONTEXT = {
    "account_holder": "John Doe",
    "account_number": "1234567890",
    "bank_name": "Test Bank",
    "closing_balance": 50000.00,
    "average_balance": 35000.00,
    "transaction_count": 45,
    "transactions": [
        {"date": "2025-01-15", "description": "Salary", "amount": 150000, "type": "credit", "category": "salary"},
        {"date": "2025-01-20", "description": "Rent", "amount": -25000, "type": "debit", "category": "housing"},
        {"date": "2025-02-10", "description": "SWIFT transfer received", "amount": 500000, "type": "credit", "category": "international_transfer"},
    ],
}


def test_validate_valid_context():
    errors = validate_context_data(SAMPLE_CONTEXT)
    assert errors == []

def test_validate_missing_required():
    errors = validate_context_data({})
    assert len(errors) > 0

def test_compute_derived_metrics():
    result = compute_derived_metrics(SAMPLE_CONTEXT)
    assert "derived_metrics" in result
    assert "risk_flags" in result["derived_metrics"]
    assert "international_transfers" in result["derived_metrics"]["risk_flags"]

def test_build_context_schema():
    schema = build_context_schema(SAMPLE_CONTEXT)
    assert "account_holder" in schema
    assert schema["account_holder"] == "string"
    assert "closing_balance" in schema
    assert schema["closing_balance"] == "number"

def test_context_to_initial_context():
    enriched = compute_derived_metrics(SAMPLE_CONTEXT)
    ic = context_to_initial_context(enriched)
    assert "applicant_name" in ic
    assert ic["applicant_name"] == "John Doe"
    assert "risk_flag" in ic
    assert ic["risk_flag"] == "high"
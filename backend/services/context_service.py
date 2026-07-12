from typing import Dict, List, Any, Optional

BANK_STATEMENT_SCHEMA = {
    "account_holder": "string",
    "account_number": "string",
    "bank_name": "string",
    "statement_period_start": "date",
    "statement_period_end": "date",
    "opening_balance": "number",
    "closing_balance": "number",
    "total_deposits": "number",
    "total_withdrawals": "number",
    "transaction_count": "integer",
    "average_balance": "number",
    "transactions": [
        {
            "date": "date",
            "description": "string",
            "amount": "number",
            "type": "string",
            "category": "string",
            "reference": "string",
        }
    ],
    "derived_metrics": {
        "large_deposits_count": "integer",
        "large_withdrawals_count": "integer",
        "international_transfers_count": "integer",
        "bounced_cheques_count": "integer",
        "average_daily_balance": "number",
        "credit_turnover": "number",
        "debit_turnover": "number",
        "overdraft_days": "integer",
        "risk_flags": ["string"],
    }
}


def validate_context_data(data: dict) -> List[str]:
    errors = []
    if not isinstance(data, dict):
        return ["Context data must be a JSON object"]

    if "account_holder" not in data:
        errors.append("Missing required field: account_holder")
    if "transactions" not in data:
        errors.append("Missing required field: transactions")
    elif not isinstance(data["transactions"], list):
        errors.append("transactions must be an array")

    if "derived_metrics" in data and not isinstance(data["derived_metrics"], dict):
        errors.append("derived_metrics must be an object")

    return errors


def normalize_transaction_amounts(data: dict) -> dict:
    result = dict(data)
    if "transactions" in result:
        result["transactions"] = [
            {**t, "amount": float(t["amount"])} if isinstance(t.get("amount"), (int, float)) else t
            for t in result["transactions"]
        ]
    return result


def compute_derived_metrics(data: dict) -> dict:
    result = dict(data)
    transactions = data.get("transactions", [])
    if not transactions:
        result["derived_metrics"] = {"risk_flags": ["no_transactions"]}
        return result

    large_deposits = [t for t in transactions if t.get("amount", 0) > 0 and t["amount"] >= 100000]
    large_withdrawals = [t for t in transactions if t.get("amount", 0) < 0 and abs(t["amount"]) >= 100000]
    intl_transfers = [t for t in transactions if "international" in t.get("category", "").lower() or "swift" in t.get("description", "").lower()]
    bounced = [t for t in transactions if "bounce" in t.get("description", "").lower() or "dishonour" in t.get("description", "").lower()]

    credit_turnover = sum(t["amount"] for t in transactions if t.get("amount", 0) > 0)
    debit_turnover = abs(sum(t["amount"] for t in transactions if t.get("amount", 0) < 0))

    risk_flags = []
    if large_deposits:
        risk_flags.append("large_deposits")
    if intl_transfers:
        risk_flags.append("international_transfers")
    if bounced:
        risk_flags.append("bounced_cheques")

    result["derived_metrics"] = {
        "large_deposits_count": len(large_deposits),
        "large_withdrawals_count": len(large_withdrawals),
        "international_transfers_count": len(intl_transfers),
        "bounced_cheques_count": len(bounced),
        "credit_turnover": credit_turnover,
        "debit_turnover": debit_turnover,
        "risk_flags": risk_flags,
    }
    return result


def build_context_schema(data: dict) -> Dict[str, str]:
    schema = {}
    for key, value in data.items():
        if isinstance(value, str):
            schema[key] = "string"
        elif isinstance(value, bool):
            schema[key] = "boolean"
        elif isinstance(value, int):
            schema[key] = "integer"
        elif isinstance(value, float):
            schema[key] = "number"
        elif isinstance(value, list):
            schema[key] = f"array[{type(value[0]).__name__}]" if value else "array"
        elif isinstance(value, dict):
            nested = build_context_schema(value)
            for nk, nv in nested.items():
                schema[f"{key}.{nk}"] = nv
    return schema


def context_to_initial_context(source: dict) -> Dict[str, Any]:
    metrics = source.get("derived_metrics", {})
    return {
        "applicant_name": source.get("account_holder", ""),
        "account_balance": source.get("closing_balance", 0),
        "avg_monthly_balance": source.get("average_balance", 0),
        "transaction_count": source.get("transaction_count", 0),
        "large_deposits": metrics.get("large_deposits_count", 0),
        "international_transfers": metrics.get("international_transfers_count", 0) > 0,
        "risk_flag": "high" if len(metrics.get("risk_flags", [])) > 1 else "low",
        "credit_turnover": metrics.get("credit_turnover", 0),
        "debit_turnover": metrics.get("debit_turnover", 0),
    }
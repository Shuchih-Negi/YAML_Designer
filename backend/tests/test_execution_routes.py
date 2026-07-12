from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

SAMPLE_CONTEXT = {
    "account_holder": "John Doe",
    "account_number": "1234567890",
    "bank_name": "Test Bank",
    "closing_balance": 50000.00,
    "transactions": [
        {"date": "2025-01-15", "description": "Salary", "amount": 150000, "type": "credit", "category": "salary"},
    ],
}


def test_upload_context_valid():
    response = client.post("/context/upload", json={"context_data": SAMPLE_CONTEXT})
    assert response.status_code == 200
    data = response.json()
    assert data["validated"] is True
    assert "derived_metrics" in data
    assert "initial_context" in data


def test_upload_context_invalid():
    response = client.post("/context/upload", json={"context_data": {}})
    assert response.status_code == 422


def test_generate_from_context():
    response = client.post("/context/generate", json={
        "context_data": SAMPLE_CONTEXT,
        "agent_id": "test_context_agent",
        "agent_name": "Test Context Agent",
        "agent_description": "Generated from test",
    })
    assert response.status_code == 200
    data = response.json()
    assert data["agent_id"] == "test_context_agent"
    assert data["saved"] is True
    assert "agent.yaml" in data["files"]
    assert "workflow_context_review.yaml" in data["files"]


def test_run_test():
    response = client.post("/agents/loan_review_agent/tests/test_basic_loan_review/run", json={})
    assert response.status_code == 200
    data = response.json()
    assert "execution_id" in data
    assert "trace" in data


def test_list_executions():
    response = client.get("/agents/loan_review_agent/executions")
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_run_all_tests():
    response = client.post("/agents/loan_review_agent/tests/run-all", json={})
    assert response.status_code == 200
    data = response.json()
    assert "results" in data
    assert "total" in data
    assert "passed" in data


def test_get_nonexistent_execution():
    response = client.get("/agents/loan_review_agent/executions/nonexistent")
    assert response.status_code == 404
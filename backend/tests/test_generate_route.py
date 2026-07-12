from unittest.mock import patch, AsyncMock
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

MOCK_RESPONSE = {
    "agent.yaml": "agent_id: mock_agent\nname: Mock Agent\nsub_agents: []\nworkflows: []\n"
}

def test_generate_returns_files():
    with patch('services.gemini_service.call_gemini', new_callable=AsyncMock) as mock:
        mock.return_value = MOCK_RESPONSE
        response = client.post("/generate", json={"description": "A simple test agent"})
        assert response.status_code == 200
        assert "agent.yaml" in response.json()["files"]

def test_generate_saves_agent():
    with patch('services.gemini_service.call_gemini', new_callable=AsyncMock) as mock:
        mock.return_value = MOCK_RESPONSE
        client.post("/generate", json={"description": "A simple test agent"})
        list_response = client.get("/agents")
        agent_ids = [a["agent_id"] for a in list_response.json()]
        assert "mock_agent" in agent_ids

def test_generate_empty_description_returns_422():
    response = client.post("/generate", json={"description": ""})
    assert response.status_code == 422

def test_generate_mocked_failure():
    with patch('services.gemini_service.call_gemini', new_callable=AsyncMock) as mock:
        mock.side_effect = ValueError("API error")
        response = client.post("/generate", json={"description": "test"})
        assert response.status_code == 500
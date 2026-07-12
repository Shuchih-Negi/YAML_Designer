import io
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

AGENT_YAML = b"agent_id: test_agent\nname: Test Agent\nsub_agents: []\nworkflows: []\n"

def test_list_agents_empty():
    response = client.get("/agents")
    assert response.status_code == 200
    assert isinstance(response.json(), list)

def test_upload_valid_package():
    files = [("files", ("agent.yaml", io.BytesIO(AGENT_YAML), "application/x-yaml"))]
    response = client.post("/agents/upload", files=files)
    assert response.status_code == 200
    assert response.json()["agent_id"] == "test_agent"

def test_upload_invalid_yaml_returns_422():
    bad_yaml = b"name: [missing agent_id"
    files = [("files", ("agent.yaml", io.BytesIO(bad_yaml), "application/x-yaml"))]
    response = client.post("/agents/upload", files=files)
    assert response.status_code == 422

def test_get_agent_after_upload():
    files = [("files", ("agent.yaml", io.BytesIO(AGENT_YAML), "application/x-yaml"))]
    client.post("/agents/upload", files=files)
    response = client.get("/agents/test_agent")
    assert response.status_code == 200
    assert response.json()["agent"]["name"] == "Test Agent"

def test_get_nonexistent_agent_returns_404():
    response = client.get("/agents/does_not_exist")
    assert response.status_code == 404

def test_delete_agent():
    files = [("files", ("agent.yaml", io.BytesIO(AGENT_YAML), "application/x-yaml"))]
    client.post("/agents/upload", files=files)
    response = client.delete("/agents/test_agent")
    assert response.status_code == 200
    assert client.get("/agents/test_agent").status_code == 404
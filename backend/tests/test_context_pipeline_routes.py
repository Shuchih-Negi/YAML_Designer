import pytest
from unittest.mock import patch, AsyncMock
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

MOCK_FILES = {
    "agent.yaml": "agent_id: test_pipeline_agent\nname: Test Pipeline Agent\ndescription: Generated via pipeline\nsub_agents: []\nworkflows:\n  - wf_main\n",
    "workflow_wf_main.yaml": "workflow_id: wf_main\nname: Main Workflow\ndescription: Main flow\nnodes:\n  - id: start\n    type: show_message\n    message: Hello\n    next: end\n  - id: end\n    type: finish\n    message: Done\nedges:\n  - from: start\n    to: end\n",
}

MOCK_PIPELINE_RESULT = {
    "files": MOCK_FILES,
    "planner_summary": "Agent: test_pipeline_agent — Test Pipeline Agent with 1 workflows and 0 sub-agents",
    "intake_result": {"context_profile": {}},
    "plan": {"agent_id": "test_pipeline_agent"},
    "failed_step": None,
    "failure_reason": None,
}

PIPELINE_PATH = "routes.context_pipeline.run_pipeline"


def _create_draft(description="Test agent"):
    with patch(PIPELINE_PATH, new_callable=AsyncMock) as mock:
        mock.return_value = MOCK_PIPELINE_RESULT
        resp = client.post("/context-pipeline/generate", json={"description": description})
        assert resp.status_code == 200
        return resp.json()["draft_id"]


class TestGeneratePipeline:
    def test_generate_success(self):
        with patch(PIPELINE_PATH, new_callable=AsyncMock) as mock:
            mock.return_value = MOCK_PIPELINE_RESULT
            response = client.post(
                "/context-pipeline/generate",
                json={"description": "An agent that tests things"},
            )
            assert response.status_code == 200
            data = response.json()
            assert "draft_id" in data
            assert data["files"] == MOCK_FILES
            assert "planner_summary" in data

    def test_generate_empty_description(self):
        response = client.post("/context-pipeline/generate", json={"description": ""})
        assert response.status_code == 422

    def test_generate_pipeline_failure(self):
        with patch(PIPELINE_PATH, new_callable=AsyncMock) as mock:
            mock.return_value = {
                **MOCK_PIPELINE_RESULT,
                "failed_step": "architect",
                "failure_reason": "Gemini returned malformed YAML",
            }
            response = client.post(
                "/context-pipeline/generate",
                json={"description": "An agent that tests things"},
            )
            assert response.status_code == 502
            detail = response.json()["detail"]
            assert detail["failed_step"] == "architect"
            assert "malformed" in detail["reason"]

    def test_generate_with_context_data(self):
        with patch(PIPELINE_PATH, new_callable=AsyncMock) as mock:
            mock.return_value = MOCK_PIPELINE_RESULT
            response = client.post(
                "/context-pipeline/generate",
                json={
                    "description": "Expense review agent",
                    "context_data": {"amount": 500, "employee_id": "EMP-001"},
                    "agent_name": "expense_reviewer",
                },
            )
            assert response.status_code == 200
            assert response.json()["draft_id"]


class TestValidateDraft:
    def test_validate_valid_files(self):
        draft_id = _create_draft()
        response = client.post(
            f"/context-pipeline/{draft_id}/validate",
            json={"files": MOCK_FILES},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["valid"] is True
        assert data["errors"] == []

    def test_validate_invalid_files(self):
        draft_id = _create_draft()
        bad_files = {"agent.yaml": "name: Missing agent_id field"}
        response = client.post(
            f"/context-pipeline/{draft_id}/validate",
            json={"files": bad_files},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["valid"] is False
        assert len(data["errors"]) > 0

    def test_validate_nonexistent_draft(self):
        response = client.post(
            "/context-pipeline/nonexistent/validate",
            json={"files": MOCK_FILES},
        )
        assert response.status_code == 404


class TestPublishDraft:
    def test_publish_success(self):
        draft_id = _create_draft()
        response = client.post(
            f"/context-pipeline/{draft_id}/publish",
            json={"files": MOCK_FILES},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["agent_id"] == "test_pipeline_agent"

        get_response = client.get("/agents/test_pipeline_agent")
        assert get_response.status_code == 200

    def test_publish_invalid_files(self):
        draft_id = _create_draft()
        bad_files = {"agent.yaml": "name: No agent_id here"}
        response = client.post(
            f"/context-pipeline/{draft_id}/publish",
            json={"files": bad_files},
        )
        assert response.status_code == 422

    def test_publish_nonexistent_draft(self):
        response = client.post(
            "/context-pipeline/nonexistent/publish",
            json={"files": MOCK_FILES},
        )
        assert response.status_code == 404

    def test_publish_no_agent_yaml(self):
        draft_id = _create_draft()
        no_agent = {"random.yaml": "key: value"}
        response = client.post(
            f"/context-pipeline/{draft_id}/publish",
            json={"files": no_agent},
        )
        assert response.status_code == 422


class TestDownloadDraft:
    def test_download_returns_zip(self):
        draft_id = _create_draft("Download test")
        response = client.get(f"/context-pipeline/{draft_id}/download")
        assert response.status_code == 200
        assert response.headers["content-type"] == "application/zip"
        assert ".zip" in response.headers.get("content-disposition", "")

    def test_download_nonexistent_draft(self):
        response = client.get("/context-pipeline/nonexistent/download")
        assert response.status_code == 404


class TestHilVerificationLoop:
    def test_verify_passes_valid_draft(self):
        draft_id = _create_draft("HIL verify pass")
        with patch("pipeline.nodes.critic.run_critic_check", new_callable=AsyncMock) as mock_check:
            mock_check.return_value = {"pass": True, "issues": []}
            response = client.post(
                f"/context-pipeline/{draft_id}/verify",
                json={"files": MOCK_FILES},
            )
            assert response.status_code == 200
            data = response.json()
            assert data["pass"] is True
            assert data["issues"] == []

    def test_verify_fails_with_issues(self):
        draft_id = _create_draft("HIL verify fail")
        issues = [{"file": "agent.yaml", "message": "Missing description field"}]
        with (
            patch("pipeline.nodes.critic.run_critic_check", new_callable=AsyncMock) as mock_check,
            patch("pipeline.nodes.critic.generate_fix_suggestion", new_callable=AsyncMock) as mock_fix,
        ):
            mock_check.return_value = {"pass": False, "issues": issues}
            mock_fix.return_value = {"agent.yaml": "description: fixed"}
            response = client.post(
                f"/context-pipeline/{draft_id}/verify",
                json={"files": MOCK_FILES},
            )
            assert response.status_code == 200
            data = response.json()
            assert data["pass"] is False
            assert data["issues"] == issues
            assert data["suggested_fix"] is not None

    def test_verify_nonexistent_draft(self):
        response = client.post(
            "/context-pipeline/nonexistent/verify",
            json={"files": MOCK_FILES},
        )
        assert response.status_code == 404

    def test_apply_fix_updates_draft(self):
        draft_id = _create_draft("HIL apply fix")
        updated_files = dict(MOCK_FILES)
        updated_files["agent.yaml"] = "agent_id: test_updated\nname: Updated\nsub_agents: []\nworkflows:\n  - wf_main\n"
        response = client.post(
            f"/context-pipeline/{draft_id}/apply-fix",
            json={"files": updated_files},
        )
        assert response.status_code == 200
        assert response.json()["status"] == "fix_applied"

    def test_apply_fix_nonexistent_draft(self):
        response = client.post(
            "/context-pipeline/nonexistent/apply-fix",
            json={"files": MOCK_FILES},
        )
        assert response.status_code == 404

    def test_approve_sets_status(self):
        draft_id = _create_draft("HIL approve")
        response = client.post(f"/context-pipeline/{draft_id}/approve")
        assert response.status_code == 200
        assert response.json()["status"] == "approved"

    def test_approve_nonexistent_draft(self):
        response = client.post("/context-pipeline/nonexistent/approve")
        assert response.status_code == 404

    def test_verify_increments_iteration(self):
        draft_id = _create_draft("HIL iteration")
        with patch("pipeline.nodes.critic.run_critic_check", new_callable=AsyncMock) as mock_check:
            mock_check.return_value = {"pass": False, "issues": [{"file": "x.yaml", "message": "issue"}]}
            with patch("pipeline.nodes.critic.generate_fix_suggestion", new_callable=AsyncMock) as mock_fix:
                mock_fix.return_value = {"x.yaml": "fixed"}
                resp1 = client.post(f"/context-pipeline/{draft_id}/verify", json={"files": MOCK_FILES})
                assert resp1.status_code == 200

                resp2 = client.post(f"/context-pipeline/{draft_id}/verify", json={"files": MOCK_FILES})
                assert resp2.status_code == 200

                from pipeline.state import get_draft
                draft = get_draft(draft_id)
                assert draft is not None
                assert draft.iteration_count == 2

    def test_verify_generates_fix_suggestion_on_failure(self):
        draft_id = _create_draft("HIL fix suggestion")
        issues = [{"file": "agent.yaml", "message": "No description"}]
        with (
            patch("pipeline.nodes.critic.run_critic_check", new_callable=AsyncMock) as mock_check,
            patch("pipeline.nodes.critic.generate_fix_suggestion", new_callable=AsyncMock) as mock_fix,
        ):
            mock_check.return_value = {"pass": False, "issues": issues}
            mock_fix.return_value = {"agent.yaml": "description: added"}
            response = client.post(
                f"/context-pipeline/{draft_id}/verify",
                json={"files": MOCK_FILES},
            )
            assert response.status_code == 200
            data = response.json()
            assert data["suggested_fix"] == {"agent.yaml": "description: added"}


class TestGenerateValidatePublishRoundTrip:
    def test_full_round_trip(self):
        with patch(PIPELINE_PATH, new_callable=AsyncMock) as mock:
            mock.return_value = MOCK_PIPELINE_RESULT
            gen_resp = client.post(
                "/context-pipeline/generate",
                json={"description": "Round trip test"},
            )
            assert gen_resp.status_code == 200
            draft_id = gen_resp.json()["draft_id"]

        validate_resp = client.post(
            f"/context-pipeline/{draft_id}/validate",
            json={"files": MOCK_FILES},
        )
        assert validate_resp.status_code == 200
        assert validate_resp.json()["valid"] is True

        publish_resp = client.post(
            f"/context-pipeline/{draft_id}/publish",
            json={"files": MOCK_FILES},
        )
        assert publish_resp.status_code == 200
        agent_id = publish_resp.json()["agent_id"]

        get_resp = client.get(f"/agents/{agent_id}")
        assert get_resp.status_code == 200
        assert get_resp.json()["agent"]["name"] == "Test Pipeline Agent"

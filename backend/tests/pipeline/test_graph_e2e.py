import pytest
from unittest.mock import patch, AsyncMock


MOCK_INTAKE_RESULT = {
    "summary": "Test agent for expense review",
    "agent_name": "expense_review_agent",
    "agent_description": "Reviews expenses",
    "sub_agents_needed": [],
    "workflows_needed": [{"name": "main", "purpose": "Main flow"}],
    "context_fields": [],
    "flagged_errors": [],
}

MOCK_PLAN = {
    "agent_id": "expense_review_agent",
    "agent_name": "Expense Review Agent",
    "agent_description": "Reviews expense reports",
    "sub_agents": [],
    "workflows": [{"workflow_id": "wf_main", "name": "Main Workflow", "description": "Main flow", "context_schema": {"amount": "number"}, "node_count_estimate": 3}],
}

MOCK_ARCHITECT_FILES = {
    "agent.yaml": "agent_id: expense_review_agent\nname: Expense Review Agent\ndescription: Reviews expenses\nsub_agents: []\nworkflows:\n  - wf_main\n",
    "workflow_wf_main.yaml": "workflow_id: wf_main\nname: Main Workflow\ndescription: Main flow\nnodes:\n  - id: start\n    type: show_message\n    message: Starting\n    next: end\n  - id: end\n    type: finish\n    message: Done\nedges:\n  - from: start\n    to: end\n",
}

MOCK_STUB_FILES = {
    "test_wf_main.yaml": "test_id: test_wf_main\nname: Main Test\ninitial_context:\n  amount: 500\nmessages:\n  - OK\nstub_overrides: {}\nexpected_final_message: Done\nexpected_status: completed\n",
}

MOCK_CRITIC_PASS = {"pass": True, "issues": []}


@pytest.mark.asyncio
async def test_full_pipeline_e2e():
    from pipeline.graph import run_pipeline

    with patch("pipeline.llm.call_pipeline_llm_json", new_callable=AsyncMock) as mock:
        mock.side_effect = [MOCK_INTAKE_RESULT, MOCK_PLAN, MOCK_ARCHITECT_FILES, MOCK_STUB_FILES, MOCK_CRITIC_PASS]

        result = await run_pipeline(
            description="An agent that reviews expense reports",
            context_data={"amount": 500},
        )

        assert result["failed_step"] is None
        assert result["failure_reason"] is None
        assert result["files"] is not None
        assert "agent.yaml" in result["files"]
        assert result["critic_result"]["pass"] is True
        assert result["planner_summary"] is not None


@pytest.mark.asyncio
async def test_pipeline_critic_retry():
    from pipeline.graph import run_pipeline

    MOCK_CRITIC_FAIL = {"pass": False, "issues": [{"file": "workflow_wf_main.yaml", "message": "Dangling node reference"}]}
    MOCK_ARCHITECT_FILES_2 = {
        "agent.yaml": "agent_id: expense_review_agent\nname: Expense Review Agent\ndescription: Reviews expenses (fixed)\nsub_agents: []\nworkflows:\n  - wf_main\n",
        "workflow_wf_main.yaml": "workflow_id: wf_main\nname: Main Workflow\nnodes:\n  - id: start\n    type: show_message\n    message: Starting\n    next: end\n  - id: end\n    type: finish\n    message: Done\nedges:\n  - from: start\n    to: end\n",
    }

    with patch("pipeline.llm.call_pipeline_llm_json", new_callable=AsyncMock) as mock:
        mock.side_effect = [
            MOCK_INTAKE_RESULT,
            MOCK_PLAN,
            MOCK_ARCHITECT_FILES,
            MOCK_STUB_FILES,
            MOCK_CRITIC_FAIL,
            MOCK_ARCHITECT_FILES_2,
            MOCK_STUB_FILES,
            MOCK_CRITIC_PASS,
        ]

        result = await run_pipeline(
            description="An agent that reviews expense reports",
        )

        assert result["failed_step"] is None
        assert result["critic_result"]["pass"] is True
        assert result["retry_count"] == 2


@pytest.mark.asyncio
async def test_pipeline_reports_node_failure():
    from pipeline.graph import run_pipeline

    with patch("pipeline.llm.call_pipeline_llm_json", new_callable=AsyncMock) as mock:
        mock.side_effect = ValueError("Gemini API error: 429")

        result = await run_pipeline(
            description="An agent that reviews expense reports",
        )

        assert result["failed_step"] == "intake"
        assert "429" in result["failure_reason"]

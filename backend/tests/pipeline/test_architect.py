import pytest
from unittest.mock import patch, AsyncMock


MOCK_ARCHITECT_FILES = {
    "agent.yaml": "agent_id: expense_review_agent\nname: Expense Review Agent\ndescription: Reviews expense reports\nsub_agents:\n  - policy_checker\nworkflows:\n  - workflow_main_review",
    "sub_agent_policy_checker.yaml": "sub_agent_id: policy_checker\nname: Policy Checker\ndescription: Checks policy\nworkflows:\n  - workflow_check_policy",
    "workflow_main_review.yaml": "workflow_id: workflow_main_review\nname: Main Review Workflow\ndescription: Main review flow\nnodes:\n  - id: start\n    type: show_message\n    message: Starting review\n    next: check_amount\n  - id: check_amount\n    type: condition\n    condition: expense_amount > 1000\n    on_true: flag_review\n    on_false: auto_approve\n  - id: flag_review\n    type: run_stub\n    stub_id: stub_manual_review\n    next: finish\n  - id: auto_approve\n    type: finish\n    message: Auto-approved\n  - id: finish\n    type: finish\n    message: Review complete\nedges:\n  - from: start\n    to: check_amount\n  - from: check_amount\n    to: flag_review\n    condition: expense_amount > 1000\n  - from: check_amount\n    to: auto_approve\n    condition: expense_amount <= 1000\n  - from: flag_review\n    to: finish\n",
    "workflow_check_policy.yaml": "workflow_id: workflow_check_policy\nname: Check Policy Workflow\ndescription: Validates against policy\nnodes:\n  - id: start\n    type: show_message\n    message: Checking policy\n    next: end\n  - id: end\n    type: finish\n    message: Policy checked\nedges:\n  - from: start\n    to: end\n",
}


@pytest.mark.asyncio
async def test_architect_returns_files():
    from pipeline.nodes.architect import architect_node

    plan = {
        "agent_id": "expense_review_agent",
        "agent_name": "Expense Review Agent",
        "agent_description": "Reviews expense reports",
        "sub_agents": [{"sub_agent_id": "policy_checker", "name": "Policy Checker", "description": "Checks policy", "workflows": ["workflow_check_policy"]}],
        "workflows": [{"workflow_id": "workflow_main_review", "name": "Main Review", "description": "Main flow", "node_count_estimate": 5}],
    }

    with patch("pipeline.llm.call_pipeline_llm_json", new_callable=AsyncMock) as mock:
        mock.return_value = MOCK_ARCHITECT_FILES
        files = await architect_node(plan)

        assert "agent.yaml" in files
        assert "workflow_main_review.yaml" in files or any("workflow" in f for f in files)
        assert len(files) >= 2


@pytest.mark.asyncio
async def test_architect_files_are_strings():
    from pipeline.nodes.architect import architect_node

    plan = {"agent_id": "test", "agent_name": "Test", "agent_description": "Test", "sub_agents": [], "workflows": [{"workflow_id": "wf1", "name": "WF1", "description": "Test", "node_count_estimate": 3}]}

    with patch("pipeline.llm.call_pipeline_llm_json", new_callable=AsyncMock) as mock:
        mock.return_value = MOCK_ARCHITECT_FILES
        files = await architect_node(plan)

        for value in files.values():
            assert isinstance(value, str)

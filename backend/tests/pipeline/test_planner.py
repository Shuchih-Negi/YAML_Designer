import pytest
from unittest.mock import patch, AsyncMock


MOCK_PLAN = {
    "agent_id": "expense_review_agent",
    "agent_name": "Expense Review Agent",
    "agent_description": "Reviews employee expense reports against company policy",
    "sub_agents": [
        {"sub_agent_id": "policy_checker", "name": "Policy Checker", "description": "Validates expenses against policy rules", "workflows": ["workflow_check_policy"]}
    ],
    "workflows": [
        {"workflow_id": "workflow_main_review", "name": "Main Review Workflow", "description": "Orchestrates the full expense review", "context_schema": {"expense_amount": "number", "employee_id": "string"}, "node_count_estimate": 5},
        {"workflow_id": "workflow_check_policy", "name": "Check Policy Workflow", "description": "Validates against policy limits", "context_schema": {"expense_amount": "number"}, "node_count_estimate": 3},
    ],
}


@pytest.mark.asyncio
async def test_planner_returns_plan():
    from pipeline.nodes.planner import planner_node

    intake_result = {
        "summary": "An agent that reviews expense reports",
        "agent_name": "expense_review_agent",
        "agent_description": "Reviews expense reports",
        "sub_agents_needed": [{"name": "policy_checker", "purpose": "Check policy"}],
        "workflows_needed": [{"name": "main_review", "purpose": "Main flow"}],
        "context_fields": [],
    }

    with patch("pipeline.llm.call_pipeline_llm_json", new_callable=AsyncMock) as mock:
        mock.return_value = MOCK_PLAN
        plan = await planner_node(intake_result)

        assert plan["agent_id"] == "expense_review_agent"
        assert len(plan["sub_agents"]) == 1
        assert len(plan["workflows"]) == 2


@pytest.mark.asyncio
async def test_planner_sub_agents_referenced_in_workflows():
    from pipeline.nodes.planner import planner_node

    intake_result = {"summary": "Test", "agent_name": "test", "agent_description": "Test", "sub_agents_needed": [], "workflows_needed": [], "context_fields": []}
    plan = {
        "agent_id": "test_agent",
        "agent_name": "Test Agent",
        "agent_description": "Test",
        "sub_agents": [],
        "workflows": [{"workflow_id": "wf_main", "name": "Main", "description": "Main flow", "node_count_estimate": 3}],
    }

    with patch("pipeline.llm.call_pipeline_llm_json", new_callable=AsyncMock) as mock:
        mock.return_value = plan
        result = await planner_node(intake_result)

        wf_ids = {w["workflow_id"] for w in result["workflows"]}
        assert "wf_main" in wf_ids

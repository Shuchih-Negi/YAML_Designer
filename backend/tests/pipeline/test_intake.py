import pytest
from unittest.mock import patch, AsyncMock


MOCK_INTAKE_VALID = {
    "summary": "An agent that reviews expense reports",
    "agent_name": "expense_review_agent",
    "agent_description": "Reviews expense reports against policy",
    "sub_agents_needed": [{"name": "policy_checker", "purpose": "Check policy rules"}],
    "workflows_needed": [{"name": "main_review", "purpose": "Main review flow"}],
    "context_fields": [],
    "flagged_errors": [],
}

MOCK_INTAKE_AMBIGUOUS = {
    "summary": "",
    "agent_name": "",
    "agent_description": "",
    "sub_agents_needed": [],
    "workflows_needed": [],
    "context_fields": [],
    "flagged_errors": ["Description is too vague or empty"],
}


@pytest.mark.asyncio
async def test_intake_valid_spec():
    from pipeline.nodes.intake import intake_node, validate_intake_result

    with patch("pipeline.llm.call_pipeline_llm_json", new_callable=AsyncMock) as mock:
        mock.return_value = MOCK_INTAKE_VALID
        result = await intake_node("An agent that reviews expense reports against company policy")

        assert result["agent_name"] == "expense_review_agent"
        assert validate_intake_result(result) == []


@pytest.mark.asyncio
async def test_intake_flagged_error():
    from pipeline.nodes.intake import intake_node, validate_intake_result

    with patch("pipeline.llm.call_pipeline_llm_json", new_callable=AsyncMock) as mock:
        mock.return_value = MOCK_INTAKE_AMBIGUOUS
        result = await intake_node("stuff")

        errors = validate_intake_result(result)
        assert len(errors) > 0


@pytest.mark.asyncio
async def test_intake_with_context_data():
    from pipeline.nodes.intake import intake_node

    with patch("pipeline.llm.call_pipeline_llm_json", new_callable=AsyncMock) as mock:
        mock.return_value = MOCK_INTAKE_VALID
        context = {"applicant_name": "Eastbridge Corp", "credit_score": 720}
        result = await intake_node("Review expense reports", context_data=context)

        assert result is not None


@pytest.mark.asyncio
async def test_intake_with_agent_name_override():
    from pipeline.nodes.intake import intake_node

    with patch("pipeline.llm.call_pipeline_llm_json", new_callable=AsyncMock) as mock:
        mock.return_value = MOCK_INTAKE_VALID.copy()
        result = await intake_node("Review expense reports", agent_name="custom_agent")

        assert result["agent_name"] == "custom_agent"

import pytest
from unittest.mock import patch, AsyncMock


VALID_FILES = {
    "agent.yaml": "agent_id: test\nname: Test\nsub_agents: []\nworkflows:\n  - wf1",
    "workflow_wf1.yaml": "workflow_id: wf1\nname: WF1\nnodes:\n  - id: start\n    type: show_message\n    message: Hello\n    next: end\n  - id: end\n    type: finish\n    message: Done\nedges:\n  - from: start\n    to: end\n",
}

BROKEN_FILES = {
    "agent.yaml": "agent_id: test\nname: Test\nsub_agents: []\nworkflows:\n  - wf1",
    "workflow_wf1.yaml": "workflow_id: wf1\nname: WF1\nnodes:\n  - id: start\n    type: show_message\n    message: Hello\n    next: nonexistent_node\nedges: []\n",
}


@pytest.mark.asyncio
async def test_critic_passes_valid_package():
    from pipeline.nodes.critic import critic_node

    with patch("pipeline.llm.call_pipeline_llm_json", new_callable=AsyncMock) as mock:
        mock.return_value = {"pass": True, "issues": []}
        result = await critic_node(VALID_FILES)

        assert result["pass"] is True
        assert result["issues"] == []


@pytest.mark.asyncio
async def test_critic_finds_issues():
    from pipeline.nodes.critic import critic_node

    with patch("pipeline.llm.call_pipeline_llm_json", new_callable=AsyncMock) as mock:
        mock.return_value = {
            "pass": False,
            "issues": [
                {"file": "workflow_wf1.yaml", "message": "Node 'start' references nonexistent node 'nonexistent_node'"}
            ],
        }
        result = await critic_node(BROKEN_FILES)

        assert result["pass"] is False
        assert len(result["issues"]) > 0


@pytest.mark.asyncio
async def test_critic_defaults_pass_on_empty_issues():
    from pipeline.nodes.critic import critic_node

    with patch("pipeline.llm.call_pipeline_llm_json", new_callable=AsyncMock) as mock:
        mock.return_value = {}
        result = await critic_node(VALID_FILES)

        assert result["pass"] is True
        assert result["issues"] == []


@pytest.mark.asyncio
async def test_critic_always_returns_issues_list():
    from pipeline.nodes.critic import critic_node

    with patch("pipeline.llm.call_pipeline_llm_json", new_callable=AsyncMock) as mock:
        mock.return_value = {"pass": True, "issues": None}
        result = await critic_node(VALID_FILES)

        assert isinstance(result["issues"], list)

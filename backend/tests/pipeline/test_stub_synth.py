import pytest
from unittest.mock import patch, AsyncMock


MOCK_STUB_FILES = {
    "stub_manual_review.yaml": "stub_id: stub_manual_review\nname: Manual Review\ndescription: Flags expense for manual review\ninputs:\n  expense_id: string\nsuccess_output:\n  reviewed: true\n  decision: pending\nfailure_output:\n  error: Review failed\n  code: 500\n",
    "test_main_review.yaml": "test_id: test_main_review\nname: Main Review Test\ninitial_context:\n  expense_amount: 1500\n  employee_id: EMP-001\nmessages:\n  - Approved\nstub_overrides:\n  stub_manual_review:\n    reviewed: true\n    decision: approved\nexpected_final_message: Review complete\nexpected_status: completed\n",
}


@pytest.mark.asyncio
async def test_stub_synth_returns_files():
    from pipeline.nodes.stub_synth import stub_synth_node

    architect_files = {
        "agent.yaml": "agent_id: test\nname: Test\nsub_agents: []\nworkflows:\n  - wf1",
        "workflow_wf1.yaml": "workflow_id: wf1\nname: WF1\nnodes:\n  - id: start\n    type: run_stub\n    stub_id: stub_manual_review\n    next: end\n  - id: end\n    type: finish\n    message: Done\nedges:\n  - from: start\n    to: end\n",
    }

    with patch("pipeline.llm.call_pipeline_llm_json", new_callable=AsyncMock) as mock:
        mock.return_value = MOCK_STUB_FILES
        files = await stub_synth_node(architect_files)

        assert any("stub" in f for f in files)
        assert any("test" in f for f in files)


@pytest.mark.asyncio
async def test_stub_synth_files_are_strings():
    from pipeline.nodes.stub_synth import stub_synth_node

    with patch("pipeline.llm.call_pipeline_llm_json", new_callable=AsyncMock) as mock:
        mock.return_value = MOCK_STUB_FILES
        files = await stub_synth_node({"agent.yaml": "agent_id: test\nname: Test"})

        for value in files.values():
            assert isinstance(value, str)

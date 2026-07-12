import pytest
from services.execution_engine import ExecutionEngine

SIMPLE_WORKFLOW = {
    "workflow_id": "test_workflow",
    "nodes": [
        {"id": "start", "type": "show_message", "message": "Hello", "next": "check"},
        {"id": "check", "type": "condition", "condition": "score >= 50", "on_true": "pass", "on_false": "fail"},
        {"id": "pass", "type": "finish", "message": "Passed."},
        {"id": "fail", "type": "finish", "message": "Failed."},
    ],
    "edges": [
        {"from": "start", "to": "check"},
        {"from": "check", "to": "pass", "condition": "score >= 50"},
        {"from": "check", "to": "fail", "condition": "score < 50"},
    ],
}

AGENT = {"agent_id": "test_agent", "name": "Test"}
SUB_AGENTS = []
STUBS = []
TESTS = []


@pytest.mark.asyncio
async def test_execution_passes_condition():
    engine = ExecutionEngine()
    result = await engine.run_workflow(SIMPLE_WORKFLOW, AGENT, SUB_AGENTS, STUBS, TESTS, {"score": 75})
    assert result["status"] == "completed"
    assert result["final_message"] == "Passed."
    assert result["steps"] == 3


@pytest.mark.asyncio
async def test_execution_fails_condition():
    engine = ExecutionEngine()
    result = await engine.run_workflow(SIMPLE_WORKFLOW, AGENT, SUB_AGENTS, STUBS, TESTS, {"score": 25})
    assert result["status"] == "completed"
    assert result["final_message"] == "Failed."


@pytest.mark.asyncio
async def test_execution_stores_trace():
    engine = ExecutionEngine()
    result = await engine.run_workflow(SIMPLE_WORKFLOW, AGENT, SUB_AGENTS, STUBS, TESTS, {"score": 75})
    assert "trace" in result
    assert result["trace"]["visit_count"] == 3
    assert result["trace"]["final_status"] == "completed"


@pytest.mark.asyncio
async def test_execution_context_updated():
    engine = ExecutionEngine()
    result = await engine.run_workflow(SIMPLE_WORKFLOW, AGENT, SUB_AGENTS, STUBS, TESTS, {"score": 75})
    assert result["context"]["score"] == 75
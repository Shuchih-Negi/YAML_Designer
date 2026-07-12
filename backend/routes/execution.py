from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, List, Optional

from services.file_store import load_package, agent_exists
from services.yaml_parser import parse_agent, parse_workflow, parse_test, parse_stub, parse_sub_agent, parse_file
from services.execution_engine import ExecutionEngine
from services.context_service import validate_context_data, compute_derived_metrics, context_to_initial_context
from services.context_to_yaml import generate_full_package_from_context

router = APIRouter()

execution_history: Dict[str, List[dict]] = {}


def _load_agent_package(agent_id: str) -> dict:
    if not agent_exists(agent_id):
        raise HTTPException(status_code=404, detail="Agent not found")
    files = load_package(agent_id)
    workflows = []
    stubs = []
    sub_agents = []
    tests = []
    agent_data = None

    for filename, content in files.items():
        file_type, parsed = parse_file(filename, content)
        if file_type == "agent":
            agent_data = parsed
        elif file_type == "workflow":
            workflows.append(parsed)
        elif file_type == "stub":
            stubs.append(parsed)
        elif file_type == "sub_agent":
            sub_agents.append(parsed)
        elif file_type == "test":
            tests.append(parsed)

    return {
        "agent": agent_data,
        "workflows": workflows,
        "sub_agents": sub_agents,
        "stubs": stubs,
        "tests": tests,
    }


class RunTestRequest(BaseModel):
    initial_context: Optional[Dict[str, Any]] = None
    stub_overrides: Optional[Dict[str, Dict[str, Any]]] = None


class ContextUploadRequest(BaseModel):
    context_data: Dict[str, Any]


class GenerateFromContextRequest(BaseModel):
    context_data: Dict[str, Any]
    agent_id: str = "context_agent"
    agent_name: str = "Context-Driven Agent"
    agent_description: str = "Agent auto-generated from bank statement context data"


@router.post("/agents/{agent_id}/tests/{test_id}/run")
async def run_test(agent_id: str, test_id: str, req: RunTestRequest):
    pkg = _load_agent_package(agent_id)
    test = next((t for t in pkg["tests"] if t.get("test_id") == test_id), None)
    if not test:
        raise HTTPException(status_code=404, detail=f"Test not found: {test_id}")

    workflow_id = test.get("expected_route", "")
    workflow = next((w for w in pkg["workflows"] if w.get("workflow_id") == workflow_id), None)
    if not workflow and pkg["workflows"]:
        workflow = pkg["workflows"][0]

    if not workflow:
        raise HTTPException(status_code=400, detail="No workflow found to execute")

    context = dict(test.get("initial_context", {}))
    if req.initial_context:
        context.update(req.initial_context)
    if req.stub_overrides:
        context["stub_overrides"] = req.stub_overrides

    engine = ExecutionEngine()
    result = await engine.run_workflow(
        workflow=workflow,
        agent=pkg["agent"],
        sub_agents=pkg["sub_agents"],
        stubs=pkg["stubs"],
        tests=pkg["tests"],
        initial_context=context,
        test_id=test_id,
    )

    exec_id = result["execution_id"]
    if agent_id not in execution_history:
        execution_history[agent_id] = []
    execution_history[agent_id].append({
        "execution_id": exec_id,
        "test_id": test_id,
        "workflow_id": workflow.get("workflow_id"),
        "status": result["status"],
        "final_message": result["final_message"],
        "timestamp": result["trace"]["start_time"],
        "steps": result["steps"],
    })

    return result


@router.post("/agents/{agent_id}/tests/run-all")
async def run_all_tests(agent_id: str, req: RunTestRequest):
    pkg = _load_agent_package(agent_id)
    if not pkg["tests"]:
        return {"agent_id": agent_id, "results": [], "total": 0, "passed": 0, "failed": 0}

    results = []
    for test in pkg["tests"]:
        test_id = test.get("test_id", "unknown")
        workflow_id = test.get("expected_route", "")
        workflow = next((w for w in pkg["workflows"] if w.get("workflow_id") == workflow_id), None)
        if not workflow and pkg["workflows"]:
            workflow = pkg["workflows"][0]

        if not workflow:
            results.append({"test_id": test_id, "status": "error", "error": "No workflow found"})
            continue

        context = dict(test.get("initial_context", {}))
        if req.initial_context:
            context.update(req.initial_context)

        engine = ExecutionEngine()
        result = await engine.run_workflow(
            workflow=workflow,
            agent=pkg["agent"],
            sub_agents=pkg["sub_agents"],
            stubs=pkg["stubs"],
            tests=pkg["tests"],
            initial_context=context,
            test_id=test_id,
        )

        passed = result["status"] == "completed"
        if test.get("expected_route"):
            passed = passed and result.get("workflow_id") == test["expected_route"]

        results.append({
            "test_id": test_id,
            "status": "passed" if passed else "failed",
            "execution_id": result["execution_id"],
            "final_message": result["final_message"],
            "steps": result["steps"],
        })

        if agent_id not in execution_history:
            execution_history[agent_id] = []
        execution_history[agent_id].append(results[-1])

    passed_count = sum(1 for r in results if r["status"] == "passed")
    return {
        "agent_id": agent_id,
        "results": results,
        "total": len(results),
        "passed": passed_count,
        "failed": len(results) - passed_count,
    }


@router.get("/agents/{agent_id}/executions")
async def list_executions(agent_id: str):
    return execution_history.get(agent_id, [])


@router.get("/agents/{agent_id}/executions/{execution_id}")
async def get_execution(agent_id: str, execution_id: str):
    executions = execution_history.get(agent_id, [])
    for exec_entry in executions:
        if exec_entry.get("execution_id") == execution_id:
            return exec_entry
    raise HTTPException(status_code=404, detail="Execution not found")


@router.post("/context/upload")
async def upload_context(req: ContextUploadRequest):
    errors = validate_context_data(req.context_data)
    if errors:
        raise HTTPException(status_code=422, detail=errors)

    enriched = compute_derived_metrics(req.context_data)
    ic = context_to_initial_context(enriched)

    return {
        "status": "ok",
        "validated": True,
        "derived_metrics": enriched.get("derived_metrics", {}),
        "initial_context": ic,
        "context_schema": {
            "account_balance": "number",
            "avg_monthly_balance": "number",
            "transaction_count": "integer",
            "risk_flag": "string",
            "applicant_name": "string",
        },
    }


@router.post("/context/generate")
async def generate_from_context(req: GenerateFromContextRequest):
    errors = validate_context_data(req.context_data)
    if errors:
        raise HTTPException(status_code=422, detail=errors)

    enriched = compute_derived_metrics(req.context_data)
    files = generate_full_package_from_context(
        enriched,
        agent_id=req.agent_id,
        agent_name=req.agent_name,
        agent_description=req.agent_description,
    )

    from services.yaml_parser import validate_package
    validation_errors = validate_package(files)
    if validation_errors:
        raise HTTPException(status_code=422, detail=validation_errors)

    from services.file_store import save_package
    try:
        save_package(req.agent_id, files)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    return {
        "agent_id": req.agent_id,
        "files": files,
        "saved": True,
    }
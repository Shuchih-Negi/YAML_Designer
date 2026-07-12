import io
import zipfile
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, Optional, List
from fastapi.responses import StreamingResponse

from pipeline.state import create_draft, get_draft, update_draft
from pipeline.graph import run_pipeline
from services.yaml_parser import validate_package, parse_agent, parse_file
from services.file_store import save_package, load_package

router = APIRouter()


class SubAgentBrief(BaseModel):
    name: str
    responsibility: str
    source: str = "user"  # "user" or "ai_suggested"


class WorkflowBrief(BaseModel):
    name: str
    trigger: str
    brief: str
    source: str = "user"  # "user" or "ai_suggested"


class ProposedStub(BaseModel):
    stub_id: str
    inputs: Dict[str, str] = {}
    success_output: Dict[str, Any] = {}
    failure_modes: Optional[List[str]] = None


class GeneratePipelineRequest(BaseModel):
    description: str
    context_data: Optional[Dict[str, Any]] = None
    agent_name: Optional[str] = None
    sub_agents: Optional[List[SubAgentBrief]] = None
    workflows: Optional[List[WorkflowBrief]] = None
    stubs: Optional[List[ProposedStub]] = None


class ValidateRequest(BaseModel):
    files: Dict[str, str]


class PublishRequest(BaseModel):
    files: Dict[str, str]


class SuggestStructureRequest(BaseModel):
    description: str


class SuggestStructureResponse(BaseModel):
    sub_agents: List[SubAgentBrief]
    workflows: List[WorkflowBrief]


class ValidateStubsRequest(BaseModel):
    stubs: List[ProposedStub]
    workflow_briefs: List[str] = []


class StubValidationError(BaseModel):
    stub_id: str
    message: str


class ValidateStubsResponse(BaseModel):
    valid: bool
    errors: List[StubValidationError]


@router.post("/context-pipeline/validate-stubs")
async def validate_stubs(req: ValidateStubsRequest):
    from collections import Counter

    errors: List[StubValidationError] = []
    seen_ids: Dict[str, int] = {}

    # 1. Duplicate stub_ids
    id_counts = Counter(s.stub_id for s in req.stubs if s.stub_id)
    for stub_id, count in id_counts.items():
        if count > 1:
            errors.append(StubValidationError(stub_id=stub_id, message=f"Duplicate stub_id: appears {count} times"))

    # 2. Workflow briefs reference a stub that doesn't exist
    stub_ids = {s.stub_id for s in req.stubs if s.stub_id}
    for brief in req.workflow_briefs:
        import re
        refs = set(re.findall(r'\b(\w+_stub)\b', brief.lower()))
        for ref in refs:
            if ref not in {s.lower() for s in stub_ids}:
                errors.append(StubValidationError(stub_id=ref, message=f"Workflow brief references '{ref}' but no matching stub exists"))

    # 3. Empty/missing inputs when brief implies parameters
    for stub in req.stubs:
        if stub.stub_id and not stub.inputs:
            errors.append(StubValidationError(
                stub_id=stub.stub_id,
                message="No inputs defined — if this stub needs parameters, add input fields",
            ))

    # 4. Success_output type consistency (heuristic: if multiple stubs share a name prefix, check type patterns)
    # No LLM needed — just flag if success_output is empty for any stub
    for stub in req.stubs:
        if stub.stub_id and not stub.success_output:
            errors.append(StubValidationError(
                stub_id=stub.stub_id,
                message="success_output is empty — define at least one sample response field",
            ))

    return ValidateStubsResponse(valid=len(errors) == 0, errors=errors)


@router.get("/context-pipeline/tenants")
async def list_tenants(q: str = ""):
    from services.finlens_context import search_tenants
    return search_tenants(q)


@router.get("/context-pipeline/tenants/{tenant_id}/context")
async def get_tenant_context(tenant_id: str):
    from services.finlens_context import get_tenant_context
    context = get_tenant_context(tenant_id)
    if context is None:
        raise HTTPException(status_code=404, detail="Tenant not found")
    return context


@router.post("/context-pipeline/suggest-structure")
async def suggest_structure(req: SuggestStructureRequest):
    if not req.description.strip():
        raise HTTPException(status_code=422, detail="Description cannot be empty")

    from pipeline.llm import call_pipeline_llm_json

    system_prompt = """You are a structure suggester for BharosaAI agent packages.
Given a high-level goal, suggest a breakdown into sub-agents and workflows.

Return a JSON object with exactly these fields:
- sub_agents: list of {name: str, responsibility: str} — each sub-agent is a distinct responsibility
- workflows: list of {name: str, trigger: str, brief: str} — each workflow is a step-by-step process

Rules:
- 1-3 sub-agents, 1-4 workflows
- Each workflow must belong to one sub-agent
- Use snake_case names
- Keep it practical and specific to the description"""

    user_prompt = f"Suggest a structure for this agent goal:\n\n{req.description}"

    try:
        result = await call_pipeline_llm_json(system_prompt, user_prompt, temperature=0.3, max_tokens=2048, key_id=2)
    except Exception as e:
        raise HTTPException(status_code=502, detail={"failed_step": "suggest_structure", "reason": str(e)})

    return SuggestStructureResponse(
        sub_agents=[SubAgentBrief(**s, source="ai_suggested") for s in result.get("sub_agents", [])],
        workflows=[WorkflowBrief(**w, source="ai_suggested") for w in result.get("workflows", [])],
    )


@router.post("/context-pipeline/generate")
async def generate_pipeline(req: GeneratePipelineRequest):
    if not req.description.strip():
        raise HTTPException(status_code=422, detail="Description cannot be empty")

    draft = create_draft(req.description, req.context_data)

    try:
        result = await run_pipeline(
            description=req.description,
            context_data=req.context_data,
            agent_name=req.agent_name,
            sub_agents=[s.model_dump() for s in req.sub_agents] if req.sub_agents else None,
            workflows=[w.model_dump() for w in req.workflows] if req.workflows else None,
            stubs=[s.model_dump() for s in req.stubs] if req.stubs else None,
        )
    except Exception as e:
        update_draft(draft.draft_id, status="failed", failure_reason=str(e))
        raise HTTPException(status_code=502, detail={"failed_step": "pipeline", "reason": str(e)})

    if result.get("failed_step"):
        update_draft(
            draft.draft_id,
            status="failed",
            failed_step=result["failed_step"],
            failure_reason=result["failure_reason"],
        )
        raise HTTPException(
            status_code=502,
            detail={
                "failed_step": result["failed_step"],
                "reason": result["failure_reason"],
            },
        )

    files = result.get("files", {})
    if not files:
        update_draft(draft.draft_id, status="failed", failure_reason="Pipeline produced no files")
        raise HTTPException(status_code=502, detail={"failed_step": "compiler", "reason": "Pipeline produced no files"})

    update_draft(
        draft.draft_id,
        status="ready",
        files=files,
        context_profile=result.get("intake_result", {}).get("context_profile"),
        plan=result.get("plan"),
    )

    return {
        "draft_id": draft.draft_id,
        "files": files,
        "planner_summary": result.get("planner_summary", ""),
    }


@router.post("/context-pipeline/{draft_id}/validate")
async def validate_draft(draft_id: str, req: ValidateRequest):
    draft = get_draft(draft_id)
    if draft is None:
        raise HTTPException(status_code=404, detail="Draft not found")

    errors = validate_package(req.files)

    per_file_errors = []
    for filename, content in req.files.items():
        try:
            parse_file(filename, content)
        except ValueError as e:
            line = _extract_error_line(str(e))
            per_file_errors.append({"file": filename, "line": line, "message": str(e)})

    for msg in errors:
        per_file_errors.append({"file": "package", "line": None, "message": msg})

    valid = len(per_file_errors) == 0
    return {"valid": valid, "errors": per_file_errors}


@router.post("/context-pipeline/{draft_id}/publish")
async def publish_draft(draft_id: str, req: PublishRequest):
    draft = get_draft(draft_id)
    if draft is None:
        raise HTTPException(status_code=404, detail="Draft not found")

    validation_errors = validate_package(req.files)
    if validation_errors:
        raise HTTPException(status_code=422, detail=validation_errors)

    for filename, content in req.files.items():
        try:
            parse_file(filename, content)
        except ValueError as e:
            raise HTTPException(status_code=422, detail=f"Invalid {filename}: {e}")

    agent_files = [f for f in req.files if f.lower().startswith("agent")]
    if not agent_files:
        raise HTTPException(status_code=422, detail="No agent.yaml in published files")

    try:
        agent_data = parse_agent(req.files[agent_files[0]])
    except ValueError as e:
        raise HTTPException(status_code=422, detail=f"Invalid agent.yaml: {e}")

    agent_id = agent_data["agent_id"]

    try:
        save_package(agent_id, req.files)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    update_draft(draft_id, status="published", files=req.files)

    return {"agent_id": agent_id}


@router.get("/context-pipeline/{draft_id}/download")
async def download_draft(draft_id: str):
    draft = get_draft(draft_id)
    if draft is None:
        raise HTTPException(status_code=404, detail="Draft not found")

    files = draft.files
    if not files:
        raise HTTPException(status_code=404, detail="No files in this draft")

    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        for filename, content in files.items():
            zf.writestr(filename, content)

    zip_buffer.seek(0)

    return StreamingResponse(
        zip_buffer,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{draft_id}.zip"'},
    )


# --- HIL Verification Loop endpoints ---


class VerifyRequest(BaseModel):
    files: Dict[str, str]


class VerifyResponse(BaseModel):
    pass_: bool
    issues: List[Dict[str, str]]
    suggested_fix: Optional[Dict[str, str]] = None


class ApplyFixRequest(BaseModel):
    files: Dict[str, str]  # updated files after user applied the fix


@router.post("/context-pipeline/{draft_id}/verify")
async def verify_draft(draft_id: str, req: VerifyRequest):
    from pipeline.state import get_draft
    from pipeline.nodes.critic import run_critic_check, generate_fix_suggestion

    draft = get_draft(draft_id)
    if draft is None:
        raise HTTPException(status_code=404, detail="Draft not found")

    update_draft(draft_id, hil_status="testing")

    try:
        result = await run_critic_check(req.files)
    except Exception as e:
        update_draft(draft_id, hil_status="editing")
        raise HTTPException(status_code=502, detail={"failed_step": "verify", "reason": str(e)})

    issues = result.get("issues", [])
    passed = result.get("pass", len(issues) == 0)

    suggested_fix = None
    if not passed:
        try:
            suggested_fix = await generate_fix_suggestion(req.files, issues)
        except Exception:
            suggested_fix = None

    update_draft(
        draft_id,
        hil_status="fix_proposed" if not passed else "approved",
        last_test_result={"pass": passed, "issues": issues},
        proposed_fix=suggested_fix,
        iteration_count=draft.iteration_count + 1,
    )

    return {
        "pass": passed,
        "issues": issues,
        "suggested_fix": suggested_fix,
    }


@router.post("/context-pipeline/{draft_id}/apply-fix")
async def apply_draft_fix(draft_id: str, req: ApplyFixRequest):
    from pipeline.state import get_draft

    draft = get_draft(draft_id)
    if draft is None:
        raise HTTPException(status_code=404, detail="Draft not found")

    update_draft(
        draft_id,
        files=req.files,
        hil_status="editing",
        proposed_fix=None,
        last_test_result=None,
    )

    return {"status": "fix_applied"}


@router.post("/context-pipeline/{draft_id}/approve")
async def approve_draft(draft_id: str):
    from pipeline.state import get_draft

    draft = get_draft(draft_id)
    if draft is None:
        raise HTTPException(status_code=404, detail="Draft not found")

    update_draft(draft_id, hil_status="approved")

    return {"status": "approved"}


def _extract_error_line(error_msg: str) -> Optional[int]:
    import re
    match = re.search(r'line (\d+)', error_msg)
    if match:
        return int(match.group(1))
    match = re.search(r'at line (\d+)', error_msg)
    if match:
        return int(match.group(1))
    return None

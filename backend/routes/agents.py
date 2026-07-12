from fastapi import APIRouter, UploadFile, File, HTTPException
from typing import List, Dict
import io

from services.yaml_parser import parse_agent, parse_workflow, parse_stub, parse_sub_agent, parse_test, parse_file, validate_package
from services.file_store import save_package, load_package, list_agents, delete_package, agent_exists

router = APIRouter()


@router.get("/agents")
async def list_agents_endpoint() -> List[Dict]:
    agent_ids = list_agents()
    result = []
    for agent_id in agent_ids:
        try:
            files = load_package(agent_id)
            agent_data = parse_agent(files.get("agent.yaml", ""))
            workflow_count = len(agent_data.get("workflows", []))
            sub_agent_count = len(agent_data.get("sub_agents", []))
            stub_count = sum(1 for f in files if f.lower().startswith("stub"))
            test_count = sum(1 for f in files if f.lower().startswith("test"))
            result.append({
                "agent_id": agent_data["agent_id"],
                "name": agent_data["name"],
                "description": agent_data.get("description", ""),
                "workflow_count": workflow_count,
                "sub_agent_count": sub_agent_count,
                "stub_count": stub_count,
                "test_count": test_count,
            })
        except Exception:
            continue
    return result


@router.get("/agents/{agent_id}")
async def get_agent(agent_id: str) -> Dict:
    if not agent_exists(agent_id):
        raise HTTPException(status_code=404, detail="Agent not found")
    
    files = load_package(agent_id)
    raw_files = dict(files)
    
    workflows = []
    sub_agents = []
    stubs = []
    tests = []
    agent_data = None
    
    for filename, content in files.items():
        file_type, parsed = parse_file(filename, content)
        if file_type == "agent":
            agent_data = parsed
        elif file_type == "workflow":
            workflows.append(parsed)
        elif file_type == "sub_agent":
            sub_agents.append(parsed)
        elif file_type == "stub":
            stubs.append(parsed)
        elif file_type == "test":
            tests.append(parsed)
    
    if not agent_data:
        raise HTTPException(status_code=500, detail="agent.yaml not found in package")
    
    return {
        "agent": agent_data,
        "workflows": workflows,
        "sub_agents": sub_agents,
        "stubs": stubs,
        "tests": tests,
        "raw_files": raw_files,
    }


@router.post("/agents/upload")
async def upload_package(files: List[UploadFile] = File(...)) -> Dict:
    file_dict = {}
    for upload_file in files:
        content = await upload_file.read()
        file_dict[upload_file.filename] = content.decode("utf-8")
    
    errors = validate_package(file_dict)
    if errors:
        raise HTTPException(status_code=422, detail=errors)
    
    agent_data = parse_agent(file_dict[[f for f in file_dict if f.lower().startswith("agent")][0]])
    agent_id = agent_data["agent_id"]
    
    save_package(agent_id, file_dict)
    
    return {
        "status": "ok",
        "agent_id": agent_id,
        "files_saved": len(file_dict),
    }


@router.delete("/agents/{agent_id}")
async def delete_agent_endpoint(agent_id: str) -> Dict:
    if not agent_exists(agent_id):
        raise HTTPException(status_code=404, detail="Agent not found")
    delete_package(agent_id)
    return {"status": "ok", "agent_id": agent_id}
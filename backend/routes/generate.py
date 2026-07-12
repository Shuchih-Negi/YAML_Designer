from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from services.gemini_service import generate_package
from services.yaml_parser import validate_package, parse_agent
from services.file_store import save_package

router = APIRouter()


class GenerateRequest(BaseModel):
    description: str


@router.post("/generate")
async def generate(req: GenerateRequest):
    if not req.description.strip():
        raise HTTPException(status_code=422, detail="Description cannot be empty")

    try:
        files = await generate_package(req.description)
    except ValueError as e:
        raise HTTPException(status_code=500, detail=str(e))

    errors = validate_package(files)
    if errors:
        raise HTTPException(status_code=422, detail=errors)

    agent_yaml = files[[f for f in files if f.lower().startswith("agent")][0]]
    agent_data = parse_agent(agent_yaml)
    agent_id = agent_data["agent_id"]

    try:
        save_package(agent_id, files)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    return {
        "agent_id": agent_id,
        "files": files,
        "saved": True,
    }
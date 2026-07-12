import os
import re
import shutil
from pathlib import Path
from typing import Dict, List


def _sanitize_agent_id(agent_id: str) -> str:
    if not re.match(r'^[a-zA-Z0-9_-]+$', agent_id):
        raise ValueError("agent_id must contain only alphanumeric, underscore, or hyphen")
    if '..' in agent_id or '/' in agent_id or '\\' in agent_id:
        raise ValueError("agent_id contains invalid path characters")
    return agent_id


def _get_agent_dir(agent_id: str, base_dir: str = "./agent_definitions") -> Path:
    agent_id = _sanitize_agent_id(agent_id)
    return Path(base_dir) / agent_id


def save_package(agent_id: str, files: Dict[str, str], base_dir: str = "./agent_definitions") -> None:
    agent_dir = _get_agent_dir(agent_id, base_dir)
    agent_dir.mkdir(parents=True, exist_ok=True)
    for filename, content in files.items():
        file_path = agent_dir / filename
        file_path.write_text(content, encoding="utf-8")


def load_package(agent_id: str, base_dir: str = "./agent_definitions") -> Dict[str, str]:
    agent_dir = _get_agent_dir(agent_id, base_dir)
    if not agent_dir.exists():
        raise FileNotFoundError(f"Agent not found: {agent_id}")
    files = {}
    for file_path in agent_dir.glob("*.yaml"):
        files[file_path.name] = file_path.read_text(encoding="utf-8")
    for file_path in agent_dir.glob("*.yml"):
        if file_path.name not in files:
            files[file_path.name] = file_path.read_text(encoding="utf-8")
    return files


def list_agents(base_dir: str = "./agent_definitions") -> List[str]:
    base_path = Path(base_dir)
    if not base_path.exists():
        return []
    return [d.name for d in base_path.iterdir() if d.is_dir()]


def delete_package(agent_id: str, base_dir: str = "./agent_definitions") -> None:
    agent_dir = _get_agent_dir(agent_id, base_dir)
    if agent_dir.exists():
        shutil.rmtree(agent_dir)


def agent_exists(agent_id: str, base_dir: str = "./agent_definitions") -> bool:
    agent_dir = _get_agent_dir(agent_id, base_dir)
    return agent_dir.exists()
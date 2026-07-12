import yaml
from yaml.parser import ParserError
from typing import Dict, List, Tuple, Any


def parse_agent(content: str) -> dict:
    try:
        data = yaml.safe_load(content)
    except ParserError as e:
        raise ValueError(f"Invalid YAML syntax: {e}")
    if not data:
        raise ValueError("Empty YAML content")
    required = ["agent_id", "name", "sub_agents", "workflows"]
    for field in required:
        if field not in data:
            raise ValueError(f"agent.yaml missing required field: {field}")
    if not isinstance(data["sub_agents"], list):
        raise ValueError("sub_agents must be a list")
    if not isinstance(data["workflows"], list):
        raise ValueError("workflows must be a list")
    return data


def parse_workflow(content: str) -> dict:
    try:
        data = yaml.safe_load(content)
    except ParserError as e:
        raise ValueError(f"Invalid YAML syntax: {e}")
    if not data:
        raise ValueError("Empty YAML content")
    if "workflow_id" not in data:
        raise ValueError("workflow.yaml missing required field: workflow_id")
    if "nodes" not in data:
        raise ValueError("workflow.yaml missing required field: nodes")
    if not isinstance(data["nodes"], list):
        raise ValueError("nodes must be a list")
    return data


def parse_stub(content: str) -> dict:
    try:
        data = yaml.safe_load(content)
    except ParserError as e:
        raise ValueError(f"Invalid YAML syntax: {e}")
    if not data:
        raise ValueError("Empty YAML content")
    required = ["stub_id", "inputs", "success_output"]
    for field in required:
        if field not in data:
            raise ValueError(f"stub.yaml missing required field: {field}")
    return data


def parse_sub_agent(content: str) -> dict:
    try:
        data = yaml.safe_load(content)
    except ParserError as e:
        raise ValueError(f"Invalid YAML syntax: {e}")
    if not data:
        raise ValueError("Empty YAML content")
    if "sub_agent_id" not in data:
        raise ValueError("sub_agent.yaml missing required field: sub_agent_id")
    return data


def parse_test(content: str) -> dict:
    try:
        data = yaml.safe_load(content)
    except ParserError as e:
        raise ValueError(f"Invalid YAML syntax: {e}")
    if not data:
        raise ValueError("Empty YAML content")
    if "test_id" not in data:
        raise ValueError("test.yaml missing required field: test_id")
    return data


def parse_file(filename: str, content: str) -> Tuple[str, dict]:
    name = filename.lower()
    if name.startswith("agent"):
        return "agent", parse_agent(content)
    elif name.startswith("workflow"):
        return "workflow", parse_workflow(content)
    elif name.startswith("stub"):
        return "stub", parse_stub(content)
    elif name.startswith("sub_agent"):
        return "sub_agent", parse_sub_agent(content)
    elif name.startswith("test"):
        return "test", parse_test(content)
    else:
        raise ValueError(f"Unknown file type: {filename}")


def validate_package(files: Dict[str, str]) -> List[str]:
    errors = []
    agent_files = [f for f in files if f.lower().startswith("agent")]
    if len(agent_files) != 1:
        errors.append(f"Must contain exactly one agent.yaml file (found {len(agent_files)})")
        return errors
    
    agent_filename = agent_files[0]
    try:
        agent_data = parse_agent(files[agent_filename])
    except ValueError as e:
        errors.append(f"Invalid agent.yaml: {e}")
        return errors
    
    for workflow_id in agent_data.get("workflows", []):
        workflow_filename = f"workflow_{workflow_id}.yaml"
        if workflow_filename not in files and f"workflow_{workflow_id}.yml" not in files:
            found = False
            for f in files:
                if f.lower().startswith("workflow") and workflow_id in f.lower():
                    found = True
                    break
            if not found:
                errors.append(f"Referenced workflow '{workflow_id}' not found in package")
    
    return errors
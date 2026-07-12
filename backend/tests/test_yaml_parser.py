import pytest
from services.yaml_parser import (
    parse_agent,
    parse_workflow,
    parse_stub,
    parse_sub_agent,
    parse_test,
    parse_file,
    validate_package,
)

VALID_AGENT_YAML = """
agent_id: test_agent
name: Test Agent
description: A test agent
sub_agents: []
workflows:
  - workflow_main
"""

VALID_WORKFLOW_YAML = """
workflow_id: workflow_main
name: Main Workflow
nodes:
  - id: start
    type: show_message
    message: Hello
    next: end
  - id: end
    type: finish
    message: Done
edges: []
"""

VALID_STUB_YAML = """
stub_id: stub_test
name: Test Stub
inputs:
  field1: string
success_output:
  result: "ok"
failure_output:
  error: "failed"
"""

VALID_SUB_AGENT_YAML = """
sub_agent_id: sub_test
name: Sub Test
workflows:
  - workflow_sub
"""

VALID_TEST_YAML = """
test_id: test_basic
name: Basic Test
initial_context: {}
messages: []
expected_final_message: "Done"
"""

INVALID_AGENT_YAML = """
name: Missing ID Agent
"""

def test_parse_valid_agent():
    result = parse_agent(VALID_AGENT_YAML)
    assert result["agent_id"] == "test_agent"
    assert result["name"] == "Test Agent"

def test_parse_agent_missing_id_raises():
    with pytest.raises(ValueError):
        parse_agent(INVALID_AGENT_YAML)

def test_parse_workflow_returns_nodes():
    result = parse_workflow(VALID_WORKFLOW_YAML)
    assert len(result["nodes"]) == 2

def test_parse_stub():
    result = parse_stub(VALID_STUB_YAML)
    assert result["stub_id"] == "stub_test"

def test_parse_sub_agent():
    result = parse_sub_agent(VALID_SUB_AGENT_YAML)
    assert result["sub_agent_id"] == "sub_test"

def test_parse_test():
    result = parse_test(VALID_TEST_YAML)
    assert result["test_id"] == "test_basic"

def test_parse_file_routes_by_prefix():
    assert parse_file("agent.yaml", VALID_AGENT_YAML)[0] == "agent"
    assert parse_file("workflow_main.yaml", VALID_WORKFLOW_YAML)[0] == "workflow"
    assert parse_file("stub_test.yaml", VALID_STUB_YAML)[0] == "stub"
    assert parse_file("sub_agent_test.yaml", VALID_SUB_AGENT_YAML)[0] == "sub_agent"
    assert parse_file("test_basic.yaml", VALID_TEST_YAML)[0] == "test"

def test_validate_package_valid():
    files = {
        "agent.yaml": VALID_AGENT_YAML,
        "workflow_main.yaml": VALID_WORKFLOW_YAML
    }
    errors = validate_package(files)
    assert errors == []

def test_validate_package_missing_workflow():
    files = { "agent.yaml": VALID_AGENT_YAML }
    errors = validate_package(files)
    assert any("workflow_main" in e for e in errors)

def test_validate_package_exactly_one_agent():
    files = {
        "agent.yaml": VALID_AGENT_YAML,
        "agent2.yaml": VALID_AGENT_YAML,
        "workflow_main.yaml": VALID_WORKFLOW_YAML
    }
    errors = validate_package(files)
    assert any("exactly one" in e for e in errors)

def test_validate_package_invalid_agent_yaml():
    files = {
        "agent.yaml": "name: [missing agent_id",
        "workflow_main.yaml": VALID_WORKFLOW_YAML
    }
    errors = validate_package(files)
    assert any("Invalid agent.yaml" in e for e in errors)
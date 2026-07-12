from typing import Dict, Any, List, Optional
from .context_service import build_context_schema, context_to_initial_context


CONTEXT_AWARE_WORKFLOW_TEMPLATE = """workflow_id: {workflow_id}
name: {name}
description: {description}
context_schema:
{context_schema}
nodes:
  - id: start
    type: show_message
    message: "Starting {name_lower} with bank statement data."
    next: validate_context
  - id: validate_context
    type: condition
    condition: "applicant_name != ''"
    on_true: check_balance
    on_false: error_no_data
  - id: check_balance
    type: condition
    condition: "account_balance >= 0"
    on_true: check_risk
    on_false: error_no_data
  - id: check_risk
    type: condition
    condition: "risk_flag == 'low'"
    on_true: approve
    on_false: review
  - id: review
    type: show_message
    message: "Review required. Risk flag: {{{{ risk_flag }}}}."
    next: finish
  - id: approve
    type: finish
    message: "Auto-approved based on bank statement data."
  - id: error_no_data
    type: finish
    message: "Insufficient context data to proceed."
  - id: finish
    type: finish
    message: "{finish_message}"
edges:
  - from: start
    to: validate_context
  - from: validate_context
    to: check_balance
    condition: "applicant_name != ''"
  - from: validate_context
    to: error_no_data
    condition: "applicant_name == ''"
  - from: check_balance
    to: check_risk
    condition: "account_balance >= 0"
  - from: check_balance
    to: error_no_data
    condition: "account_balance < 0"
  - from: check_risk
    to: approve
    condition: "risk_flag == 'low'"
  - from: check_risk
    to: review
    condition: "risk_flag != 'low'"
  - from: review
    to: finish
"""


def generate_workflow_from_context(
    context_data: dict,
    workflow_id: str = "workflow_context_review",
    name: str = "Context-Driven Review",
) -> str:
    schema = build_context_schema(context_data)
    schema_lines = []
    for key, val_type in schema.items():
        schema_lines.append(f"  {key}: {val_type}")

    context_section = "\n".join(schema_lines)
    finish_message = "Context-driven review complete."

    return CONTEXT_AWARE_WORKFLOW_TEMPLATE.format(
        workflow_id=workflow_id,
        name=name,
        description=f"Reviews applicant based on bank statement context data",
        name_lower=name.lower(),
        context_schema=context_section,
        finish_message=finish_message,
    )


def generate_agent_yaml(agent_id: str, name: str, description: str) -> str:
    return f"""agent_id: {agent_id}
name: {name}
description: {description}
version: "1.0"
sub_agents: []
workflows:
  - workflow_context_review
"""


def generate_stub_from_context(context_data: dict, stub_id: str = "stub_context_data") -> str:
    ic = context_to_initial_context(context_data)
    sample_output = {}
    for key, val in ic.items():
        if isinstance(val, (int, float, bool)):
            sample_output[key] = val
        elif isinstance(val, str):
            sample_output[key] = val

    inputs_yaml = "\n".join(f"  {k}: {type(v).__name__}" for k, v in sample_output.items())
    success_yaml = "\n".join(f"  {k}: {v}" for k, v in sample_output.items())

    return f"""stub_id: {stub_id}
name: Context Data Stub
description: Returns context-driven data from bank statement analysis
inputs:
{inputs_yaml}
success_output:
{success_yaml}
failure_output:
  error: "Context data not available"
  code: 400
invocation_record: true
"""


def generate_test_from_context(
    context_data: dict,
    test_id: str = "test_context_driven",
    name: str = "Context-Driven Test",
) -> str:
    ic = context_to_initial_context(context_data)
    initial_yaml = "\n".join(f"  {k}: {v}" for k, v in ic.items())

    return f"""test_id: {test_id}
name: {name}
description: Tests the agent with context data from uploaded bank statement
initial_context:
{initial_yaml}
messages:
  - "Run with context data"
expected_final_message: "Context-driven review complete."
expected_status: completed
expected_route: finish
"""


def generate_full_package_from_context(
    context_data: dict,
    agent_id: str = "context_agent",
    agent_name: str = "Context-Driven Agent",
    agent_description: str = "Agent auto-generated from bank statement context data",
) -> Dict[str, str]:
    files = {
        "agent.yaml": generate_agent_yaml(agent_id, agent_name, agent_description),
        "workflow_context_review.yaml": generate_workflow_from_context(context_data),
        "stub_context_data.yaml": generate_stub_from_context(context_data),
        "test_context_driven.yaml": generate_test_from_context(context_data),
    }
    return files
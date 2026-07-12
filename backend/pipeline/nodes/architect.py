from typing import Dict, Any


ARCHITECT_SYSTEM_PROMPT = """You are a workflow architect for BharosaAI agent packages.
Given a plan, generate the YAML files for the agent, sub-agents, and workflows.

Return a JSON object where keys are filenames and values are YAML content strings.
Must include:
- agent.yaml (with agent_id, name, description, sub_agents list, workflows list)
- sub_agent_*.yaml (one per sub-agent with sub_agent_id, name, description, workflows list)
- workflow_*.yaml (one per workflow)

For workflow YAML, use these exact node types: show_message, ask_user, save_value, condition, invoke_sub_agent, run_stub, finish.
Every node MUST have an "id" field - this is required.
Every node must have either a "next" field or corresponding edges.
Condition nodes must have both on_true and on_false fields.
Every "run_stub" node must have a stub_id.
Every "invoke_sub_agent" node must have a sub_agent_id.

Keep workflows simple (3-8 nodes each). Include proper edges arrays in each workflow.
"""


async def architect_node(plan: Dict[str, Any]) -> Dict[str, str]:
    from ..llm import call_pipeline_llm_json

    user_prompt = f"""Generate the YAML agent package files from this plan:

Agent ID: {plan.get('agent_id', 'unknown_agent')}
Agent Name: {plan.get('agent_name', '')}
Agent Description: {plan.get('agent_description', '')}

Sub-Agents:
{plan.get('sub_agents', [])}

Workflows:
{plan.get('workflows', [])}"""

    result = await call_pipeline_llm_json(ARCHITECT_SYSTEM_PROMPT, user_prompt, temperature=0.3, max_tokens=8192, key_id=1)

    files: Dict[str, str] = {}
    for key, value in result.items():
        files[key] = str(value)

    return files

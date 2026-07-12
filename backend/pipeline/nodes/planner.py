from typing import Dict, Any, Optional, List


PLANNER_SYSTEM_PROMPT = """You are a domain planner for BharosaAI agent packages.
Given a spec analysis from the intake stage, produce a detailed plan.

Return a JSON object with exactly these fields:
- agent_id: snake_case agent identifier
- agent_name: human-readable name
- agent_description: one-line description
- sub_agents: list of {sub_agent_id, name, description, workflows: [workflow_id]}
- workflows: list of {workflow_id, name, description, context_schema: {field: type}, node_count_estimate: int}

Rules:
- Every workflow_id referenced in sub_agents must appear in the workflows list
- Keep it practical: 1-3 sub_agents, 1-4 workflows
- context_schema should list the key variables that flow through the workflow
"""


async def planner_node(
    intake_result: Dict[str, Any],
    sub_agents: Optional[List[Dict[str, Any]]] = None,
    workflows: Optional[List[Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    from ..llm import call_pipeline_llm_json

    struct_section = ""
    if sub_agents and workflows:
        struct_section = f"""
User-confirmed sub-agents:
{[s['name'] + ': ' + s['responsibility'] for s in sub_agents]}

User-confirmed workflows:
{[w['name'] + ' (' + w['trigger'] + '): ' + w['brief'] for w in workflows]}

Use the confirmed sub-agents and workflows above as ground truth. They must appear in the plan exactly as stated.
"""

    user_prompt = f"""Produce an agent plan from this spec analysis:

Summary: {intake_result.get('summary', '')}
Agent name: {intake_result.get('agent_name', 'unknown_agent')}
Description: {intake_result.get('agent_description', '')}
Sub-agents needed: {intake_result.get('sub_agents_needed', [])}
Workflows needed: {intake_result.get('workflows_needed', [])}
Context fields: {intake_result.get('context_fields', [])}{struct_section}"""

    return await call_pipeline_llm_json(PLANNER_SYSTEM_PROMPT, user_prompt, temperature=0.3, key_id=2)

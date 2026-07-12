from typing import Dict, Any, Optional, List


INTAKE_SYSTEM_PROMPT = """You are a spec intake agent for BharosaAI agent package generation.
Analyse the user's description of an AI agent and optionally a context data profile.

Return a JSON object with exactly these fields:
- summary: brief summary of what the agent does
- agent_name: suggested agent_id (snake_case, e.g. 'expense_review_agent')
- agent_description: one-line description
- sub_agents_needed: list of suggested sub-agent names with purpose
- workflows_needed: list of suggested workflow names with purpose
- context_fields: list of {name, type, description} objects derived from context if provided
- flagged_errors: list of issues (empty list if spec is clear and non-empty)

Rules:
- Reject (via flagged_errors) if description is fewer than 5 words or completely vague
- Extract agent_name from the description if possible, derive reasonable defaults
- If context_data is provided, extract meaningful field names and types
"""


async def intake_node(
    description: str,
    context_data: Optional[Dict[str, Any]] = None,
    agent_name: Optional[str] = None,
    sub_agents: Optional[List[Dict[str, Any]]] = None,
    workflows: Optional[List[Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    from ..llm import call_pipeline_llm_json

    # When structured data is provided, skip LLM call — normalize only
    if sub_agents and workflows:
        return {
            "summary": description,
            "agent_name": agent_name or f"{workflows[0].get('name', 'agent').replace(' ', '_')}_agent",
            "agent_description": description,
            "sub_agents_needed": [{"name": s["name"], "purpose": s["responsibility"]} for s in sub_agents],
            "workflows_needed": [{"name": w["name"], "purpose": w["brief"]} for w in workflows],
            "context_fields": [],
            "flagged_errors": [],
        }

    context_section = ""
    if context_data:
        fields = []
        for key, value in context_data.items():
            val_type = type(value).__name__
            sample = str(value)[:80] if not isinstance(value, (str, int, float, bool)) else str(value)
            fields.append(f"  {key}: {val_type} = {sample}")
        context_section = "\nContext data fields:\n" + "\n".join(fields)

    name_override = f"\nDesired agent name override: {agent_name}" if agent_name else ""

    user_prompt = f"""Generate an agent spec analysis from this description:

Description: {description}{name_override}{context_section}"""

    result = await call_pipeline_llm_json(INTAKE_SYSTEM_PROMPT, user_prompt, temperature=0.3, key_id=1)

    if agent_name:
        result["agent_name"] = agent_name

    return result


def validate_intake_result(result: Dict[str, Any]) -> list:
    errors = []
    flagged = result.get("flagged_errors", [])
    if isinstance(flagged, list):
        errors.extend(flagged)
    if not result.get("summary") or len(result.get("summary", "")) < 5:
        errors.append("Description is too vague or empty")
    return errors

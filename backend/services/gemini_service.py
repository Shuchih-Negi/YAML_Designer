import os
import json
import httpx
from typing import Dict

SYSTEM_PROMPT = """
You are a YAML generation assistant for BharosaAI agent packages.
When given a description of an agent, you generate a complete, valid YAML package.
Return ONLY a JSON object with file names as keys and YAML content as string values.
No explanation, no markdown, no preamble. Only the JSON object.

The package must include:
- agent.yaml (with agent_id, name, description, sub_agents, workflows)
- At least one workflow_*.yaml (with workflow_id, name, nodes, edges)
- At least one stub_*.yaml per external capability (with stub_id, inputs, success_output, failure_output)
- At least one test_*.yaml (with test_id, name, initial_context, messages, expected_final_message)

Use only these node types: show_message, ask_user, save_value, condition, invoke_sub_agent, run_stub, finish.
Keep workflows simple and deterministic. Every node must have a valid next or edge.
"""


async def call_gemini(prompt: str, retry: bool = False) -> Dict[str, str]:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY environment variable not set")

    user_content = prompt
    if retry:
        user_content += "\n\nEnsure you return only valid JSON, no markdown fences."

    payload = {
        "contents": [
            {
                "role": "user",
                "parts": [{"text": f"{SYSTEM_PROMPT}\n\n{user_content}"}]
            }
        ],
        "generationConfig": {
            "temperature": 0.4,
            "maxOutputTokens": 4096,
        }
    }

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"

    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(url, json=payload)
        response.raise_for_status()
        data = response.json()

    try:
        text = data["candidates"][0]["content"]["parts"][0]["text"]
    except (KeyError, IndexError) as e:
        raise ValueError(f"Unexpected Gemini response format: {e}")

    text = text.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        text = "\n".join(lines[1:-1])

    try:
        result = json.loads(text)
    except json.JSONDecodeError:
        if not retry:
            return await call_gemini(prompt, retry=True)
        raise ValueError("Failed to parse Gemini response as JSON after retry")

    if not isinstance(result, dict):
        raise ValueError("Gemini response is not a JSON object")

    for key in result:
        if not isinstance(result[key], str):
            raise ValueError(f"File '{key}' content is not a string")

    return result


async def generate_package(description: str) -> Dict[str, str]:
    prompt = f"Generate a BharosaAI agent package based on this description:\n\n{description}"
    try:
        result = await call_gemini(prompt)
    except httpx.HTTPStatusError as e:
        raise ValueError(f"Gemini API error: {e.response.status_code} - {e.response.text}")
    except Exception as e:
        raise ValueError(f"Failed to generate package: {e}")

    return result
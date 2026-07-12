import os
import json
import asyncio
import httpx
from typing import Dict, Any, Optional


PIPELINE_SYSTEM_PROMPT = """You are a BharosaAI agent package generation assistant.
You generate valid YAML agent packages from specifications.
Return ONLY a valid JSON object with no markdown fences, no explanation, no preamble."""


_KEY_POOL: Dict[int, Optional[str]] = {
    1: os.getenv("GEMINI_API_KEY_1") or os.getenv("GEMINI_API_KEY"),
    2: os.getenv("GEMINI_API_KEY_2") or os.getenv("GEMINI_API_KEY"),
}

_GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent"

_RETRYABLE_STATUSES = {429, 500, 502, 503}
_MAX_RETRIES = 3


def _build_payload(system_prompt: str, user_prompt: str, max_tokens: int) -> dict:
    return {
        "contents": [
            {
                "role": "user",
                "parts": [{"text": f"{system_prompt}\n\n{user_prompt}"}]
            }
        ],
        "generationConfig": {
            "maxOutputTokens": max_tokens,
        }
    }


async def call_pipeline_llm(
    system_prompt: str,
    user_prompt: str,
    temperature: float = 0.4,
    max_tokens: int = 4096,
    key_id: int = 1,
) -> str:
    api_key = _KEY_POOL.get(key_id)
    if not api_key:
        raise ValueError(f"GEMINI_API_KEY_{key_id} environment variable not set")

    payload = _build_payload(system_prompt, user_prompt, max_tokens)

    async def _do_request(api_key: str) -> httpx.Response:
        headers = {"x-goog-api-key": api_key, "Content-Type": "application/json"}
        async with httpx.AsyncClient(timeout=120.0) as client:
            return await client.post(_GEMINI_URL, json=payload, headers=headers)

    last_exc: Optional[Exception] = None
    for attempt in range(_MAX_RETRIES):
        response = await _do_request(api_key)

        if response.status_code not in _RETRYABLE_STATUSES:
            last_exc = None
            break

        # Try the other key on retryable errors
        fallback_key_id = 2 if key_id == 1 else 1
        fallback_key = _KEY_POOL.get(fallback_key_id)
        if fallback_key and fallback_key != api_key:
            response = await _do_request(fallback_key)
            if response.status_code not in _RETRYABLE_STATUSES:
                last_exc = None
                break

        if attempt < _MAX_RETRIES - 1:
            wait = 2 ** attempt
            await asyncio.sleep(wait)

    if last_exc:
        raise last_exc

    response.raise_for_status()
    data = response.json()

    try:
        text = data["candidates"][0]["content"]["parts"][0]["text"]
    except (KeyError, IndexError) as e:
        raise ValueError(f"Unexpected Gemini response format: {e}")

    return text.strip()


async def call_pipeline_llm_json(
    system_prompt: str,
    user_prompt: str,
    temperature: float = 0.4,
    max_tokens: int = 4096,
    key_id: int = 1,
    retry: bool = False,
) -> Dict[str, Any]:
    text = await call_pipeline_llm(system_prompt, user_prompt, temperature, max_tokens, key_id)

    if text.startswith("```"):
        lines = text.split("\n")
        text = "\n".join(lines[1:-1])

    try:
        result = json.loads(text)
    except json.JSONDecodeError:
        if not retry:
            return await call_pipeline_llm_json(
                system_prompt + " Ensure you return only valid JSON, no markdown fences.",
                user_prompt,
                temperature,
                max_tokens,
                key_id,
                retry=True,
            )
        raise ValueError("Failed to parse Gemini response as JSON after retry")

    return result

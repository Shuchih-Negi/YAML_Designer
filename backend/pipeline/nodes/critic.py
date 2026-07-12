from typing import Dict, Any, List


CRITIC_SYSTEM_PROMPT = """You are a critic agent for BharosaAI agent packages.
Check the generated YAML package for semantic issues.

Return a JSON object with:
- pass: boolean (true if no issues found)
- issues: list of {file: str, message: str} objects

Check for these specific issues:
1. Dangling nodes: a node referenced in edges or "next" fields that doesn't exist
2. Missing condition branches: condition nodes without both on_true and on_false
3. Stub references: "run_stub" nodes that reference a stub_id with no matching stub file
4. Sub-agent references: "invoke_sub_agent" nodes that reference a non-existent sub_agent
5. Missing required fields in any file
6. Edge references to non-existent node IDs

Be thorough but practical. Minor formatting issues are not blockers.
"""

FIX_SUGGEST_SYSTEM_PROMPT = """You are a fix suggestion agent for BharosaAI agent packages.
Given the current YAML package files and a list of issues found, produce corrected file content.

Return a JSON object where keys are filenames to fix and values are the complete corrected YAML content.
Only include files that need changes. Keep the fix minimal — change only what's necessary to resolve the issue.

Healing rules:
- For dangling nodes: add the missing node or fix the reference
- For missing condition branches: add on_true/on_false fields
- For missing stub files: suggest creating the stub
- For missing sub_agent references: fix the reference or add the sub_agent
"""


async def run_critic_check(files: Dict[str, str]) -> Dict[str, Any]:
    """Shared checker — used by both pipeline critic_node and HIL /verify endpoint."""
    from ..llm import call_pipeline_llm_json

    file_previews = []
    for fname, content in files.items():
        preview = content[:600]
        file_previews.append(f"--- {fname} ---\n{preview}")

    user_prompt = f"Review this agent package for semantic issues:\n\n" + "\n\n".join(file_previews)

    result = await call_pipeline_llm_json(CRITIC_SYSTEM_PROMPT, user_prompt, temperature=0.2, key_id=1)

    if not isinstance(result.get("issues"), list):
        result["issues"] = []
    if not isinstance(result.get("pass"), bool):
        result["pass"] = len(result["issues"]) == 0

    return result


async def generate_fix_suggestion(files: Dict[str, str], issues: List[Dict[str, str]]) -> Dict[str, str]:
    """Generate suggested fix for the given files and issues. Uses key_id=2."""
    from ..llm import call_pipeline_llm_json

    file_previews = []
    for fname, content in files.items():
        preview = content[:1500]
        file_previews.append(f"--- {fname} ---\n{preview}")

    issues_text = "\n".join(f"  [{i['file']}] {i['message']}" for i in issues)

    user_prompt = f"""Current package files:
{chr(10).join(file_previews)}

Issues to fix:
{issues_text}

Suggest corrected file content for the files that need changes."""

    result = await call_pipeline_llm_json(FIX_SUGGEST_SYSTEM_PROMPT, user_prompt, temperature=0.2, max_tokens=4096, key_id=2)

    fix: Dict[str, str] = {}
    for key, value in result.items():
        fix[key] = str(value)

    return fix


async def critic_node(files: Dict[str, str]) -> Dict[str, Any]:
    """Pipeline critic node — thin wrapper around run_critic_check."""
    return await run_critic_check(files)

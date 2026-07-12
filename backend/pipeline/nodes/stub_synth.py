from typing import Dict, Any, Optional, List


STUB_SYNTH_SYSTEM_PROMPT = """You are a stub and test synthesizer for BharosaAI agent packages.
Given partial agent package files (agent.yaml, workflows, sub_agents), generate matching stub and test YAML files.

Return a JSON object where keys are filenames and values are YAML content strings.
Must include:
- stub_*.yaml for every "run_stub" node referenced in the workflows
- test_*.yaml (at least one test per workflow)

Stub format:
Each stub needs: stub_id, name, description, inputs (field: type), success_output (realistic data), failure_output (error data).
Optionally include scenario_variations for different test paths.

Test format:
Each test needs: test_id, name, description, initial_context (matching workflow context_schema),
stub_overrides (matching stub success_output fields), messages (user chat input strings),
expected_final_message, expected_status ("completed").
"""


async def stub_synth_node(architect_files: Dict[str, str], prevalidated_stubs: Optional[List[Dict[str, Any]]] = None) -> Dict[str, str]:
    from ..llm import call_pipeline_llm_json

    file_summary = "\n".join(list(architect_files.keys())[:8])
    first_workflow_yaml = ""
    for fname, content in architect_files.items():
        if "workflow" in fname.lower():
            first_workflow_yaml = content[:2000]
            break

    stubs_section = ""
    if prevalidated_stubs:
        stubs_lines = []
        for s in prevalidated_stubs:
            sid = s.get("stub_id", "?")
            inputs = s.get("inputs", {})
            output = s.get("success_output", {})
            stubs_lines.append(f"  - stub_id: {sid}, inputs: {inputs}, success_output: {output}")
        stubs_section = "\nPre-validated stub contracts to honour (generate YAML matching these):\n" + "\n".join(stubs_lines)

    user_prompt = f"""Generate stubs and tests for this agent package.

Existing files: {file_summary}

Sample workflow YAML:
{first_workflow_yaml}
{stubs_section}

Generate stub_*.yaml and test_*.yaml files that are consistent with the workflows above."""

    result = await call_pipeline_llm_json(STUB_SYNTH_SYSTEM_PROMPT, user_prompt, temperature=0.3, max_tokens=8192, key_id=2)

    files: Dict[str, str] = {}
    for key, value in result.items():
        files[key] = str(value)

    return files

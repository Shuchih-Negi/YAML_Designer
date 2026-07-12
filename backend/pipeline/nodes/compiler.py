import re
from typing import Dict, Any


def normalize_yaml(content: str) -> str:
    lines = content.split("\n")
    normalized = []
    for line in lines:
        stripped = line.rstrip()
        if stripped or normalized:
            normalized.append(stripped)
    text = "\n".join(normalized)
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text.strip() + "\n"


def compiler_node(
    architect_files: Dict[str, str],
    stub_synth_files: Dict[str, str],
) -> Dict[str, str]:
    merged: Dict[str, str] = {}

    for fname, content in architect_files.items():
        merged[fname] = normalize_yaml(content)

    for fname, content in stub_synth_files.items():
        if fname not in merged:
            merged[fname] = normalize_yaml(content)

    if not merged:
        raise ValueError("Compiler produced empty file set")

    return merged

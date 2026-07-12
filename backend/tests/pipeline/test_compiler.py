import pytest
from pipeline.nodes.compiler import compiler_node, normalize_yaml


def test_normalize_yaml_removes_trailing_whitespace():
    result = normalize_yaml("  hello  \n  world  \n")
    assert "hello" in result
    assert "world" in result
    assert not any(line.endswith(" ") for line in result.split("\n") if line.strip() == "" or line.strip())


def test_normalize_yaml_collapses_blank_lines():
    result = normalize_yaml("a\n\n\n\nb")
    assert "a\n\nb" in result or "a\nb" in result


def test_compiler_merges_two_sources():
    arch = {"agent.yaml": "agent_id: test\nname: Test\n"}
    stub = {"stub_test.yaml": "stub_id: stub_test\ninputs: {}\n"}

    result = compiler_node(arch, stub)
    assert "agent.yaml" in result
    assert "stub_test.yaml" in result
    assert result["agent.yaml"] == "agent_id: test\nname: Test\n"


def test_compiler_architect_takes_priority():
    arch = {"agent.yaml": "agent_id: arch\n"}
    stub = {"agent.yaml": "agent_id: stub\n"}

    result = compiler_node(arch, stub)
    assert result["agent.yaml"] == "agent_id: arch\n"


def test_compiler_raises_on_empty():
    with pytest.raises(ValueError, match="empty"):
        compiler_node({}, {})


def test_compiler_handles_empty_stubs():
    arch = {"agent.yaml": "agent_id: test\nname: Test\n"}
    result = compiler_node(arch, {})
    assert "agent.yaml" in result
    assert len(result) == 1

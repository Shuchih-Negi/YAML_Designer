import tempfile
import pytest
from services.file_store import save_package, load_package, list_agents, delete_package, agent_exists


def test_save_and_load_roundtrip():
    with tempfile.TemporaryDirectory() as tmpdir:
        files = {"agent.yaml": "agent_id: x\nname: X\nsub_agents: []\nworkflows: []\n"}
        save_package("test_agent", files, base_dir=tmpdir)
        loaded = load_package("test_agent", base_dir=tmpdir)
        assert "agent.yaml" in loaded
        assert loaded["agent.yaml"] == files["agent.yaml"]

def test_save_rejects_path_traversal():
    with pytest.raises(ValueError):
        save_package("../../etc/passwd", {})

def test_save_rejects_invalid_chars():
    with pytest.raises(ValueError):
        save_package("bad@id", {})

def test_load_nonexistent_raises():
    with tempfile.TemporaryDirectory() as tmpdir:
        with pytest.raises(FileNotFoundError):
            load_package("does_not_exist", base_dir=tmpdir)

def test_list_agents():
    with tempfile.TemporaryDirectory() as tmpdir:
        save_package("agent_a", {"agent.yaml": "agent_id: a\nname: A\nsub_agents: []\nworkflows: []\n"}, base_dir=tmpdir)
        save_package("agent_b", {"agent.yaml": "agent_id: b\nname: B\nsub_agents: []\nworkflows: []\n"}, base_dir=tmpdir)
        agents = list_agents(base_dir=tmpdir)
        assert "agent_a" in agents
        assert "agent_b" in agents
        assert len(agents) == 2

def test_list_agents_empty():
    with tempfile.TemporaryDirectory() as tmpdir:
        agents = list_agents(base_dir=tmpdir)
        assert agents == []

def test_delete_package():
    with tempfile.TemporaryDirectory() as tmpdir:
        save_package("to_delete", {"agent.yaml": "agent_id: x\nname: X\nsub_agents: []\nworkflows: []\n"}, base_dir=tmpdir)
        assert agent_exists("to_delete", base_dir=tmpdir)
        delete_package("to_delete", base_dir=tmpdir)
        assert not agent_exists("to_delete", base_dir=tmpdir)

def test_agent_exists():
    with tempfile.TemporaryDirectory() as tmpdir:
        assert not agent_exists("missing", base_dir=tmpdir)
        save_package("exists", {"agent.yaml": "agent_id: x\nname: X\nsub_agents: []\nworkflows: []\n"}, base_dir=tmpdir)
        assert agent_exists("exists", base_dir=tmpdir)
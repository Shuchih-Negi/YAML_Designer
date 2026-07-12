import pytest
from pipeline.state import create_draft, get_draft, update_draft, delete_draft, _sweep_expired, _draft_store


def setup_method():
    _draft_store.clear()


def test_create_and_get_draft():
    draft = create_draft("A loan review agent", {"key": "value"})
    assert draft.draft_id
    assert draft.description == "A loan review agent"
    assert draft.context_data == {"key": "value"}
    assert draft.status == "generating"

    loaded = get_draft(draft.draft_id)
    assert loaded is not None
    assert loaded.draft_id == draft.draft_id


def test_get_nonexistent_draft():
    assert get_draft("nonexistent") is None


def test_update_draft():
    draft = create_draft("Test agent")
    updated = update_draft(draft.draft_id, status="ready", files={"agent.yaml": "content"})
    assert updated is not None
    assert updated.status == "ready"
    assert updated.files == {"agent.yaml": "content"}


def test_update_nonexistent_draft():
    assert update_draft("nonexistent", status="done") is None


def test_delete_draft():
    draft = create_draft("Delete me")
    assert delete_draft(draft.draft_id) is True
    assert get_draft(draft.draft_id) is None
    assert delete_draft(draft.draft_id) is False


def test_delete_nonexistent():
    assert delete_draft("nonexistent") is False


def test_create_draft_sweeps_expired():
    from datetime import datetime, timezone, timedelta
    from pipeline.state import DraftRecord

    old_id = "old_draft"
    _draft_store[old_id] = DraftRecord(
        draft_id=old_id,
        description="old",
        context_data=None,
        created_at=datetime.now(timezone.utc) - timedelta(hours=2),
    )
    _draft_store["fresh"] = DraftRecord(
        draft_id="fresh",
        description="fresh",
        context_data=None,
    )

    assert old_id in _draft_store
    create_draft("new agent")
    assert old_id not in _draft_store
    assert "fresh" in _draft_store

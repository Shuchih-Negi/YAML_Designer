import uuid
import time
from dataclasses import dataclass, field
from typing import Dict, Any, Optional
from datetime import datetime, timezone


@dataclass
class DraftRecord:
    draft_id: str
    description: str
    context_data: Optional[Dict[str, Any]]
    context_profile: Optional[Dict[str, Any]] = None
    plan: Optional[Dict[str, Any]] = None
    files: Optional[Dict[str, str]] = None
    status: str = "generating"
    failed_step: Optional[str] = None
    failure_reason: Optional[str] = None
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    # HIL Verification Loop fields
    hil_status: str = "editing"  # editing | testing | fix_proposed | approved
    last_test_result: Optional[Dict[str, Any]] = None
    proposed_fix: Optional[Dict[str, str]] = None
    iteration_count: int = 0


MAX_HIL_ITERATIONS = 8


_draft_store: Dict[str, DraftRecord] = {}
DRAFT_TTL_SECONDS = 3600


def _sweep_expired():
    now = datetime.now(timezone.utc)
    expired = [
        did for did, rec in _draft_store.items()
        if (now - rec.created_at).total_seconds() > DRAFT_TTL_SECONDS
    ]
    for did in expired:
        del _draft_store[did]


def create_draft(description: str, context_data: Optional[Dict[str, Any]] = None) -> DraftRecord:
    _sweep_expired()
    draft_id = uuid.uuid4().hex[:12]
    record = DraftRecord(
        draft_id=draft_id,
        description=description,
        context_data=context_data,
    )
    _draft_store[draft_id] = record
    return record


def get_draft(draft_id: str) -> Optional[DraftRecord]:
    _sweep_expired()
    return _draft_store.get(draft_id)


def update_draft(draft_id: str, **kwargs) -> Optional[DraftRecord]:
    record = get_draft(draft_id)
    if record is None:
        return None
    for key, value in kwargs.items():
        if hasattr(record, key):
            setattr(record, key, value)
    return record


def delete_draft(draft_id: str) -> bool:
    _sweep_expired()
    if draft_id in _draft_store:
        del _draft_store[draft_id]
        return True
    return False

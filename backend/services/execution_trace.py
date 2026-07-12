from typing import Dict, Any, List, Optional
from datetime import datetime
import uuid
from datetime import datetime, timezone


class NodeVisit:
    def __init__(self, node_id: str, node_type: str, details: Dict[str, Any], status: str):
        self.node_id = node_id
        self.node_type = node_type
        self.details = details
        self.status = status
        self.timestamp = datetime.now(timezone.utc).isoformat()

    def to_dict(self) -> dict:
        return {
            "node_id": self.node_id,
            "node_type": self.node_type,
            "details": self.details,
            "status": self.status,
            "timestamp": self.timestamp,
        }


class ExecutionTrace:
    def __init__(self):
        self.execution_id = str(uuid.uuid4())[:8]
        self.workflow_id: str = ""
        self.initial_context: Dict[str, Any] = {}
        self.visits: List[NodeVisit] = []
        self.start_time: str = ""
        self.end_time: str = ""
        self.final_status: str = ""
        self.final_message: str = ""

    def start_workflow(self, workflow_id: str, context: Dict[str, Any]):
        self.workflow_id = workflow_id
        self.initial_context = dict(context)
        self.start_time = datetime.now(timezone.utc).isoformat()

    def add_visit(self, node_id: str, node_type: str, details: Dict[str, Any], status: str = "success"):
        visit = NodeVisit(node_id, node_type, details, status)
        self.visits.append(visit)

    def complete(self, status: str, message: str = ""):
        self.final_status = status
        self.final_message = message
        self.end_time = datetime.now(timezone.utc).isoformat()

    def to_dict(self) -> dict:
        return {
            "execution_id": self.execution_id,
            "workflow_id": self.workflow_id,
            "start_time": self.start_time,
            "end_time": self.end_time,
            "final_status": self.final_status,
            "final_message": self.final_message,
            "visit_count": len(self.visits),
            "visits": [v.to_dict() for v in self.visits],
        }
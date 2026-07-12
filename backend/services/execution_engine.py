from typing import Dict, Any, List, Optional
from datetime import datetime
from .execution_trace import ExecutionTrace, NodeVisit


class ExecutionContext:
    def __init__(self, initial_context: Dict[str, Any]):
        self.variables = dict(initial_context)
        self.stub_responses: Dict[str, Dict[str, Any]] = {}
        self.message_log: List[str] = []

    def set(self, key: str, value: Any):
        self.variables[key] = value

    def get(self, key: str, default: Any = None) -> Any:
        return self.variables.get(key, default)

    def evaluate_condition(self, condition: str) -> bool:
        safe_context = {}
        for k, v in self.variables.items():
            if isinstance(v, (str, int, float, bool)):
                safe_context[k] = v
        try:
            result = eval(condition, {"__builtins__": {}}, safe_context)
            return bool(result)
        except Exception:
            return False


class ExecutionEngine:
    def __init__(self):
        self.trace = ExecutionTrace()

    async def run_workflow(
        self,
        workflow: dict,
        agent: dict,
        sub_agents: List[dict],
        stubs: List[dict],
        tests: List[dict],
        initial_context: Dict[str, Any],
        test_id: Optional[str] = None,
    ) -> dict:
        ctx = ExecutionContext(initial_context)
        workflow_id = workflow.get("workflow_id", "unknown")
        self.trace.start_workflow(workflow_id, initial_context)

        nodes = workflow.get("nodes", [])
        edges = workflow.get("edges", [])
        node_map = {}
        for n in nodes:
            nid = n.get("id")
            if nid:
                node_map[nid] = n

        def find_next(current_id: str, condition_context: Optional[str] = None) -> Optional[str]:
            matching = [e for e in edges if e["from"] == current_id]
            if not matching:
                node = node_map.get(current_id, {})
                return node.get("next")

            for edge in matching:
                cond = edge.get("condition")
                if cond:
                    if condition_context is not None:
                        if cond == condition_context:
                            return edge["to"]
                    elif ctx.evaluate_condition(cond):
                        return edge["to"]
                else:
                    return edge["to"]

            if matching:
                return matching[0]["to"]
            return None

        current_id = "start"
        max_steps = 100
        step_count = 0
        final_message = ""
        final_status = "completed"

        while current_id and step_count < max_steps:
            step_count += 1
            node = node_map.get(current_id)
            if not node:
                self.trace.add_visit(current_id, "unknown", {"error": f"Node not found: {current_id}"}, "error")
                break

            node_type = node.get("type", "unknown")
            details: Dict[str, Any] = {"node_id": current_id, "type": node_type}

            if node_type == "show_message":
                msg = node.get("message", "")
                ctx.message_log.append(msg)
                details["message"] = msg
                next_id = find_next(current_id)

            elif node_type == "ask_user":
                prompt = node.get("prompt", "")
                saves_to = node.get("saves_to", "")
                if saves_to:
                    ctx.set(saves_to, ctx.get(saves_to, ""))
                details["prompt"] = prompt
                details["saves_to"] = saves_to
                next_id = find_next(current_id)

            elif node_type == "save_value":
                expr = node.get("value", "")
                saves_to = node.get("saves_to", "")
                if saves_to:
                    ctx.set(saves_to, expr)
                details["saves_to"] = saves_to
                details["value"] = expr
                next_id = find_next(current_id)

            elif node_type == "condition":
                condition = node.get("condition", "")
                on_true = node.get("on_true", "")
                on_false = node.get("on_false", "")
                result = ctx.evaluate_condition(condition)
                next_id = on_true if result else on_false
                details["condition"] = condition
                details["result"] = result

            elif node_type == "invoke_sub_agent":
                sub_id = node.get("sub_agent_id", "")
                wf_id = node.get("workflow_id", "")
                details["sub_agent_id"] = sub_id
                details["workflow_id"] = wf_id
                sub = next((s for s in sub_agents if s.get("sub_agent_id") == sub_id), None)
                if sub:
                    details["sub_agent_name"] = sub.get("name", sub_id)
                next_id = find_next(current_id)

            elif node_type == "run_stub":
                stub_id = node.get("stub_id", "")
                details["stub_id"] = stub_id
                stub = next((s for s in stubs if s.get("stub_id") == stub_id), None)
                if stub:
                    details["stub_name"] = stub.get("name", stub_id)
                    ctx.stub_responses[stub_id] = stub.get("success_output", {})
                next_id = find_next(current_id)

            elif node_type == "finish":
                final_message = node.get("message", "Completed.")
                details["message"] = final_message
                next_id = None

            else:
                details["error"] = f"Unknown node type: {node_type}"
                next_id = find_next(current_id)

            status = "success" if "error" not in details else "error"
            self.trace.add_visit(current_id, node_type, details, status)
            current_id = next_id

        if step_count >= max_steps:
            final_status = "timeout"

        self.trace.complete(final_status, final_message)

        return {
            "execution_id": self.trace.execution_id,
            "workflow_id": workflow_id,
            "status": final_status,
            "final_message": final_message,
            "context": dict(ctx.variables),
            "stub_responses": dict(ctx.stub_responses),
            "message_log": ctx.message_log,
            "trace": self.trace.to_dict(),
            "steps": step_count,
        }
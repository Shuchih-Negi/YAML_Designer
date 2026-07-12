from typing import Dict, Any, Optional, TypedDict, Literal, List
from langgraph.graph import StateGraph


class PipelineState(TypedDict):
    description: str
    context_data: Optional[Dict[str, Any]]
    agent_name: Optional[str]
    sub_agents: Optional[List[Dict[str, Any]]]
    workflows: Optional[List[Dict[str, Any]]]
    stubs: Optional[List[Dict[str, Any]]]
    intake_result: Optional[Dict[str, Any]]
    plan: Optional[Dict[str, Any]]
    architect_files: Optional[Dict[str, str]]
    stub_synth_files: Optional[Dict[str, str]]
    files: Optional[Dict[str, str]]
    critic_result: Optional[Dict[str, Any]]
    planner_summary: Optional[str]
    retry_count: int
    failed_step: Optional[str]
    failure_reason: Optional[str]


MAX_RETRIES = 2


def _skip_if_failed(state: PipelineState) -> bool:
    return state.get("failed_step") is not None


async def run_intake(state: PipelineState) -> dict:
    if _skip_if_failed(state):
        return {}
    from .nodes.intake import intake_node
    try:
        result = await intake_node(
            description=state["description"],
            context_data=state.get("context_data"),
            agent_name=state.get("agent_name"),
            sub_agents=state.get("sub_agents"),
            workflows=state.get("workflows"),
        )
        return {"intake_result": result, "failed_step": None, "failure_reason": None}
    except Exception as e:
        return {"failed_step": "intake", "failure_reason": str(e)}


async def run_planner(state: PipelineState) -> dict:
    if _skip_if_failed(state):
        return {}
    from .nodes.planner import planner_node
    try:
        plan = await planner_node(state["intake_result"], sub_agents=state.get("sub_agents"), workflows=state.get("workflows"))
        summary = f"Agent: {plan.get('agent_name', plan.get('agent_id', ''))} — {plan.get('agent_description', '')} with {len(plan.get('workflows', []))} workflows and {len(plan.get('sub_agents', []))} sub-agents"
        return {"plan": plan, "planner_summary": summary, "failed_step": None, "failure_reason": None}
    except Exception as e:
        return {"failed_step": "planner", "failure_reason": str(e)}


async def run_architect(state: PipelineState) -> dict:
    if _skip_if_failed(state):
        return {}
    from .nodes.architect import architect_node
    try:
        files = await architect_node(state["plan"])
        return {"architect_files": files, "failed_step": None, "failure_reason": None}
    except Exception as e:
        return {"failed_step": "architect", "failure_reason": str(e)}


async def run_stub_synth(state: PipelineState) -> dict:
    if _skip_if_failed(state):
        return {}
    from .nodes.stub_synth import stub_synth_node
    try:
        files = await stub_synth_node(state["architect_files"], prevalidated_stubs=state.get("stubs"))
        return {"stub_synth_files": files, "failed_step": None, "failure_reason": None}
    except Exception as e:
        return {"failed_step": "stub_synth", "failure_reason": str(e)}


async def run_compiler(state: PipelineState) -> dict:
    if _skip_if_failed(state):
        return {}
    from .nodes.compiler import compiler_node
    try:
        files = compiler_node(
            architect_files=state["architect_files"],
            stub_synth_files=state["stub_synth_files"],
        )
        return {"files": files, "failed_step": None, "failure_reason": None}
    except Exception as e:
        return {"failed_step": "compiler", "failure_reason": str(e)}


async def run_critic(state: PipelineState) -> dict:
    if _skip_if_failed(state):
        return {}
    from .nodes.critic import critic_node
    try:
        result = await critic_node(state["files"])
        return {
            "critic_result": result,
            "retry_count": state.get("retry_count", 0) + 1,
            "failed_step": None,
            "failure_reason": None,
        }
    except Exception as e:
        return {
            "critic_result": {"pass": False, "issues": [{"file": "critic", "message": str(e)}]},
            "retry_count": state.get("retry_count", 0) + 1,
        }


def critic_router(state: PipelineState) -> Literal["architect", "__end__"]:
    if state.get("failed_step"):
        return "__end__"
    critic = state.get("critic_result", {})
    retry_count = state.get("retry_count", 0)

    if critic.get("pass") is False and retry_count < MAX_RETRIES:
        return "architect"
    return "__end__"


def build_pipeline_graph() -> StateGraph:
    workflow = StateGraph(PipelineState)

    workflow.add_node("intake", run_intake)
    workflow.add_node("planner", run_planner)
    workflow.add_node("architect", run_architect)
    workflow.add_node("stub_synth", run_stub_synth)
    workflow.add_node("compiler", run_compiler)
    workflow.add_node("critic", run_critic)

    workflow.set_entry_point("intake")

    workflow.add_edge("intake", "planner")
    workflow.add_edge("planner", "architect")
    workflow.add_edge("architect", "stub_synth")
    workflow.add_edge("stub_synth", "compiler")
    workflow.add_edge("compiler", "critic")

    workflow.add_conditional_edges(
        "critic",
        critic_router,
        {"architect": "architect", "__end__": "__end__"},
    )

    return workflow.compile()


async def run_pipeline(
    description: str,
    context_data: Optional[Dict[str, Any]] = None,
    agent_name: Optional[str] = None,
    sub_agents: Optional[List[Dict[str, Any]]] = None,
    workflows: Optional[List[Dict[str, Any]]] = None,
    stubs: Optional[List[Dict[str, Any]]] = None,
) -> PipelineState:
    graph = build_pipeline_graph()

    initial_state: PipelineState = {
        "description": description,
        "context_data": context_data,
        "agent_name": agent_name,
        "sub_agents": sub_agents,
        "workflows": workflows,
        "stubs": stubs,
        "intake_result": None,
        "plan": None,
        "architect_files": None,
        "stub_synth_files": None,
        "files": None,
        "critic_result": None,
        "planner_summary": None,
        "retry_count": 0,
        "failed_step": None,
        "failure_reason": None,
    }

    result = await graph.ainvoke(initial_state)
    return result

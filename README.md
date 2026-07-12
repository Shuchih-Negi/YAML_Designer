# YAML Agent Designer

> AI-powered visual designer for BharosaAI agent packages — describe your agent in natural language and get a complete, validated, testable YAML package in minutes.

[![Stack](https://img.shields.io/badge/stack-FastAPI+React+LangGraph-10B981?style=flat)](https://fastapi.tiangolo.com)
[![Python](https://img.shields.io/badge/python-3.13-3776AB?logo=python&logoColor=white)](https://python.org)
[![TypeScript](https://img.shields.io/badge/typescript-6.0-3178C6?logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Tests](https://img.shields.io/badge/tests-99%20passing-brightgreen)](backend/tests)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

---

## Overview

Hand-writing BharosaAI agent YAML — metadata, sub-agents, workflow node graphs, external-capability stubs, test cases — is slow and error-prone. **YAML Agent Designer** replaces that with a guided pipeline: describe the agent, confirm its structure, let a 6-node LangGraph pipeline generate the full package, then verify and fix it in a human-in-the-loop editor before publishing.

A generated package includes:

| File | Purpose |
|---|---|
| `agent.yaml` | Agent metadata, sub-agent references, workflow list |
| `workflow_*.yaml` | Typed node graphs (`show_message`, `ask_user`, `condition`, `run_stub`, `invoke_sub_agent`, `save_value`, `finish`) |
| `stub_*.yaml` | External capability contracts (inputs + success output) |
| `test_*.yaml` | Test cases with initial context + expected outcome |

---

## How it works

There are two ways to generate a package:

**1. Simple Generate** (`/generate`) — one free-text description in, one AI pipeline call, complete package out. Good for quick prototypes.

**2. Context Pipeline** (`/context-pipeline/generate`) — the full guided flow, built for production use:

```
High-Level Goal
      │
      ▼
[ ✨ Suggest structure ]  ──►  Sub-Agents + Workflows (editable rows)
      │
      ▼
Stubs (user-defined, pre-flight validated)
      │
      ▼
Context Data (FinLens tenant picker, or raw JSON)
      │
      ▼
6-node LangGraph pipeline ──► generated package (draft)
      │
      ▼
HIL Verification Loop:  Test → Issues found → Apply fix / edit manually → Test again
      │
      ▼
Approve → Publish → Download ZIP
```

### The 6-node pipeline

| Node | Type | Job |
|---|---|---|
| **Intake** | LLM | Parses intent, identifies sub-agents & workflows |
| **Planner** | LLM | Produces a structured architecture plan |
| **Architect** | LLM | Generates `agent.yaml` + `workflow_*.yaml` + `sub_agent_*.yaml` |
| **Stub Synth** | LLM | Finds `run_stub` references, generates `stub_*.yaml` + `test_*.yaml` |
| **Compiler** | Python (no LLM) | Merges and normalizes all generated files |
| **Critic** | LLM | Semantic QA — dangling nodes, missing branches, broken references — loops back to Architect (max 2 retries) on failure |

### Structured intake, pre-flight validated

Instead of one paragraph the pipeline has to reverse-engineer, the Context Pipeline form captures structure directly:
- **Sub-Agents** and **Workflows** as add/remove rows, each either typed by hand or proposed by `POST /context-pipeline/suggest-structure` and then edited/confirmed
- **Stubs** are defined up front (inputs + expected success output) and checked by `POST /context-pipeline/validate-stubs` *before* any LLM pipeline call — catching duplicate IDs, unreferenced stubs, and missing inputs for free
- **Context Data** comes from a searchable FinLens tenant picker (`GET /context-pipeline/tenants`, `GET /context-pipeline/tenants/{tenant_id}/context`) rather than hand-pasted JSON, using a fixed schema (`tenant_id`, `consolidated_tier_1_metrics`, `monthly_analysis_summary`, `top_10_parties_with_highest_credits/debits`, `WEIGHTS`/`THRESHOLDS`, etc. — see `backend/services/finlens_context.py`)

### HIL Verification Loop

Once a draft is generated, it isn't published blind:

- `POST /context-pipeline/{draft_id}/verify` — runs the tester against the draft's *current* files (including any manual edits), returns pass/fail + specific issues + a suggested fix
- `POST /context-pipeline/{draft_id}/apply-fix` — accepts the suggested fix and updates the draft
- `POST /context-pipeline/{draft_id}/approve` — unlocks publish once the user is satisfied
- Users can also edit files directly in the Monaco editor between verify calls instead of accepting the AI's fix
- Capped at 8 iterations per draft as a safety valve against runaway loops

### Dual-key Gemini pooling

`backend/pipeline/llm.py` maintains two Gemini API keys (`GEMINI_API_KEY_1` / `GEMINI_API_KEY_2`, falling back to a single `GEMINI_API_KEY` if only one is set). On a `429`/`500`/`502`/`503` response, a call automatically retries on the other key before falling back to exponential backoff (up to 3 attempts total) — spreading load across both keys to reduce how often a single key's rate limit is hit during a pipeline run.

---

## Beyond generation: viewing and testing agents

Every agent has a detail page with 7 tabs:

- **Overview** — metadata + hierarchy tree (agent → sub-agents → workflows)
- **Workflows** — readable per-workflow node/edge listing
- **Graph** — visual workflow diagram (React Flow + dagre auto-layout, color-coded by node type, animated conditional edges)
- **Stubs** — each external capability's input/output contract
- **Tests** — run one test or all tests against the package
- **Execution** — history of past runs, drillable into a full step-by-step trace
- **YAML Preview** — raw file contents

Under the hood, `ExecutionEngine.run_workflow()` (`backend/services/execution_engine.py`) is a real deterministic interpreter: it walks the node graph, evaluates `condition` nodes via a sandboxed `eval()` (no builtins), resolves `run_stub` and `invoke_sub_agent` nodes against mock data, and guards against infinite loops with a 100-step cap. Every step is logged to an `ExecutionTrace` for replay.

Existing YAML packages can also be imported via the **Upload** page — `yaml_parser.py` validates structure and cross-references (e.g. every workflow `agent.yaml` lists actually exists as a file) on the way in, the same validation logic that gates `/validate` and `/publish` for AI-generated packages.

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript 6, Vite 8, Tailwind CSS 4 |
| Backend | Python 3.13, FastAPI, LangGraph 0.4 |
| AI | Google Gemini (dual-key pooled, `x-goog-api-key` header) |
| Editor / Viz | Monaco Editor, React Flow (`@xyflow/react`), dagre auto-layout |
| Infra | Docker, Docker Compose, Nginx |

---

## Project structure

```
├── backend/
│   ├── main.py                  # FastAPI app, CORS, router registration
│   ├── pipeline/
│   │   ├── graph.py              # 6-node LangGraph definition + retry routing
│   │   ├── llm.py                # Dual-key Gemini client with failover
│   │   ├── state.py               # In-memory draft store (TTL-based)
│   │   └── nodes/                 # intake, planner, architect, stub_synth, compiler, critic
│   ├── routes/
│   │   ├── generate.py            # Simple Generate endpoint
│   │   ├── context_pipeline.py    # Structured intake, HIL loop, publish, ZIP download
│   │   ├── agents.py               # List/get/upload/delete agent packages
│   │   └── execution.py            # Test running, execution history
│   ├── services/
│   │   ├── yaml_parser.py           # Structural + cross-reference validation
│   │   ├── execution_engine.py       # Deterministic workflow interpreter
│   │   ├── execution_trace.py        # Step-by-step run logging
│   │   ├── finlens_context.py         # FinLens tenant context schema + lookup
│   │   ├── context_service.py         # Bank-statement context schema/validation
│   │   ├── context_to_yaml.py         # Context → YAML package conversion
│   │   ├── file_store.py               # Agent package persistence
│   │   └── gemini_service.py
│   └── tests/                          # 99 pytest tests (pipeline nodes, routes, services, e2e)
├── frontend/src/
│   ├── pages/                    # AgentListPage, AgentDetailPage, GeneratePage, ContextGeneratePage, UploadPage
│   └── components/
│       ├── pipeline/              # SpecForm, DraftGraphPreview, MultiFileEditor, ValidationPanel
│       ├── agents/                 # AgentTree, WorkflowGraph, StubPanel, TestCasePanel, ExecutionTab, WorkflowPanel
│       └── shared/                  # YamlPreview, StatusBadge, ErrorBanner, EmptyState
└── docker-compose.yml
```

---

## Quick start

**With Docker:**

```bash
# 1. Create backend/.env with your Gemini key(s)
cat > backend/.env <<EOF
GEMINI_API_KEY_1=your_key_here
GEMINI_API_KEY_2=your_second_key_here   # optional — falls back to GEMINI_API_KEY_1 if unset
EOF

# 2. Build and run
docker compose up --build
```

- Frontend → http://localhost
- Backend API → http://localhost:8000
- Health check → http://localhost:8000/health

**Without Docker:**

```bash
# Backend
cd backend
pip install -r requirements.txt
export GEMINI_API_KEY_1=your_key_here
uvicorn main:app --reload --port 8000

# Frontend (separate terminal)
cd frontend
npm install
npm run dev   # http://localhost:5173
```

**Running tests:**

```bash
cd backend
pytest   # 99 tests — pipeline nodes, routes, services, end-to-end graph execution
```


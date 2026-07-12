# YAML Agent Designer

> AI-powered visual designer for BharosaAI agent packages — describe your agent in natural language and get a complete, validated YAML package.

[![Stack](https://img.shields.io/badge/stack-FastAPI+React+LangGraph-10B981?style=flat)](https://fastapi.tiangolo.com)
[![Python](https://img.shields.io/badge/python-3.13-3776AB?logo=python&logoColor=white)](https://python.org)
[![TypeScript](https://img.shields.io/badge/typescript-6.0-3178C6?logo=typescript&logoColor=white)](https://typescriptlang.org)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

---

## Overview

**YAML Agent Designer** is a full-stack application that converts natural language descriptions into structured BharosaAI agent YAML packages. Instead of hand-writing YAML, describe what your agent should do — and a multi-agent LangGraph pipeline (powered by Google Gemini) plans, architects, generates, and validates the entire package.

### Generated Package Includes
- **`agent.yaml`** — agent metadata, sub-agent references, workflow list
- **`workflow_*.yaml`** — typed node graphs (show_message, condition, run_stub, etc.)
- **`stub_*.yaml`** — external capability definitions
- **`test_*.yaml`** — test cases with expected outcomes

---

## Pipeline Architecture

```
Spec Form → LangGraph Pipeline (6 nodes) → Validator → ZIP / Publish
```

| Node | What it does |
|------|-------------|
| **Intake** | Parses description, extracts intent, identifies sub-agents & workflows |
| **Planner** | Produces structured architecture plan |
| **Architect** | Generates agent.yaml, workflows, sub_agent YAML files |
| **Stub Synth** | Discovers run_stub references → generates stub + test YAML |
| **Compiler** | Merges and normalizes all files (no LLM) |
| **Critic** | QA validation; triggers retry loop if issues found |

---

## Quick Start

```bash
# 1. Set your Gemini API key
cp backend/.env.example backend/.env
# Edit backend/.env → set GEMINI_API_KEY

# 2. Run with Docker
docker compose up --build

# Or without Docker:
cd backend && pip install -r requirements.txt && uvicorn main:app --reload --port 8000
cd frontend && npm install && npm run dev
```

- Frontend → http://localhost (or http://localhost:5173)
- Backend API → http://localhost:8000
- Health check → http://localhost:8000/health

---

## Project Structure

```
├── agent-designer/          # Full application source
│   ├── backend/             # FastAPI + LangGraph pipeline
│   │   ├── pipeline/        # 6-node LangGraph graph
│   │   ├── routes/          # REST API endpoints
│   │   ├── services/        # File store, YAML parser, execution engine
│   │   └── tests/           # 99+ pytest tests
│   ├── frontend/            # React 19 + TypeScript SPA
│   │   └── src/
│   │       ├── pages/       # Agent list, detail, generate, upload
│   │       └── components/  # Agents, pipeline, layout, shared
│   └── docker-compose.yml
├── AGENT_DESIGNER_MASTER.md
├── CONTEXT_PIPELINE_MASTER.md
└── GENERATE_YAML_EVOLUTION_PLAN.md
```

> Detailed documentation is available in [`agent-designer/README.md`](agent-designer/README.md).

---

## Features

- **AI Pipeline** — 6-node LangGraph with Gemini 3.5 Flash, dual-key failover, 429/503 retry
- **Structured Spec Form** — dynamic sub-agent/workflow rows, AI-suggested structure, tenant context picker, stub integrity checker
- **HIL Verification Loop** — run tests → review issues → apply fix → approve (up to 8 iterations)
- **Visual Graph Editor** — React Flow workflow graphs, 7 typed node colours, auto-layout
- **Multi-File Editor** — Monaco Editor with file-tab sidebar
- **Test Execution** — deterministic workflow runner with condition handling, execution traces
- **Validation & Publish** — structural YAML validation, one-click publish, ZIP download
- **Docker** — multi-stage frontend build, docker-compose orchestration

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript 6, Vite 8, Tailwind CSS 4 |
| Backend | Python 3.13, FastAPI, LangGraph |
| AI | Google Gemini 3.5 Flash (auth key `AQ.` via `x-goog-api-key` header) |
| Editor | Monaco Editor, React Flow, dagre |
| Infra | Docker, Docker Compose, Nginx |

---

## License

MIT

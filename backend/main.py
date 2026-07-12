from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

from routes.agents import router as agents_router
from routes.generate import router as generate_router
from routes.execution import router as execution_router
from routes.context_pipeline import router as context_pipeline_router

load_dotenv()

app = FastAPI(title="Agent Designer API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:5173").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(agents_router, prefix="")
app.include_router(generate_router, prefix="")
app.include_router(execution_router, prefix="")
app.include_router(context_pipeline_router, prefix="")

@app.get("/health")
async def health():
    return {"status": "ok", "version": "1.0.0"}
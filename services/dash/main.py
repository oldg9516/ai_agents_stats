"""Dash Analytics Agent — FastAPI entrypoint.

Runs AgentOS (Agno agent with SSE streaming) and the AG-UI adapter
for CopilotKit integration in a single process.
"""

import os
import time

import structlog
import uvicorn
from fastapi import FastAPI
from sqlalchemy import create_engine, text

logger = structlog.get_logger()

PORT = int(os.environ.get("PORT", "9000"))


def wait_for_db(db_url: str, max_retries: int = 30, delay: float = 2.0):
    """Wait for the agent database to be ready."""
    engine = create_engine(db_url, pool_pre_ping=True)
    for attempt in range(1, max_retries + 1):
        try:
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            logger.info("Database ready", attempt=attempt)
            engine.dispose()
            return
        except Exception as exc:
            logger.warning("DB not ready", attempt=attempt, error=str(exc))
            time.sleep(delay)
    raise RuntimeError(f"DB not reachable after {max_retries} attempts")


def create_app() -> FastAPI:
    """Create the FastAPI application with AgentOS and AG-UI adapter."""
    from agno.os import AgentOS

    from dash.agent import dash
    from db.session import get_agent_db
    from api.dash_copilot import router as copilot_router

    # Main FastAPI app
    app = FastAPI(title="Dash Analytics Agent")

    # Health check
    @app.get("/health")
    async def health():
        return {"status": "ok", "agent": "dash"}

    # Mount AgentOS (Agno agent endpoints)
    agent_os = AgentOS(
        name="Dash Analytics",
        agents=[dash],
        tracing=True,
        db=get_agent_db(),
    )
    app.mount("/dash-os", agent_os.get_app())

    # Mount AG-UI adapter for CopilotKit
    app.include_router(copilot_router)

    return app


if __name__ == "__main__":
    from db.url import AGENT_DB_URL

    wait_for_db(AGENT_DB_URL)
    app = create_app()
    uvicorn.run(app, host="0.0.0.0", port=PORT)

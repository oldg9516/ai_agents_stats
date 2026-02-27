"""Dash Standalone — FastAPI entrypoint.

Self-learning SQL analytics agent with AG-UI adapter for CopilotKit.
Connect to any PostgreSQL or MySQL database via DATA_DB_URL environment variable.
On first startup, auto-discovers schema and loads it into the knowledge base.
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
    """Wait for the database to be ready."""
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


def auto_discover_schema():
    """Auto-discover DATA_DB schema and load into knowledge base."""
    try:
        from scripts.auto_discover import discover_and_load
        logger.info("Running auto-discovery of database schema...")
        discover_and_load()
    except Exception as exc:
        logger.warning("Auto-discovery failed (agent will still work, but without pre-loaded schema)", error=str(exc))


def create_app() -> FastAPI:
    """Create the FastAPI application with AgentOS and AG-UI adapter."""
    from agno.os import AgentOS

    from dash.agent import dash
    from db.session import get_agent_db
    from api.dash_copilot import router as copilot_router

    app = FastAPI(title="Dash Standalone Analytics Agent")

    @app.get("/health")
    async def health():
        return {"status": "ok", "agent": "dash-standalone"}

    # Mount AgentOS (Agno agent endpoints)
    agent_os = AgentOS(
        name="Dash Standalone",
        agents=[dash],
        tracing=True,
        db=get_agent_db(),
    )
    app.mount("/dash-os", agent_os.get_app())

    # Mount AG-UI adapter for CopilotKit
    app.include_router(copilot_router)

    return app


if __name__ == "__main__":
    from db.url import AGENT_DB_URL, DATA_DB_URL

    # 1. Wait for Agent DB (PgVector for knowledge/state)
    wait_for_db(AGENT_DB_URL)

    # 2. Wait for Data DB (the database to analyze)
    wait_for_db(DATA_DB_URL)

    # 3. Auto-discover schema and load into knowledge base
    auto_discover_schema()

    # 4. Start the app
    app = create_app()
    uvicorn.run(app, host="0.0.0.0", port=PORT)

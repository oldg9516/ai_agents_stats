"""Database URL configuration from environment variables."""

import os

# Agent DB — PostgreSQL with pgvector (state, knowledge, learnings)
# Falls back to the built-in pgvector container from docker-compose
_DEFAULT_AGENT_DB = "postgresql+psycopg://dash:dash_local_pwd@pgvector:5432/dash_agent?options=-csearch_path%3Ddash,public"
AGENT_DB_URL = os.environ.get("AGENT_DB_URL", _DEFAULT_AGENT_DB)

# Data DB — read-only access to the target database (for SQL queries)
DATA_DB_URL = os.environ["DATA_DB_URL"]

"""Database URL configuration from environment variables."""

import os

# Agent DB — Supabase with schema 'dash' (PgVector for state, knowledge, learnings)
AGENT_DB_URL = os.environ["AGENT_DB_URL"]

# Data DB — Supabase read-only access to public schema (for SQL queries)
DATA_DB_URL = os.environ["DATA_DB_URL"]

# Table name prefix for PgVector knowledge/learnings (avoids mixing between instances)
KNOWLEDGE_TABLE_PREFIX = os.environ.get("KNOWLEDGE_TABLE_PREFIX", "dash")

"""PgVector storage and dual knowledge base setup for the Dash agent."""

from agno.db.postgres import PostgresDb
from agno.knowledge.knowledge import Knowledge
from agno.vectordb.pgvector import PgVector, SearchType
from agno.knowledge.embedder.openai import OpenAIEmbedder

from db.url import AGENT_DB_URL, KNOWLEDGE_TABLE_PREFIX

import os

AGENT_ID = os.environ.get("AGENT_ID", "dash")


def get_agent_db() -> PostgresDb:
    """Get the agent state/session storage (Supabase, schema dash)."""
    return PostgresDb(id=f"{AGENT_ID}-db", db_url=AGENT_DB_URL)


def create_knowledge(name: str, table_name: str) -> Knowledge:
    """Create a PgVector-backed knowledge base with hybrid search.

    Args:
        name: Human-readable name for the knowledge base.
        table_name: PgVector table name (created in the dash schema).
    """
    return Knowledge(
        name=name,
        vector_db=PgVector(
            db_url=AGENT_DB_URL,
            table_name=table_name,
            search_type=SearchType.hybrid,  # BM25 + semantic
            embedder=OpenAIEmbedder(id="text-embedding-3-small"),
        ),
        contents_db=get_agent_db(),
    )


# Static knowledge — table metadata, business rules, validated queries
dash_knowledge = create_knowledge(
    f"{KNOWLEDGE_TABLE_PREFIX}_knowledge", f"{KNOWLEDGE_TABLE_PREFIX}_knowledge"
)

# Learned knowledge — auto-accumulated via LearningMode.AGENTIC
dash_learnings = create_knowledge(
    f"{KNOWLEDGE_TABLE_PREFIX}_learnings", f"{KNOWLEDGE_TABLE_PREFIX}_learnings"
)

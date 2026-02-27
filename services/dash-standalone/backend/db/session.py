"""PgVector storage and dual knowledge base setup for the Dash agent."""

from agno.db.postgres import PostgresDb
from agno.knowledge.knowledge import Knowledge
from agno.vectordb.pgvector import PgVector, SearchType
from agno.knowledge.embedder.openai import OpenAIEmbedder

from db.url import AGENT_DB_URL


def get_agent_db() -> PostgresDb:
    """Get the agent state/session storage."""
    return PostgresDb(id="dash-standalone-db", db_url=AGENT_DB_URL)


def create_knowledge(name: str, table_name: str) -> Knowledge:
    """Create a PgVector-backed knowledge base with hybrid search."""
    return Knowledge(
        name=name,
        vector_db=PgVector(
            db_url=AGENT_DB_URL,
            table_name=table_name,
            search_type=SearchType.hybrid,
            embedder=OpenAIEmbedder(id="text-embedding-3-small"),
        ),
        contents_db=get_agent_db(),
    )


# Static knowledge — validated queries saved by the agent
dash_knowledge = create_knowledge("standalone_knowledge", "standalone_knowledge")

# Learned knowledge — auto-accumulated via LearningMode.AGENTIC
dash_learnings = create_knowledge("standalone_learnings", "standalone_learnings")

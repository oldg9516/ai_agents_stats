"""Standalone analytics agent definition with self-learning capabilities."""

from agno.agent import Agent
from agno.models.openai import OpenAIResponses
from agno.learn import LearningMachine, LearningMode, LearnedKnowledgeConfig
from dash.tools.sql_readonly import ReadOnlySQLTools

from db.url import DATA_DB_URL
from db.session import get_agent_db, dash_knowledge, dash_learnings
from dash.tools.introspect import introspect_schema
from dash.tools.save_query import save_validated_query
from dash.tools.render_chart import render_chart
from dash.instructions import INSTRUCTIONS

# Agent state/session storage
agent_db = get_agent_db()

# The Dash agent — no pre-loaded knowledge, learns by introspecting the DB
dash = Agent(
    id="dash",
    name="Dash",
    model=OpenAIResponses(id="gpt-4.1"),
    db=agent_db,
    instructions=INSTRUCTIONS,

    # Knowledge base (starts empty, filled via save_validated_query)
    knowledge=dash_knowledge,
    search_knowledge=True,

    # Self-learning via LearningMachine
    enable_agentic_memory=True,
    learning=LearningMachine(
        knowledge=dash_learnings,
        learned_knowledge=LearnedKnowledgeConfig(
            mode=LearningMode.AGENTIC,
        ),
    ),

    # Tools
    tools=[
        ReadOnlySQLTools(db_url=DATA_DB_URL),
        save_validated_query,
        introspect_schema,
        render_chart,
    ],

    # Context
    add_datetime_to_context=True,
    add_history_to_context=True,
    read_chat_history=True,
    num_history_runs=5,
    markdown=True,
)

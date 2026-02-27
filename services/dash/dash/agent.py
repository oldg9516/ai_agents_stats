"""Dash analytics agent definition with self-learning capabilities."""

import os

from agno.agent import Agent
from agno.models.openai import OpenAIResponses
from agno.learn import LearningMachine, LearningMode, LearnedKnowledgeConfig
from dash.tools.sql_readonly import ReadOnlySQLTools

from db.url import DATA_DB_URL
from db.session import get_agent_db, dash_knowledge, dash_learnings, AGENT_ID
from dash.tools.introspect import introspect_schema
from dash.tools.save_query import save_validated_query
from dash.tools.render_chart import render_chart

AGENT_MODE = os.environ.get("AGENT_MODE", "full")

if AGENT_MODE == "generic":
    from dash.instructions_generic import INSTRUCTIONS
else:
    from dash.instructions import INSTRUCTIONS

# Agent state/session storage
agent_db = get_agent_db()

# The Dash agent
dash = Agent(
    id=AGENT_ID,
    name="Dash",
    model=OpenAIResponses(id="gpt-5.1"),
    db=agent_db,
    instructions=INSTRUCTIONS,

    # Static knowledge (table metadata, business rules, validated queries)
    knowledge=dash_knowledge,
    search_knowledge=True,  # Agent searches knowledge before answering

    # Self-learning via LearningMachine
    enable_agentic_memory=True,
    learning=LearningMachine(
        knowledge=dash_learnings,
        learned_knowledge=LearnedKnowledgeConfig(
            mode=LearningMode.AGENTIC,  # Agent decides what to remember
        ),
    ),

    # Tools
    tools=[
        ReadOnlySQLTools(db_url=DATA_DB_URL),  # Read-only SQL (blocks INSERT/UPDATE/DELETE/DROP)
        save_validated_query,            # Save successful queries to knowledge
        introspect_schema,               # Runtime schema introspection
        render_chart,                    # Frontend-rendered charts (generative UI)
    ],

    # Context
    add_datetime_to_context=True,
    add_history_to_context=True,
    read_chat_history=True,
    num_history_runs=5,
    markdown=True,
)

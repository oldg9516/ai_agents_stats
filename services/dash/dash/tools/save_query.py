"""Tool for saving validated SQL queries to the knowledge base."""

from agno.knowledge.document import Document

from db.session import dash_knowledge


def save_validated_query(
    name: str,
    question: str,
    query: str,
    summary: str,
    tables_used: list[str],
) -> str:
    """Save a validated query that produced correct results to the knowledge base.

    Call this when you've verified a SQL query works correctly and could be useful
    for answering similar questions in the future.

    Args:
        name: Short identifier (e.g., 'customer_ltv_top20').
        question: Natural language question this query answers.
        query: The validated SQL query.
        summary: Brief description of what this query returns.
        tables_used: List of table names referenced in the query.
    """
    doc_content = f"""## {name}
Question: {question}
Tables: {', '.join(tables_used)}
Summary: {summary}

```sql
{query}
```
"""
    dash_knowledge.load_documents([
        Document(name=name, content=doc_content)
    ])
    return f"Query '{name}' saved to knowledge base."

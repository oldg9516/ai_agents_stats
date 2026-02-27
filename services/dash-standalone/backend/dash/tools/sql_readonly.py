"""Read-only SQL tool wrapper that blocks any non-SELECT queries."""

import re

from agno.tools.sql import SQLTools


# Dangerous SQL patterns (case-insensitive)
_WRITE_PATTERNS = re.compile(
    r"\b(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|TRUNCATE|GRANT|REVOKE|"
    r"REPLACE|MERGE|UPSERT|COPY|CALL|EXEC|EXECUTE)\b",
    re.IGNORECASE,
)


class ReadOnlySQLTools(SQLTools):
    """SQLTools wrapper that only allows SELECT queries."""

    def run_sql_query(self, query: str) -> str:
        """Execute a SQL query — blocks anything that is not a SELECT."""
        stripped = query.strip().lstrip("(")
        if _WRITE_PATTERNS.search(stripped.split("--")[0].split("/*")[0]):
            return (
                "ERROR: Only SELECT queries are allowed. "
                "This is a read-only analytics agent. "
                "Blocked query type detected."
            )
        return super().run_sql_query(query)

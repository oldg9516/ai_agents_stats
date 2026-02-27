"""Auto-discover database schema and load into knowledge base on first startup.

Introspects all tables from DATA_DB_URL and creates knowledge documents
so the agent starts with full schema understanding.

Run: python scripts/auto_discover.py
"""

from sqlalchemy import create_engine, inspect, text

from db.url import DATA_DB_URL
from db.session import dash_knowledge


def _is_mysql(url: str) -> bool:
    return url.startswith("mysql")


def discover_and_load():
    """Introspect DATA_DB schema and load table descriptions into knowledge."""
    engine = create_engine(DATA_DB_URL)
    inspector = inspect(engine)
    mysql = _is_mysql(DATA_DB_URL)
    schema = None if mysql else "public"
    quote = "`" if mysql else '"'

    tables = inspector.get_table_names(schema=schema)
    if not tables:
        print("No tables found in database. Skipping knowledge loading.")
        engine.dispose()
        return

    loaded = 0

    # 1. Overview document with all tables
    overview = "## Database Schema Overview\n\n"
    overview += f"**Database type**: {'MySQL' if mysql else 'PostgreSQL'}\n"
    overview += f"**Tables found**: {len(tables)}\n\n"
    for t in sorted(tables):
        overview += f"- {t}\n"
    dash_knowledge.insert(name="schema_overview", text_content=overview, upsert=True)
    loaded += 1

    # 2. Detailed document per table
    for table_name in tables:
        columns = inspector.get_columns(table_name, schema=schema)
        if not columns:
            continue

        content = f"## Table: {table_name}\n\n"
        content += "### Columns\n\n"
        content += "| Column | Type | Nullable |\n|--------|------|----------|\n"
        for col in columns:
            content += f"| {col['name']} | {col['type']} | {col['nullable']} |\n"

        # Sample data (3 rows) — helps agent understand actual values
        try:
            with engine.connect() as conn:
                rows = conn.execute(
                    text(f"SELECT * FROM {quote}{table_name}{quote} LIMIT 3")
                ).fetchall()
                if rows:
                    col_names = [col["name"] for col in columns]
                    content += f"\n### Sample Data ({len(rows)} rows)\n\n"
                    content += "| " + " | ".join(col_names) + " |\n"
                    content += "| " + " | ".join(["---"] * len(col_names)) + " |\n"
                    for row in rows:
                        vals = [str(v)[:80] if v is not None else "NULL" for v in row]
                        content += "| " + " | ".join(vals) + " |\n"
        except Exception:
            pass

        # Foreign keys
        try:
            fks = inspector.get_foreign_keys(table_name, schema=schema)
            if fks:
                content += "\n### Foreign Keys\n\n"
                for fk in fks:
                    content += f"- {', '.join(fk['constrained_columns'])} → {fk['referred_table']}.{', '.join(fk['referred_columns'])}\n"
        except Exception:
            pass

        # Row count estimate
        try:
            with engine.connect() as conn:
                count_row = conn.execute(
                    text(f"SELECT COUNT(*) FROM {quote}{table_name}{quote}")
                ).fetchone()
                if count_row:
                    content += f"\n**Row count**: {count_row[0]:,}\n"
        except Exception:
            pass

        dash_knowledge.insert(name=f"table_{table_name}", text_content=content, upsert=True)
        loaded += 1

    # 3. Relationships summary (for tables with FKs)
    relationships = []
    for table_name in tables:
        try:
            fks = inspector.get_foreign_keys(table_name, schema=schema)
            for fk in fks:
                cols = ", ".join(fk["constrained_columns"])
                ref_cols = ", ".join(fk["referred_columns"])
                relationships.append(
                    f"- {table_name}.{cols} → {fk['referred_table']}.{ref_cols}"
                )
        except Exception:
            pass

    if relationships:
        rel_content = "## Table Relationships\n\n"
        rel_content += "\n".join(relationships)
        dash_knowledge.insert(name="table_relationships", text_content=rel_content, upsert=True)
        loaded += 1

    engine.dispose()

    print(f"Auto-discovery complete: loaded {loaded} documents into knowledge base")
    print(f"  - 1 schema overview")
    print(f"  - {len(tables)} table descriptions")
    if relationships:
        print(f"  - 1 relationships document ({len(relationships)} FKs)")


if __name__ == "__main__":
    discover_and_load()

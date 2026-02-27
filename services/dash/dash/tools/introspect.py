"""Tool for runtime database schema introspection (PostgreSQL & MySQL)."""

from db.url import DATA_DB_URL


def _is_mysql(url: str) -> bool:
    return url.startswith("mysql")


def introspect_schema(table_name: str | None = None) -> str:
    """List available tables or describe a specific table with columns, types, and sample data.

    Args:
        table_name: Table to inspect. If None, lists all tables.
    """
    from sqlalchemy import create_engine, inspect, text

    engine = create_engine(DATA_DB_URL)
    inspector = inspect(engine)
    mysql = _is_mysql(DATA_DB_URL)

    # Schema: PostgreSQL uses "public", MySQL uses None (database = schema)
    schema = None if mysql else "public"

    if table_name is None:
        tables = inspector.get_table_names(schema=schema)
        views = inspector.get_view_names(schema=schema)
        result = "## Available Tables\n\n"
        for t in sorted(tables):
            result += f"- {t}\n"
        if views:
            result += "\n## Available Views\n\n"
            for v in sorted(views):
                result += f"- {v}\n"
        engine.dispose()
        return result

    columns = inspector.get_columns(table_name, schema=schema)
    if not columns:
        engine.dispose()
        return f"Table '{table_name}' not found."

    result = f"## {table_name}\n\n"
    result += "| Column | Type | Nullable |\n|--------|------|----------|\n"
    for col in columns:
        result += f"| {col['name']} | {col['type']} | {col['nullable']} |\n"

    # Sample data (3 rows)
    # MySQL uses backticks, PostgreSQL uses double quotes
    quote = "`" if mysql else '"'
    try:
        with engine.connect() as conn:
            rows = conn.execute(
                text(f"SELECT * FROM {quote}{table_name}{quote} LIMIT 3")
            ).fetchall()
            if rows:
                col_names = [col["name"] for col in columns]
                result += f"\n### Sample Data ({len(rows)} rows)\n\n"
                result += "| " + " | ".join(col_names) + " |\n"
                result += "| " + " | ".join(["---"] * len(col_names)) + " |\n"
                for row in rows:
                    vals = [str(v)[:50] if v is not None else "NULL" for v in row]
                    result += "| " + " | ".join(vals) + " |\n"
    except Exception as e:
        result += f"\n*Could not fetch sample data: {e}*\n"

    # Foreign keys
    try:
        fks = inspector.get_foreign_keys(table_name, schema=schema)
        if fks:
            result += "\n### Foreign Keys\n\n"
            for fk in fks:
                result += f"- {', '.join(fk['constrained_columns'])} → {fk['referred_table']}.{', '.join(fk['referred_columns'])}\n"
    except Exception:
        pass

    # Indexes
    try:
        indexes = inspector.get_indexes(table_name, schema=schema)
        if indexes:
            result += "\n### Indexes\n\n"
            for idx in indexes:
                result += f"- {idx['name']}: {', '.join(idx['column_names'])} (unique={idx['unique']})\n"
    except Exception:
        pass

    engine.dispose()
    return result

"""Load static knowledge into PgVector for the Dash agent.

Run: docker exec -it dash python scripts/load_knowledge.py
Or:  python -m scripts.load_knowledge
"""

import json
from pathlib import Path

from agno.knowledge.document import Document

from db.session import dash_knowledge

KNOWLEDGE_DIR = Path(__file__).parent.parent / "dash" / "knowledge"


def load_all():
    """Load all knowledge documents into the dash_knowledge PgVector table."""
    docs: list[Document] = []

    # 1. Table metadata (JSON files)
    tables_dir = KNOWLEDGE_DIR / "tables"
    if tables_dir.exists():
        for f in sorted(tables_dir.glob("*.json")):
            data = json.loads(f.read_text())
            content = f"## Table: {data['table_name']}\n\n"
            content += f"{data.get('description', '')}\n\n"

            if use_cases := data.get("use_cases"):
                content += f"**Use cases**: {', '.join(use_cases)}\n\n"

            if notes := data.get("data_quality_notes"):
                content += f"**Data quality notes**: {notes}\n\n"

            content += "### Columns\n\n"
            content += "| Column | Type | Description |\n|--------|------|-------------|\n"
            for col in data.get("columns", []):
                content += f"| {col['name']} | {col['type']} | {col.get('description', '')} |\n"

            docs.append(Document(name=f"table_{data['table_name']}", content=content))

    # 2. Business rules and metrics
    metrics_file = KNOWLEDGE_DIR / "business" / "metrics.json"
    if metrics_file.exists():
        data = json.loads(metrics_file.read_text())
        content = "## Business Rules and Metrics\n\n"
        content += json.dumps(data, indent=2, ensure_ascii=False)
        docs.append(Document(name="business_rules", content=content))

    # 3. Validated SQL queries
    queries_dir = KNOWLEDGE_DIR / "queries"
    if queries_dir.exists():
        for f in sorted(queries_dir.glob("*.sql")):
            docs.append(Document(name=f"queries_{f.stem}", content=f.read_text()))

    # Load into PgVector
    if docs:
        dash_knowledge.load_documents(docs)
        print(f"Loaded {len(docs)} documents into dash_knowledge")
    else:
        print("No knowledge documents found to load")


if __name__ == "__main__":
    load_all()

"""Frontend-rendered chart tool.

When the agent calls this tool, the AG-UI adapter translates it into
ToolCall events that CopilotKit renders on the frontend via useCopilotAction.
The tool itself just returns a confirmation — actual rendering happens client-side.
"""

import json


def render_chart(
    chart_type: str,
    title: str,
    data: str,
    x_key: str,
    y_keys: str,
) -> str:
    """Display an interactive chart in the chat UI.

    Call this tool INSTEAD of writing markdown tables when the user asks for
    a chart, graph, trend, visualization, or when data has a time dimension.

    Args:
        chart_type: One of 'line', 'bar', 'area', 'pie'. Use 'line' for trends over time,
                    'bar' for comparisons, 'area' for volume over time, 'pie' for distributions.
        title: Chart title displayed above the chart.
        data: JSON array of objects. Each object is one data point.
              Example: '[{"date": "2026-01-01", "count": 42}, {"date": "2026-01-02", "count": 55}]'
        x_key: Key name for the X axis (e.g., 'date', 'category').
        y_keys: Comma-separated key names for Y axis values (e.g., 'count' or 'good,bad,total').
    """
    # Validate JSON
    try:
        parsed = json.loads(data)
        if not isinstance(parsed, list):
            return "Error: data must be a JSON array of objects."
    except json.JSONDecodeError as e:
        return f"Error: invalid JSON in data field: {e}"

    y_list = [k.strip() for k in y_keys.split(",")]

    return json.dumps({
        "chart_type": chart_type,
        "title": title,
        "data": parsed,
        "x_key": x_key,
        "y_keys": y_list,
        "rendered": True,
    })

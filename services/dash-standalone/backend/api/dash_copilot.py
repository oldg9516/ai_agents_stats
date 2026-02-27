"""AG-UI ↔ AgentOS SSE adapter for CopilotKit integration.

Translates between CopilotKit's AG-UI protocol and Agno's AgentOS SSE streaming format.
Supports text streaming and generative UI via ToolCall events for render_chart.
"""

import json
import os
from uuid import uuid4

import httpx
from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse
from ag_ui.core import (
    RunStartedEvent,
    RunFinishedEvent,
    TextMessageStartEvent,
    TextMessageEndEvent,
    TextMessageContentEvent,
    ToolCallStartEvent,
    ToolCallArgsEvent,
    ToolCallEndEvent,
    EventType,
)

router = APIRouter()

# AgentOS is mounted in the same process — derive URL from PORT
PORT = os.environ.get("PORT", "9000")
AGENT_ID = os.environ.get("AGENT_ID", "dash")
DASH_OS_URL = f"http://localhost:{PORT}/dash-os"

# Tools that should be rendered on the frontend (generative UI)
FRONTEND_TOOLS = {"render_chart"}


def _encode_sse(event) -> str:
    """Encode an AG-UI event as an SSE data line."""
    data = event.model_dump(by_alias=True, exclude_none=True)
    data["type"] = event.type if isinstance(event.type, str) else event.type.value
    return f"data: {json.dumps(data)}\n\n"


@router.post("/api/dash-copilot")
async def dash_copilot(request: Request):
    """Receive AG-UI requests from CopilotKit and stream responses from AgentOS."""
    body = await request.json()
    messages = body.get("messages", [])
    thread_id = body.get("threadId", str(uuid4()))

    # Extract the last user message
    user_message = ""
    for msg in reversed(messages):
        if msg.get("role") == "user":
            content = msg.get("content", "")
            if isinstance(content, list):
                user_message = " ".join(
                    part.get("text", "") for part in content if part.get("type") == "text"
                )
            else:
                user_message = content
            break

    if not user_message:
        user_message = "Hello"

    return StreamingResponse(
        _stream(user_message, thread_id),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive"},
    )


async def _stream(message: str, thread_id: str):
    """Stream AgentOS SSE events translated to AG-UI format."""
    run_id = str(uuid4())
    message_id = str(uuid4())
    text_started = False

    # 1. Run started
    yield _encode_sse(RunStartedEvent(type=EventType.RUN_STARTED, threadId=thread_id, runId=run_id))

    # 2. Stream from AgentOS
    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            async with client.stream(
                "POST",
                f"{DASH_OS_URL}/agents/{AGENT_ID}/runs",
                data={
                    "message": message,
                    "stream": "true",
                    "session_id": f"copilot_{thread_id}",
                    "user_id": "copilot",
                },
            ) as resp:
                buffer = ""
                async for chunk in resp.aiter_text():
                    buffer += chunk
                    while "\n" in buffer:
                        line, buffer = buffer.split("\n", 1)
                        line = line.strip()
                        if not line.startswith("data: "):
                            continue
                        try:
                            event = json.loads(line[6:])
                        except json.JSONDecodeError:
                            continue

                        event_type = event.get("event")

                        # Text content from the agent
                        if event_type == "RunContent":
                            content = event.get("content", "")
                            if content:
                                if not text_started:
                                    yield _encode_sse(TextMessageStartEvent(
                                        type=EventType.TEXT_MESSAGE_START,
                                        messageId=message_id,
                                        role="assistant",
                                    ))
                                    text_started = True
                                yield _encode_sse(
                                    TextMessageContentEvent(
                                        type=EventType.TEXT_MESSAGE_CONTENT,
                                        messageId=message_id,
                                        delta=content,
                                    )
                                )

                        # Tool call completed — check if it's a frontend tool
                        elif event_type == "ToolCallCompleted":
                            tool = event.get("tool", {})
                            tool_name = tool.get("tool_name", "")

                            if tool_name in FRONTEND_TOOLS:
                                tool_call_id = tool.get("tool_call_id", str(uuid4()))
                                tool_args = tool.get("tool_args", {})
                                tool_result = tool.get("result", "")

                                # End text message if one was in progress
                                if text_started:
                                    yield _encode_sse(TextMessageEndEvent(
                                        type=EventType.TEXT_MESSAGE_END,
                                        messageId=message_id,
                                    ))
                                    text_started = False
                                    message_id = str(uuid4())

                                # Parse the tool result to get chart data
                                try:
                                    result_data = json.loads(tool_result)
                                except (json.JSONDecodeError, TypeError):
                                    result_data = tool_args

                                # Build args payload for CopilotKit render function
                                args_payload = json.dumps({
                                    "chart_type": result_data.get("chart_type", tool_args.get("chart_type", "bar")),
                                    "title": result_data.get("title", tool_args.get("title", "")),
                                    "data": json.dumps(result_data.get("data", [])),
                                    "x_key": result_data.get("x_key", tool_args.get("x_key", "")),
                                    "y_keys": ",".join(result_data.get("y_keys", [])) if isinstance(result_data.get("y_keys"), list) else tool_args.get("y_keys", ""),
                                })

                                # Emit AG-UI ToolCall events: Start → Args → End
                                yield _encode_sse(ToolCallStartEvent(
                                    type=EventType.TOOL_CALL_START,
                                    toolCallId=tool_call_id,
                                    toolCallName=tool_name,
                                ))
                                yield _encode_sse(ToolCallArgsEvent(
                                    type=EventType.TOOL_CALL_ARGS,
                                    toolCallId=tool_call_id,
                                    delta=args_payload,
                                ))
                                yield _encode_sse(ToolCallEndEvent(
                                    type=EventType.TOOL_CALL_END,
                                    toolCallId=tool_call_id,
                                ))

    except Exception as exc:
        if not text_started:
            yield _encode_sse(TextMessageStartEvent(
                type=EventType.TEXT_MESSAGE_START,
                messageId=message_id,
                role="assistant",
            ))
            text_started = True
        yield _encode_sse(
            TextMessageContentEvent(
                type=EventType.TEXT_MESSAGE_CONTENT,
                messageId=message_id,
                delta=f"\n\n⚠️ Error connecting to analytics agent: {exc}",
            )
        )

    # 3. End
    if text_started:
        yield _encode_sse(TextMessageEndEvent(type=EventType.TEXT_MESSAGE_END, messageId=message_id))
    yield _encode_sse(RunFinishedEvent(type=EventType.RUN_FINISHED, threadId=thread_id, runId=run_id))

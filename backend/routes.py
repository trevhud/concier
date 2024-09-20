from fastapi import APIRouter
from fastapi.responses import Response, StreamingResponse, FileResponse, JSONResponse
from langchain.schema import AIMessage, SystemMessage
from langchain_core.runnables import RunnableConfig
from backend.langchain_setup import agent_workflow, memory, prompt, tools
import uuid
import json

router = APIRouter()

conversation_state = {}

@router.get("/")
async def read_index():
    return Response(content=open("./build/index.html", "r").read(), media_type="text/html")

async def chat_stream(user_input: str, session_id: str):
    async for response in process_chat_message(user_input, session_id):
        yield f"data: {json.dumps(response)}\n\n"
    yield "data: {'type': 'final', 'content': '[DONE]'}\n\n"

@router.post("/chat")
async def chat_endpoint(request: dict):
    user_input = request.get('input', '')
    session_id = request.get('session_id', '')
    stream = chat_stream(user_input, session_id)
    return StreamingResponse(stream, media_type="text/event-stream")

@router.get("/{full_path:path}")
async def serve_spa(full_path: str):
    return FileResponse("frontend/build/index.html")

@router.post('/clear_chat')
async def clear_chat():
    new_session_id = str(uuid.uuid4())
    memory.clear()
    if new_session_id in conversation_state:
        del conversation_state[new_session_id]
    conversation_state[new_session_id] = {"tool_outputs": []}
    return JSONResponse({"message": "Chat history cleared", "session_id": new_session_id})

@router.post('/new_session')
async def new_session():
    session_id = str(uuid.uuid4())
    conversation_state[session_id] = {"tool_outputs": []}
    return JSONResponse({"session_id": session_id})

async def process_chat_message(user_input: str, session_id: str):
    if session_id not in conversation_state:
        conversation_state[session_id] = {"tool_outputs": []}
    
    memory.chat_memory.add_user_message(user_input)

    agent_input = {
        "messages": memory.chat_memory.messages,
        "memory": memory,
        "tools": tools,
        "prompt": prompt
    }

    config: RunnableConfig = {"configurable": {"session_id": session_id}}

    try:
        async for step in agent_workflow.astream(agent_input, config=config, stream_mode="updates"): # type: ignore
            if "messages" in step:
                last_message = step["messages"][-1]
                if isinstance(last_message, AIMessage):
                    yield {'type': 'update', 'content': last_message.content}
                elif isinstance(last_message, SystemMessage):
                    conversation_state[session_id]["tool_outputs"].append(last_message.content)
                    yield {'type': 'tool_output', 'content': last_message.content}

        final_response = await agent_workflow.ainvoke(agent_input, config=config)
        yield {'type': 'final', 'content': final_response['messages'][-1].content}
    except Exception as e:
        print(f"An error occurred: {str(e)}")
        yield {'type': 'error', 'content': str(e)}
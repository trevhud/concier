from flask import Blueprint, request, jsonify, send_from_directory
from langchain.schema import AIMessage, SystemMessage
from langchain_core.runnables import RunnableConfig
from backend.langchain_setup import agent_workflow, memory, prompt, tools
import uuid

bp = Blueprint('routes', __name__)

conversation_state = {}

@bp.route('/')
def serve_react():
    return send_from_directory(bp.static_folder, 'index.html')

@bp.route('/clear_chat', methods=['POST'])
def clear_chat():
    new_session_id = str(uuid.uuid4())
    memory.clear()
    if new_session_id in conversation_state:
        del conversation_state[new_session_id]
    conversation_state[new_session_id] = {"tool_outputs": []}
    return jsonify({"message": "Chat history cleared", "session_id": new_session_id})

@bp.route('/new_session', methods=['POST'])
def new_session():
    session_id = str(uuid.uuid4())
    conversation_state[session_id] = {"tool_outputs": []}
    return jsonify({"session_id": session_id})

@bp.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', 'http://localhost:3000')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    response.headers.add('Access-Control-Allow-Credentials', 'true')
    return response

def setup_socketio_events(socketio):
    @socketio.on('chat')
    def handle_chat(data):
        user_input = data.get('input', '')
        session_id = data.get('session_id')
        
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
            for step in agent_workflow.stream(agent_input, config=config):
                if "messages" in step:
                    last_message = step["messages"][-1]
                    if isinstance(last_message, AIMessage):
                        socketio.emit('chat_update', {'response': last_message.content, 'session_id': session_id})
                    elif isinstance(last_message, SystemMessage):
                        conversation_state[session_id]["tool_outputs"].append(last_message.content)
                        socketio.emit('chat_update', {'response': last_message.content, 'session_id': session_id})

            final_response = agent_workflow.invoke(agent_input, config=config)
            socketio.emit('chat_response', {
                'response': final_response['messages'][-1].content,
                'session_id': session_id
            })
        except Exception as e:
            print(f"An error occurred: {str(e)}")
            socketio.emit('chat_error', {'error': str(e), 'session_id': session_id})

    @socketio.on('clear_chat')
    def handle_clear_chat(data):
        new_session_id = str(uuid.uuid4())
        memory.clear()
        if new_session_id in conversation_state:
            del conversation_state[new_session_id]
        conversation_state[new_session_id] = {"tool_outputs": []}
        socketio.emit('chat_cleared', {'session_id': new_session_id})

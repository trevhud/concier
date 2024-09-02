from flask import Blueprint, request, jsonify, send_from_directory
from langchain.schema import HumanMessage, AIMessage
from backend.langchain_setup import agent_executor
from backend.globals import conversation_state  # Import conversation_state
import json
import uuid

bp = Blueprint('routes', __name__)

# File to store chat history
CHAT_HISTORY_FILE = 'chat_history.json'


def load_chat_history():
    try:
        with open(CHAT_HISTORY_FILE, 'r') as f:
            content = f.read()
            return json.loads(content) if content else []
    except (FileNotFoundError, json.JSONDecodeError):
        return []


def save_chat_history(chat_history):
    with open(CHAT_HISTORY_FILE, 'w') as f:
        json.dump(chat_history, f)


def count_tokens(message):
    return len(message['text'].split())


def manage_chat_history(chat_history, max_tokens=100000):
    total_tokens = sum(count_tokens(msg) for msg in chat_history)

    while total_tokens > max_tokens and chat_history:
        removed_message = chat_history.pop(0)
        total_tokens -= count_tokens(removed_message)


def convert_message_to_dict(message):
    if isinstance(message, (HumanMessage, AIMessage)):
        return {
            "type": "human" if isinstance(message, HumanMessage) else "ai",
            "content": message.content
        }
    return str(message)


# Load chat history at startup
chat_history = load_chat_history()


@bp.route('/')
def serve_react():
    return send_from_directory(bp.static_folder, 'index.html')


@bp.route('/chat', methods=['POST'])
def chat():
    data = request.json
    user_input = data.get('input', '')
    conversation_state['chat_history'] = data.get(
        'conversation_state', {}).get('chat_history', [])

    # Prepare the input for the agent executor
    agent_input = {
        "input": user_input,
        "chat_history": conversation_state['chat_history']
    }

    config = {"configurable": {"session_id": data.get('session_id')}}

    try:
        response = agent_executor.invoke(agent_input, config=config)

        # Convert chat history to a serializable format
        serializable_chat_history = [convert_message_to_dict(
            msg) for msg in response.get('chat_history', [])]

        # Update the conversation state
        conversation_state['chat_history'] = serializable_chat_history

        return jsonify({
            'response': response['output'],
            'conversation_state': conversation_state
        })
    except Exception as e:
        print(f"An error occurred: {str(e)}")
        return jsonify({'error': str(e)}), 500


@bp.route('/clear_chat', methods=['POST'])
def clear_chat():
    global chat_history
    chat_history = []
    save_chat_history(chat_history)
    # Generate a new session ID when clearing chat
    session_id = str(uuid.uuid4())
    return jsonify({"message": "Chat history cleared", "session_id": session_id})


@bp.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin',
                         'http://localhost:3000')
    response.headers.add('Access-Control-Allow-Headers',
                         'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods',
                         'GET,PUT,POST,DELETE,OPTIONS')
    response.headers.add('Access-Control-Allow-Credentials', 'true')
    return response

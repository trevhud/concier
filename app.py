import eventlet
eventlet.monkey_patch()

from flask import Flask
from flask_cors import CORS
from flask_socketio import SocketIO
from dotenv import load_dotenv
import logging
import os


load_dotenv()

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def create_app():
    from backend.routes import bp, setup_socketio_events

    app = Flask(__name__, static_folder='./build', static_url_path='/')
    CORS(app, resources={r"/*": {"origins": "http://localhost:3000"}}, supports_credentials=True)
        
    # Initialize SocketIO with the app
    socketio = SocketIO(app, cors_allowed_origins="http://localhost:3000", async_mode='eventlet')

    app.register_blueprint(bp)
    
    # Setup SocketIO events
    setup_socketio_events(socketio)
    
    return app, socketio

app, socketio = create_app()

if __name__ == '__main__':
    debug_mode = os.environ.get('FLASK_DEBUG', 'False').lower() == 'true'
    
    if debug_mode:
        import debugpy
        debugpy.listen(("0.0.0.0", 5678))
        print("Waiting for debugger attach...")
        debugpy.wait_for_client()
        print("Debugger attached!")
    
    socketio.run(app, debug=debug_mode, use_reloader=False, port=8080, host='0.0.0.0')
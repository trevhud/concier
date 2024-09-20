import os
from typing import Dict, List
from dotenv import load_dotenv
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

load_dotenv()

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def create_app():
    from backend.routes import router

    app = FastAPI()

    # CORS setup
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:3000"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Include API routes
    app.include_router(router)

    # Serve static files
    app.mount("/static", StaticFiles(directory="./build", html=True), name="static")

    return app

app = create_app()

if __name__ == '__main__':
    import uvicorn
    debug_mode = os.environ.get('FASTAPI_DEBUG', 'False').lower() == 'true'
    
    log_level = "debug" if debug_mode else "info"
    uvicorn.run("app:app", host="0.0.0.0", port=8080, log_level=log_level, reload=debug_mode)
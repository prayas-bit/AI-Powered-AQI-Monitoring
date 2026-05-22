import os
from dotenv import load_dotenv

# Load variables from .env file if it exists
load_dotenv()

class Config:
    # Security keys
    JWT_SECRET = os.environ.get("JWT_SECRET", "super_secret_aqi_prediction_system_token_key_12345")
    
    # Database connections
    MONGO_URI = os.environ.get("MONGO_URI", "")  # Fallbacks implemented in db.py if empty or connection fails
    
    # External APIs
    OPENAQ_API_KEY = os.environ.get("OPENAQ_API_KEY", "")
    WAQI_API_TOKEN = os.environ.get("WAQI_API_TOKEN", "")
    
    # Server Configurations
    PORT = int(os.environ.get("PORT", 5000))
    HOST = os.environ.get("HOST", "127.0.0.1")
    
    # Simulated Mode flag (can be forced via env)
    FORCE_SIMULATOR = os.environ.get("FORCE_SIMULATOR", "false").lower() == "true"

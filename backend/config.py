import os

# Load .env file only if it exists (local dev).
# On Vercel, env vars are injected directly — no .env file needed.
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass  # python-dotenv not installed — fine on Vercel

class Config:
    # Security keys
    JWT_SECRET = os.environ.get("JWT_SECRET", "super_secret_aqi_prediction_system_token_key_12345")
    
    # Database connections
    MONGO_URI = os.environ.get("MONGO_URI", "")
    
    # External APIs
    OPENAQ_API_KEY = os.environ.get("OPENAQ_API_KEY", "")
    WAQI_API_TOKEN = os.environ.get("WAQI_API_TOKEN", "")
    
    # Server Configurations (local dev only)
    PORT = int(os.environ.get("PORT", 5000))
    HOST = os.environ.get("HOST", "127.0.0.1")
    
    # Simulated Mode flag
    FORCE_SIMULATOR = os.environ.get("FORCE_SIMULATOR", "false").lower() == "true"
    
    # Vercel detection
    IS_VERCEL = bool(os.environ.get("VERCEL"))

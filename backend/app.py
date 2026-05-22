import os
import sys
import logging
from flask import Flask, jsonify
from flask_cors import CORS
from config import Config

# Configure logging for production visibility
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    stream=sys.stdout
)
logger = logging.getLogger(__name__)

# Import blueprints
from routes.auth import auth_bp
from routes.aqi import aqi_bp
from routes.prediction import prediction_bp
from routes.reports import reports_bp
from services.aqi_service import AQIService

app = Flask(__name__)

# ─────────────────────────────────────────────────────────────
# CORS — allow all origins since Vercel serves frontend + backend
# from the same domain. For local dev, the Vite dev server is a
# different origin (localhost:5173/5174).
# ─────────────────────────────────────────────────────────────
CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)

app.config.from_object(Config)

# Register Blueprints
app.register_blueprint(auth_bp, url_prefix="/api/auth")
app.register_blueprint(aqi_bp, url_prefix="/api")
app.register_blueprint(prediction_bp, url_prefix="/api")
app.register_blueprint(reports_bp, url_prefix="/api")

@app.route("/", methods=["GET"])
def index():
    return jsonify({
        "status": "online",
        "service": "AI-Powered AQI Prediction and Construction Safety API",
        "version": "2.0.0",
        "environment": "vercel" if os.environ.get("VERCEL") else "local",
        "supported_cities": AQIService.get_supported_cities()
    }), 200

# ─────────────────────────────────────────────────────────────
# Local development only — Vercel uses its own WSGI handler
# ─────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import threading
    from ml.train_model import train_city_model

    def pretrain_models():
        logger.info("Pre-training ML models for supported cities in the background...")
        for city in AQIService.get_supported_cities():
            try:
                train_city_model(city)
            except Exception as e:
                logger.warning(f"Skipping model training for {city}: {e}")
        logger.info("Background ML pre-training complete.")

    pretrain_thread = threading.Thread(target=pretrain_models, daemon=True)
    pretrain_thread.start()

    logger.info(f"Starting AQI Safety API Server on http://{Config.HOST}:{Config.PORT}")
    app.run(host=Config.HOST, port=Config.PORT, debug=True)

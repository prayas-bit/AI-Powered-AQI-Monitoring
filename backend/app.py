import threading
from flask import Flask, jsonify
from flask_cors import CORS
from config import Config

# Import blueprints
from routes.auth import auth_bp
from routes.aqi import aqi_bp
from routes.prediction import prediction_bp
from routes.reports import reports_bp

# Import ML model training function
from ml.train_model import train_city_model
from services.aqi_service import AQIService

app = Flask(__name__)

# Configure Cross-Origin Resource Sharing (CORS)
# Support token headers, content types, and methods
CORS(app, resources={r"/api/*": {"origins": "*"}})

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
        "version": "1.0.0",
        "supported_cities": AQIService.get_supported_cities()
    }), 200

def pretrain_models():
    """Trains regression models for standard cities in a separate thread on startup."""
    print("Pre-training ML models for supported cities in the background...")
    for city in AQIService.get_supported_cities():
        try:
            train_city_model(city)
        except Exception as e:
            print(f"Error pre-training model for {city}: {e}")
    print("Background ML pre-training complete.")

if __name__ == "__main__":
    # Fire model training in a background thread to avoid blocking server boot
    pretrain_thread = threading.Thread(target=pretrain_models)
    pretrain_thread.daemon = True
    pretrain_thread.start()
    
    print(f"Starting AQI Safety API Server on http://{Config.HOST}:{Config.PORT}")
    app.run(host=Config.HOST, port=Config.PORT, debug=True)

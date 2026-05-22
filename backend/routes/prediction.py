from flask import Blueprint, request, jsonify
from ml.predict import predict_future_aqi
from models.db import db
from datetime import datetime
import threading
import time

prediction_bp = Blueprint("prediction", __name__)

# In-memory prediction cache (predictions are stable for 5 minutes)
_prediction_cache = {}
PREDICTION_CACHE_TTL = 300  # seconds


def _cache_get(cache_dict, key):
    entry = cache_dict.get(key)
    if entry and entry.get("expires_at", 0) > time.time():
        return entry.get("data")
    return None


def _cache_set(cache_dict, key, data, ttl):
    cache_dict[key] = {"data": data, "expires_at": time.time() + ttl}


def generate_safety_recommendations(aqi):
    if aqi <= 50:
        return {
            "status": "Safe",
            "color": "#4ade80",
            "ppe": ["Standard safety boots", "Hard hat", "High-visibility vest"],
            "guidelines": ["All outdoor construction operations permitted.", "Standard dust control is sufficient."],
            "water_spraying": "Routine (Start and End of shift)",
            "health_risk": "Low. Excellent air quality for heavy physical labor."
        }
    elif aqi <= 100:
        return {
            "status": "Moderate / Safe",
            "color": "#F5E642",
            "ppe": ["Standard safety boots", "Hard hat", "High-visibility vest", "Basic dust masks for sensitive workers"],
            "guidelines": ["Outdoor construction is safe.", "Activate wind screens in high-dust sectors."],
            "water_spraying": "2x daily (Mid-morning and Mid-afternoon)",
            "health_risk": "Acceptable. Sensitive workers should take frequent breaks."
        }
    elif aqi <= 200:
        return {
            "status": "Unsafe (PPE Required)",
            "color": "#f87171",
            "ppe": ["Mandatory N95 or higher respirator", "Closed safety goggles", "Long-sleeve overalls"],
            "guidelines": [
                "Reduce dust-generating activities by 50% (e.g. grinding, blasting).",
                "Ensure indoor working enclosures have operational HEPA filtration."
            ],
            "water_spraying": "Frequent (Every 3 hours in active zones)",
            "health_risk": "Active workers may experience respiratory irritation. Limit continuous heavy lifting."
        }
    elif aqi <= 300:
        return {
            "status": "Restricted Operations",
            "color": "#c084fc",
            "ppe": ["Mandatory double-filter N95/N100 respirators", "Airtight goggles", "Skin protection"],
            "guidelines": [
                "Banned: Heavy excavation, earthmoving, and dry concrete cutting.",
                "Mandate 15-minute breaks in air-conditioned recovery rooms every hour."
            ],
            "water_spraying": "Intense (Hourly water spraying on active haul roads)",
            "health_risk": "Significant risk of respiratory distress. Stop work for individuals with asthma or cardiovascular conditions."
        }
    else:
        return {
            "status": "Hazardous (Work Suspended)",
            "color": "#f43f5e",
            "ppe": ["Banned from outdoor work. Emergency staff must wear positive pressure respirators."],
            "guidelines": [
                "Suspended: All outdoor construction and civil engineering operations.",
                "All workers must retreat to indoor clean-air facilities."
            ],
            "water_spraying": "Continuous mist cannons to settle severe particulate spikes",
            "health_risk": "Dangerous conditions. Severe respiratory threat. Mandatory evacuation from open field zones."
        }


@prediction_bp.route("/predict-aqi", methods=["GET"])
def get_predict_aqi():
    city = request.args.get("city", "Bengaluru").strip()

    # Return cached result if available
    cached = _cache_get(_prediction_cache, city)
    if cached:
        return jsonify(cached), 200

    prediction_data = predict_future_aqi(city)

    next_hour_aqi = prediction_data["next_hour"]
    tomorrow_aqi  = prediction_data["tomorrow"]

    response_payload = {
        "city": city,
        "next_hour": {
            "aqi":            next_hour_aqi,
            "recommendation": generate_safety_recommendations(next_hour_aqi)
        },
        "tomorrow": {
            "aqi":            tomorrow_aqi,
            "recommendation": generate_safety_recommendations(tomorrow_aqi)
        },
        "weekly_trend": prediction_data["weekly_trend"],
        "r2_score":     prediction_data["r2_score"],
        "last_trained": prediction_data["last_trained"]
    }

    _cache_set(_prediction_cache, city, response_payload, PREDICTION_CACHE_TTL)

    # DB log is non-blocking
    def _write_db():
        try:
            db.predictions.delete_many({"city": {"$regex": f"^{city}$", "$options": "i"}})
            db.predictions.insert_one({
                "city":          city,
                "next_hour_aqi": next_hour_aqi,
                "tomorrow_aqi":  tomorrow_aqi,
                "timestamp":     datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            })
        except Exception:
            pass

    threading.Thread(target=_write_db, daemon=True).start()

    return jsonify(response_payload), 200

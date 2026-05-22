from flask import Blueprint, request, jsonify
from models.db import db
from services.aqi_service import AQIService, CITIES_COORDS
from datetime import datetime
import threading
import time

aqi_bp = Blueprint("aqi", __name__)

# ─────────────────────────────────────────────────────────────────
# In-memory caches so repeated page loads are instant
# ─────────────────────────────────────────────────────────────────
_current_aqi_cache = {}          # city -> {data, expires_at}
_stations_map_cache = {"data": None, "expires_at": 0}
_historical_cache   = {}          # city -> {data, expires_at}

CURRENT_CACHE_TTL   = 60   # seconds – current AQI refreshes every minute
STATIONS_CACHE_TTL  = 120  # seconds – map refreshes every 2 min
HISTORICAL_CACHE_TTL= 300  # seconds – historical seeded data is stable


def _cache_get(cache_dict, key=None):
    entry = cache_dict if key is None else cache_dict.get(key)
    if entry and entry.get("expires_at", 0) > time.time():
        return entry.get("data")
    return None


def _cache_set(cache_dict, data, ttl, key=None):
    entry = {"data": data, "expires_at": time.time() + ttl}
    if key is None:
        cache_dict.update(entry)
    else:
        cache_dict[key] = entry


# ─────────────────────────────────────────────────────────────────
@aqi_bp.route("/current-aqi", methods=["GET"])
def get_current_aqi():
    city = request.args.get("city", "Bengaluru").strip()

    # Return from cache if fresh
    cached = _cache_get(_current_aqi_cache, city)
    if cached:
        return jsonify(cached), 200

    current_data = AQIService.get_current_aqi(city)

    # Fire-and-forget DB write so it doesn't block the response
    def _write_db():
        try:
            db.aqi_data.insert_one({
                "city": current_data["city"],
                "aqi": current_data["aqi"],
                "category": current_data["category"],
                "pm25": current_data["pm25"],
                "pm10": current_data["pm10"],
                "no2": current_data["no2"],
                "so2": current_data["so2"],
                "co": current_data["co"],
                "temperature": current_data["temperature"],
                "humidity": current_data["humidity"],
                "wind_speed": current_data["wind_speed"],
                "lat": current_data["lat"],
                "lon": current_data["lon"],
                "timestamp": current_data["timestamp"]
            })
        except Exception:
            pass

    threading.Thread(target=_write_db, daemon=True).start()

    _cache_set(_current_aqi_cache, current_data, CURRENT_CACHE_TTL, city)
    return jsonify(current_data), 200


# ─────────────────────────────────────────────────────────────────
@aqi_bp.route("/historical-data", methods=["GET"])
def get_historical_data():
    city = request.args.get("city", "Bengaluru").strip()
    days = int(request.args.get("days", 7))
    cache_key = f"{city}_{days}"

    cached = _cache_get(_historical_cache, cache_key)
    if cached:
        return jsonify(cached), 200

    # Only check DB count — don't load all records yet
    # Seed from simulator if needed, then return only what we need
    # Use the simulator directly for speed (bypasses DB read/write delay)
    raw_records = AQIService.get_historical_data(city, days=days)

    # Trim to last days*24 records to keep response small
    limit = days * 24
    raw_records = raw_records[-limit:]

    formatted_records = [{
        "city":        r.get("city"),
        "aqi":         r.get("aqi"),
        "pm25":        r.get("pm25"),
        "pm10":        r.get("pm10"),
        "no2":         r.get("no2"),
        "so2":         r.get("so2"),
        "co":          r.get("co"),
        "temperature": r.get("temperature"),
        "humidity":    r.get("humidity"),
        "wind_speed":  r.get("wind_speed"),
        "timestamp":   r.get("timestamp")
    } for r in raw_records]

    aqi_values = [r["aqi"] for r in formatted_records]
    avg_aqi    = round(sum(aqi_values) / len(aqi_values), 1) if aqi_values else 0
    max_aqi    = max(aqi_values) if aqi_values else 0
    spike_time = next((r["timestamp"] for r in formatted_records if r["aqi"] == max_aqi), "")

    result = {
        "city":    city,
        "records": formatted_records,
        "analytics": {
            "average_aqi":        avg_aqi,
            "highest_aqi":        max_aqi,
            "highest_spike_time": spike_time,
            "total_readings":     len(formatted_records)
        }
    }

    _cache_set(_historical_cache, result, HISTORICAL_CACHE_TTL, cache_key)
    return jsonify(result), 200


# ─────────────────────────────────────────────────────────────────
@aqi_bp.route("/compare-locations", methods=["GET"])
def compare_locations():
    cities_param = request.args.get("cities", "Bengaluru,New Delhi").strip()
    cities = [c.strip() for c in cities_param.split(",") if c.strip()]

    # Parallel fetch using threads for speed
    results = [None] * len(cities)

    def fetch_one(i, city):
        cached = _cache_get(_current_aqi_cache, city)
        results[i] = cached if cached else AQIService.get_current_aqi(city)

    threads = [threading.Thread(target=fetch_one, args=(i, c)) for i, c in enumerate(cities)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()

    return jsonify(results), 200


# ─────────────────────────────────────────────────────────────────
@aqi_bp.route("/aqi-correlation", methods=["GET"])
def get_aqi_correlation():
    city = request.args.get("city", "Bengaluru").strip()

    # Compute directly from simulator (fast, deterministic, no DB needed)
    raw = AQIService.get_historical_data(city, days=7)
    raw = raw[-168:]  # last 7 days × 24h

    aqi  = [r.get("aqi")         for r in raw]
    temp = [r.get("temperature") for r in raw]
    humi = [r.get("humidity")    for r in raw]
    wind = [r.get("wind_speed")  for r in raw]

    def pearson_r(x, y):
        n = len(x)
        if n < 2: return 0.0
        mx, my = sum(x)/n, sum(y)/n
        covar  = sum((x[i]-mx)*(y[i]-my) for i in range(n))
        var_x  = sum((x[i]-mx)**2 for i in range(n))
        var_y  = sum((y[i]-my)**2 for i in range(n))
        if var_x == 0 or var_y == 0: return 0.0
        return covar / ((var_x * var_y)**0.5)

    r_wind = pearson_r(aqi, wind)
    r_humi = pearson_r(aqi, humi)

    return jsonify({
        "city": city,
        "correlation": {
            "aqi_vs_temperature": round(pearson_r(aqi, temp), 3),
            "aqi_vs_humidity":    round(r_humi, 3),
            "aqi_vs_wind":        round(r_wind, 3)
        },
        "insights": {
            "wind_impact":     "Strong positive dispersion (wind clears pollution)" if r_wind < -0.3 else "Negligible wind correlation",
            "humidity_impact": "Strong particulate trapping (humidity concentrates pollution)" if r_humi > 0.3 else "Negligible humidity correlation"
        }
    }), 200


# ─────────────────────────────────────────────────────────────────
@aqi_bp.route("/stations-map", methods=["GET"])
def get_stations_map():
    """Return station AQI for map pins.
    Uses in-memory cache + parallel threading so all 25 stations
    are fetched simultaneously instead of serially."""
    cached = _cache_get(_stations_map_cache)
    if cached:
        return jsonify(cached), 200

    cities  = AQIService.get_supported_cities()
    results = [None] * len(cities)

    def fetch_one(i, city):
        # Use cache if available, otherwise compute from simulator
        data = _cache_get(_current_aqi_cache, city) or AQIService.get_current_aqi(city)
        results[i] = {
            "city":     data["city"],
            "aqi":      data["aqi"],
            "category": data["category"],
            "lat":      data["lat"],
            "lon":      data["lon"],
            "pm25":     data["pm25"],
            "pm10":     data["pm10"]
        }

    threads = [threading.Thread(target=fetch_one, args=(i, c)) for i, c in enumerate(cities)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()

    stations = [r for r in results if r]
    _cache_set(_stations_map_cache, stations, STATIONS_CACHE_TTL)
    return jsonify(stations), 200

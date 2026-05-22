import math
import random
import time
import requests
from datetime import datetime, timedelta
from config import Config

# Standard coordinate mapping for supported cities
CITIES_COORDS = {
    # Bengaluru Stations
    "Bengaluru - Silk Board": {"lat": 12.9176, "lon": 77.6244, "base_aqi": 115, "industry": "high"},
    "Bengaluru - Peenya Industrial Area": {"lat": 13.0285, "lon": 77.5197, "base_aqi": 140, "industry": "high"},
    "Bengaluru - City Railway Station": {"lat": 12.9783, "lon": 77.5694, "base_aqi": 85, "industry": "moderate"},
    "Bengaluru - Whitefield IT Hub": {"lat": 12.9698, "lon": 77.7500, "base_aqi": 70, "industry": "moderate"},
    "Bengaluru - Hebbal Outer Ring Road": {"lat": 13.0354, "lon": 77.5988, "base_aqi": 95, "industry": "moderate"},
    
    # New Delhi Stations
    "New Delhi - ITO": {"lat": 28.6284, "lon": 77.2410, "base_aqi": 260, "industry": "high"},
    "New Delhi - Anand Vihar": {"lat": 28.6476, "lon": 77.3158, "base_aqi": 290, "industry": "high"},
    "New Delhi - Dwarka Sector 8": {"lat": 28.5714, "lon": 77.0700, "base_aqi": 220, "industry": "moderate"},
    "New Delhi - RK Puram": {"lat": 28.5660, "lon": 77.1762, "base_aqi": 210, "industry": "moderate"},
    "New Delhi - Connaught Place": {"lat": 28.6304, "lon": 77.2177, "base_aqi": 180, "industry": "low"},
    
    # Mumbai Stations
    "Mumbai - Bandra Kurla Complex": {"lat": 19.0600, "lon": 72.8600, "base_aqi": 145, "industry": "high"},
    "Mumbai - Chembur": {"lat": 19.0622, "lon": 72.9025, "base_aqi": 160, "industry": "high"},
    "Mumbai - Colaba Clean Air": {"lat": 18.9067, "lon": 72.8147, "base_aqi": 65, "industry": "low"},
    "Mumbai - Andheri East": {"lat": 19.1170, "lon": 72.8630, "base_aqi": 120, "industry": "moderate"},
    
    # New York Stations
    "New York - Bronx Traffic Corridor": {"lat": 40.8448, "lon": -73.8648, "base_aqi": 55, "industry": "moderate"},
    "New York - Central Park Baseline": {"lat": 40.7851, "lon": -73.9683, "base_aqi": 28, "industry": "low"},
    "New York - Queens Industrial": {"lat": 40.7282, "lon": -73.7949, "base_aqi": 46, "industry": "moderate"},
    
    # London Stations
    "London - Westminster Roadside": {"lat": 51.4975, "lon": -0.1357, "base_aqi": 48, "industry": "moderate"},
    "London - Greenwich Environment": {"lat": 51.4826, "lon": 0.0077, "base_aqi": 32, "industry": "low"},
    "London - City of London Center": {"lat": 51.5155, "lon": -0.0922, "base_aqi": 42, "industry": "low"},
    
    # Tokyo Stations
    "Tokyo - Shinjuku Highway Station": {"lat": 35.6895, "lon": 139.6917, "base_aqi": 55, "industry": "moderate"},
    "Tokyo - Shibuya Center": {"lat": 35.6580, "lon": 139.7016, "base_aqi": 46, "industry": "low"},
    "Tokyo - Koto Industrial Outer": {"lat": 35.6722, "lon": 139.8174, "base_aqi": 68, "industry": "high"},
    
    # Sydney Stations
    "Sydney - CBD Macquarie Street": {"lat": -33.8675, "lon": 151.2131, "base_aqi": 35, "industry": "low"},
    "Sydney - Parramatta Transit": {"lat": -33.8150, "lon": 151.0011, "base_aqi": 48, "industry": "moderate"},
}

class AQIService:
    @staticmethod
    def get_supported_cities():
        return list(CITIES_COORDS.keys())

    @staticmethod
    def get_current_aqi(city):
        """
        Fetch real-time AQI and weather parameters for a city.
        Checks for configured API keys; otherwise uses the simulator.
        """
        city = city.strip()
        # Normalization
        matched_city = None
        for key in CITIES_COORDS.keys():
            if key.lower() == city.lower():
                matched_city = key
                break
        
        if not matched_city:
            # Dynamically register new searched city
            matched_city = city
            # Seed based on city name to keep dynamic values consistent across searches
            rng_city = random.Random(f"coords-{city.lower()}")
            CITIES_COORDS[city] = {
                "lat": 10.0 + rng_city.random() * 40,
                "lon": -100.0 + rng_city.random() * 200,
                "base_aqi": rng_city.randint(30, 250),
                "industry": rng_city.choice(["low", "moderate", "high"])
            }

        # If API keys are set, attempt real API fetches
        if not Config.FORCE_SIMULATOR:
            if Config.WAQI_API_TOKEN:
                res = AQIService._fetch_waqi_current(matched_city)
                if res:
                    return res
            if Config.OPENAQ_API_KEY:
                res = AQIService._fetch_openaq_current(matched_city)
                if res:
                    return res
        
        # Default to simulator
        return AQIService._simulate_current(matched_city)

    @staticmethod
    def get_historical_data(city, days=7):
        """
        Returns historical measurements (hourly interval) for the past N days.
        Used for visualization charts and training the ML models.
        """
        city = city.strip()
        matched_city = None
        for key in CITIES_COORDS.keys():
            if key.lower() == city.lower():
                matched_city = key
                break
        if not matched_city:
            matched_city = city
            CITIES_COORDS[city] = {
                "lat": 20.0, "lon": 70.0, "base_aqi": 80, "industry": "moderate"
            }

        # Simulated historical data generator (highly correlated curves)
        return AQIService._simulate_historical(matched_city, days)

    # --- WAQI API Client ---
    @staticmethod
    def _fetch_waqi_current(city):
        try:
            url = f"https://api.waqi.info/feed/{city}/?token={Config.WAQI_API_TOKEN}"
            response = requests.get(url, timeout=5)
            data = response.json()
            if data.get("status") == "ok" and "data" in data:
                payload = data["data"]
                aqi = payload.get("aqi", 50)
                iaqi = payload.get("iaqi", {})
                
                # Fetch pollutant values
                pm25 = iaqi.get("pm25", {}).get("v", aqi * 0.75)
                pm10 = iaqi.get("pm10", {}).get("v", aqi * 1.2)
                no2 = iaqi.get("no2", {}).get("v", aqi * 0.4)
                so2 = iaqi.get("so2", {}).get("v", aqi * 0.15)
                co = iaqi.get("co", {}).get("v", aqi * 0.01)
                
                # Fetch weather
                temp = iaqi.get("t", {}).get("v", random.randint(15, 35))
                humi = iaqi.get("h", {}).get("v", random.randint(30, 85))
                wind = iaqi.get("w", {}).get("v", random.randint(2, 20))
                
                return AQIService._format_response(city, aqi, pm25, pm10, no2, so2, co, temp, humi, wind)
        except Exception as e:
            print(f"Error fetching from WAQI API for {city}: {e}")
        return None

    # --- OpenAQ API Client ---
    @staticmethod
    def _fetch_openaq_current(city):
        # OpenAQ v2 latest data fetch
        try:
            headers = {"X-API-Key": Config.OPENAQ_API_KEY}
            url = f"https://api.openaq.org/v2/latest?city={city}"
            response = requests.get(url, headers=headers, timeout=5)
            data = response.json()
            if "results" in data and len(data["results"]) > 0:
                result = data["results"][0]
                measurements = {m["parameter"]: m["value"] for m in result.get("measurements", [])}
                
                # Calculate a mock/estimate AQI from key pollutants (PM2.5) or default
                pm25 = measurements.get("pm25", random.randint(10, 150))
                pm10 = measurements.get("pm10", pm25 * 1.5)
                no2 = measurements.get("no2", random.randint(5, 50))
                so2 = measurements.get("so2", random.randint(1, 15))
                co = measurements.get("co", random.random() * 2)
                
                # Crude AQI estimation based on PM2.5 (standard US EPA quick-calc)
                if pm25 <= 12.0:
                    aqi = int((50 - 0) / (12.0 - 0) * (pm25 - 0) + 0)
                elif pm25 <= 35.4:
                    aqi = int((100 - 51) / (35.4 - 12.1) * (pm25 - 12.1) + 51)
                elif pm25 <= 55.4:
                    aqi = int((150 - 101) / (55.4 - 35.5) * (pm25 - 35.5) + 101)
                elif pm25 <= 150.4:
                    aqi = int((200 - 151) / (150.4 - 55.5) * (pm25 - 55.5) + 151)
                else:
                    aqi = int((300 - 201) / (250.4 - 150.5) * (pm25 - 150.5) + 201)

                temp = random.randint(15, 35)
                humi = random.randint(30, 85)
                wind = random.randint(2, 20)
                
                return AQIService._format_response(city, aqi, pm25, pm10, no2, so2, co, temp, humi, wind)
        except Exception as e:
            print(f"Error fetching from OpenAQ API for {city}: {e}")
        return None

    # --- Atmospheric Simulator ---
    @staticmethod
    def _simulate_current(city):
        """Simulates current AQI based on datetime and predefined base levels."""
        city_info = CITIES_COORDS.get(city, {"base_aqi": 60, "industry": "moderate"})
        base = city_info["base_aqi"]
        
        # 1. Hour factor (diurnal curve: traffic peaks at 8-10 AM and 6-9 PM)
        now = datetime.now()
        hour = now.hour
        diurnal_multiplier = 1.0 + 0.35 * math.sin((hour - 8) * math.pi / 6) if (6 <= hour <= 12) else 1.0
        if 17 <= hour <= 22:
            diurnal_multiplier += 0.4 * math.sin((hour - 17) * math.pi / 5)
            
        # Seed the random number generator using the current year, month, day, hour, and city name
        # to ensure the simulation is stable and deterministic within the same hour
        seed_val = f"{now.year}-{now.month}-{now.day}-{now.hour}-{city.lower()}"
        rng = random.Random(seed_val)
            
        # 2. Weather conditions
        # Simulate local weather factors
        temp = 20 + 10 * math.sin((hour - 6) * math.pi / 12) + rng.uniform(-2, 2)
        humi = 60 - 20 * math.sin((hour - 6) * math.pi / 12) + rng.uniform(-5, 5)
        wind = rng.uniform(2, 25)
        
        # Wind cleans air, humidity traps particulates
        wind_factor = max(0.6, 1.3 - (wind / 12.0))
        humi_factor = 1.0 + ((humi - 50) / 150.0)
        
        # Base computation
        aqi = int(base * diurnal_multiplier * wind_factor * humi_factor + rng.uniform(-8, 8))
        aqi = max(5, aqi) # Make sure it is positive

        # Core pollutants proportional to AQI + noise
        pm25 = round(aqi * 0.75 + rng.uniform(-5, 5), 1)
        pm10 = round(aqi * 1.25 + rng.uniform(-8, 8), 1)
        no2 = round(aqi * 0.35 + rng.uniform(-3, 3), 1)
        so2 = round(aqi * 0.12 + rng.uniform(-1.5, 1.5), 1)
        co = round(aqi * 0.008 + rng.uniform(-0.1, 0.1), 2)

        # Clamping minimums
        pm25 = max(1.0, pm25)
        pm10 = max(2.0, pm10)
        no2 = max(0.5, no2)
        so2 = max(0.1, so2)
        co = max(0.01, co)

        return AQIService._format_response(city, aqi, pm25, pm10, no2, so2, co, temp, humi, wind)

    @staticmethod
    def _simulate_historical(city, days):
        """Generates hourly historical datasets spanning N days back."""
        city_info = CITIES_COORDS.get(city, {"base_aqi": 60, "industry": "moderate", "lat": 12.97, "lon": 77.59})
        base = city_info["base_aqi"]
        
        data_points = []
        end_time = datetime.now()
        start_time = end_time - timedelta(days=days)
        
        current_cursor = start_time
        
        # Seed generator based on city name to yield consistent historical curves across page refreshes
        rng = random.Random(f"history-{city.lower()}")
        
        # Determine fixed weather cycle offsets for realistic curves
        weather_cycle_offset = rng.uniform(0, 2 * math.pi)

        while current_cursor <= end_time:
            hour = current_cursor.hour
            day_of_week = current_cursor.weekday() # 0-6
            
            # Diurnal multiplier (traffic rush hour signature)
            diurnal = 1.0
            if 7 <= hour <= 10:
                diurnal += 0.3 * math.sin((hour - 7) * math.pi / 3)
            elif 18 <= hour <= 21:
                diurnal += 0.35 * math.sin((hour - 18) * math.pi / 3)
            
            # Weekly multiplier (weekends have lower industrial/commute emissions)
            weekly = 0.85 if day_of_week >= 5 else 1.05
            
            # Regional weather simulation
            temp = 22 + 8 * math.sin((hour - 6) * math.pi / 12) + math.sin(current_cursor.day + weather_cycle_offset) * 3
            humi = 65 - 18 * math.sin((hour - 6) * math.pi / 12) - math.sin(current_cursor.day + weather_cycle_offset) * 5
            humi = min(95, max(15, humi))
            
            # Simulated wind cycle
            wind = 8.0 + 6.0 * math.sin((hour - 12) * math.pi / 12 + weather_cycle_offset) + rng.uniform(-2, 2)
            wind = max(1.0, wind)

            # Atmospheric dispersion factors
            dispersion = max(0.5, 1.4 - (wind / 10.0))
            humidity_trapping = 1.0 + ((humi - 50) / 120.0)
            
            # Combine factors to establish continuous realistic AQI trends
            aqi = int(base * diurnal * weekly * dispersion * humidity_trapping + rng.uniform(-5, 5))
            aqi = max(5, aqi)
            
            # Break down chemical variables
            pm25 = round(aqi * 0.72 + rng.uniform(-3, 3), 1)
            pm10 = round(aqi * 1.20 + rng.uniform(-5, 5), 1)
            no2 = round(aqi * 0.38 + rng.uniform(-2, 2), 1)
            so2 = round(aqi * 0.11 + rng.uniform(-1.0, 1.0), 1)
            co = round(aqi * 0.007 + rng.uniform(-0.08, 0.08), 2)
            
            pm25 = max(1.0, pm25)
            pm10 = max(2.0, pm10)
            no2 = max(0.5, no2)
            so2 = max(0.1, so2)
            co = max(0.01, co)

            data_points.append({
                "city": city,
                "timestamp": current_cursor.strftime("%Y-%m-%d %H:%M:%S"),
                "aqi": aqi,
                "pm25": pm25,
                "pm10": pm10,
                "no2": no2,
                "so2": so2,
                "co": co,
                "temperature": round(temp, 1),
                "humidity": round(humi, 1),
                "wind_speed": round(wind, 1),
            })
            current_cursor += timedelta(hours=1)
            
        return data_points

    @staticmethod
    def _format_response(city, aqi, pm25, pm10, no2, so2, co, temp, humi, wind):
        # Derive AQI category name
        if aqi <= 50:
            category = "Good"
        elif aqi <= 100:
            category = "Moderate"
        elif aqi <= 200:
            category = "Unhealthy"
        elif aqi <= 300:
            category = "Very Unhealthy"
        else:
            category = "Hazardous"
            
        city_coords = CITIES_COORDS.get(city, {"lat": 12.9716, "lon": 77.5946})

        return {
            "city": city,
            "aqi": aqi,
            "category": category,
            "pm25": round(pm25, 1),
            "pm10": round(pm10, 1),
            "no2": round(no2, 1),
            "so2": round(so2, 1),
            "co": round(co, 2),
            "temperature": round(temp, 1),
            "humidity": round(humi, 1),
            "wind_speed": round(wind, 1),
            "lat": city_coords.get("lat", 12.9716),
            "lon": city_coords.get("lon", 77.5946),
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }

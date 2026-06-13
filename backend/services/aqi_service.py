import math
import random
import time
import requests
import re
from datetime import datetime, timedelta
from config import Config
from zoneinfo import ZoneInfo

def get_city_timezone(city_name):
    # Find which city in our map matches the station prefix
    cities_tz = {
        "bengaluru": "Asia/Kolkata",
        "new delhi": "Asia/Kolkata",
        "mumbai": "Asia/Kolkata",
        "new york": "America/New_York",
        "london": "Europe/London",
        "tokyo": "Asia/Tokyo",
        "sydney": "Australia/Sydney"
    }
    city_lower = city_name.lower()
    for prefix, tz in cities_tz.items():
        if city_lower.startswith(prefix):
            return tz
    return "UTC"


# Mapping of supported cities to aqicn.org URL paths for accurate ground station scraping
AQICN_URL_MAP = {
    "Bengaluru - Silk Board": "india/bengaluru/silk-board",
    "Bengaluru - Peenya Industrial Area": "india/bangalore/peenya",
    "Bengaluru - City Railway Station": "india/bangalore/city-railway-station",
    "Bengaluru - Whitefield IT Hub": "india/bengaluru/bwssb-kadabesanahalli", # Kadubeesanahalli represents Whitefield corridor
    "Bengaluru - Hebbal Outer Ring Road": "india/bengaluru/hebbal",
    "New Delhi - ITO": "delhi/ito",
    "New Delhi - Anand Vihar": "delhi/anand-vihar",
    "New Delhi - Dwarka Sector 8": "delhi/national-institute-of-malaria-research--sector-8--dwarka",
    "New Delhi - RK Puram": "delhi/r.k.-puram",
    "New Delhi - Connaught Place": "delhi/mandir-marg",
    "Mumbai - Bandra Kurla Complex": "india/mumbai/bandra-kurla-complex",
    "Mumbai - Chembur": "india/mumbai/deonar", # Deonar represents Chembur area
    "Mumbai - Colaba Clean Air": "india/mumbai/colaba",
    "Mumbai - Andheri East": "india/mumbai/chakala-andheri-east",
    "New York - Bronx Traffic Corridor": "usa/newyork/is-74",
    "New York - Central Park Baseline": "usa/newyork/ccny",
    "New York - Queens Industrial": "usa/newyork/queens-college",
    "London - Westminster Roadside": "united-kingdom/london-westminster",
    "London - Greenwich Environment": "united-kingdom/greenwich-trafalgar-road-hoskins-st",
    "London - City of London Center": "united-kingdom/city-of-london-sir-john-cass-school",
    "Tokyo - Shinjuku Highway Station": "japan/shinjuku-ku-/kuni-shinjuku",
    "Tokyo - Shibuya Center": "japan/shibuyaku/shibuyakuudagawamachi",
    "Tokyo - Koto Industrial Outer": "japan/kotoku/kotokuoshima",
    "Sydney - CBD Macquarie Street": "australia/nsw/macquarie-park/sydney-east",
    "Sydney - Parramatta Transit": "australia/nsw/north-parramatta/sydney-north-west",
}

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
            coords = AQIService._geocode_city(city)
            if coords:
                lat = coords["lat"]
                lon = coords["lon"]
            else:
                rng_city = random.Random(f"coords-{city.lower()}")
                lat = 10.0 + rng_city.random() * 40
                lon = -100.0 + rng_city.random() * 200

            CITIES_COORDS[city] = {
                "lat": lat,
                "lon": lon,
                "base_aqi": 80,
                "industry": "moderate"
            }

        # If API keys are set, attempt real API fetches
        if not Config.FORCE_SIMULATOR:
            if Config.WAQI_API_TOKEN and Config.WAQI_API_TOKEN != "your_real_waqi_api_token_here":
                res = AQIService._fetch_waqi_current(matched_city)
                if res:
                    return res

            # Fallback to scraping if API token is missing or API fails/stale
            res = AQIService._fetch_aqicn_scraped(matched_city)
            if res:
                return res

            if Config.OPENAQ_API_KEY and Config.OPENAQ_API_KEY != "your_real_openaq_api_key_here":
                res = AQIService._fetch_openaq_current(matched_city)
                if res:
                    return res
            
            # Default to Open-Meteo for real data
            res = AQIService._fetch_openmeteo_current(matched_city)
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
            coords = AQIService._geocode_city(city)
            if coords:
                lat = coords["lat"]
                lon = coords["lon"]
            else:
                lat = 20.0
                lon = 70.0

            CITIES_COORDS[city] = {
                "lat": lat,
                "lon": lon,
                "base_aqi": 80,
                "industry": "moderate"
            }

        if not Config.FORCE_SIMULATOR:
            res = AQIService._fetch_openmeteo_historical(matched_city, days)
            if res:
                # Dynamically calibrate historical data to match ground-station measurements
                calibrated = False
                try:
                    current_curr = AQIService.get_current_aqi(matched_city)
                    if current_curr:
                        curr_aqi = current_curr["aqi"]
                        om_curr = AQIService._fetch_openmeteo_current(matched_city)
                        if om_curr:
                            om_aqi = om_curr.get("raw_aqi", om_curr["aqi"])
                            if om_aqi > 0 and curr_aqi > 0:
                                ratio = curr_aqi / om_aqi
                                # Clamp ratio to a reasonable range [0.05, 10.0] to prevent extreme distortion
                                ratio = max(0.05, min(10.0, ratio))
                                for record in res:
                                    record["aqi"] = max(5, min(500, int(record["aqi"] * ratio)))
                                    record["pm25"] = max(1.0, round(record["pm25"] * ratio, 1))
                                    record["pm10"] = max(2.0, round(record["pm10"] * ratio, 1))
                                    record["no2"] = max(0.5, round(record["no2"] * ratio, 1))
                                    record["so2"] = max(0.1, round(record["so2"] * ratio, 1))
                                    record["co"] = max(0.01, round(record["co"] * ratio, 2))
                                calibrated = True
                except Exception as e:
                    print(f"Error calibrating historical data for {matched_city}: {e}")
                
                # If calibration was not performed, ensure AQI is clamped to 500
                if not calibrated:
                    for record in res:
                        record["aqi"] = min(500, int(record["aqi"]))
                
                tz_name = get_city_timezone(matched_city)
                current_local_time = datetime.now(ZoneInfo(tz_name)).strftime("%Y-%m-%d %H:%M:%S")
                res = [record for record in res if record["timestamp"] <= current_local_time]
                return res

        # Simulated historical data generator (highly correlated curves)
        res = AQIService._simulate_historical(matched_city, days)
        tz_name = get_city_timezone(matched_city)
        current_local_time = datetime.now(ZoneInfo(tz_name)).strftime("%Y-%m-%d %H:%M:%S")
        res = [record for record in res if record["timestamp"] <= current_local_time]
        return res

    @staticmethod
    def _fetch_aqicn_scraped(city):
        """
        Scrapes real-time ground-level station sensor measurements from aqicn.org.
        Uses a predefined mapping of city_key to aqicn.org URL path.
        """
        try:
            path = AQICN_URL_MAP.get(city)
            if not path:
                return None
            
            url = f"https://aqicn.org/city/{path}/"
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            }
            res = requests.get(url, headers=headers, timeout=10)
            if res.status_code != 200:
                return None
            
            html = res.text
            
            # Check for stale data (older than 24 hours) from checkWidgetUpdateTime call in script
            time_match = re.search(r'checkWidgetUpdateTime\(\s*(\d+)\s*,', html)
            if time_match:
                try:
                    scraped_epoch = int(time_match.group(1))
                    if time.time() - scraped_epoch > 24 * 3600:
                        print(f"Scraped AQICN data for {city} is stale (epoch: {scraped_epoch}). Falling back.")
                        return None
                except Exception as e:
                    print(f"Error parsing scraped epoch: {e}")

            # Extract main AQI
            aqi_match = re.search(r'<div[^>]*class=["\'][^"\']*aqivalue[^"\']*["\'][^>]*>([^<]+)</div>', html)
            if not aqi_match:
                return None
                
            aqi_str = aqi_match.group(1).strip()
            if not aqi_str.isdigit():
                return None
            aqi = int(aqi_str)
            
            # Extract pollutants
            pollutants = {}
            for p in ["pm25", "pm10", "o3", "no2", "so2", "co", "t", "h", "w"]:
                pattern = rf"<td[^>]*id=['\"]cur_{p}['\'][^>]*>(.*?)</td>"
                match = re.search(pattern, html, re.DOTALL)
                if match:
                    val_str = re.sub(r'<[^>]*>', '', match.group(1)).strip()
                    val_match = re.search(r'[-+]?\d*\.\d+|\d+', val_str)
                    if val_match:
                        pollutants[p] = float(val_match.group(0))
                    else:
                        pollutants[p] = None
                else:
                    pollutants[p] = None
            
            # If standard elements are missing, interpolate proportionally relative to the overall scraped AQI
            pm25 = pollutants.get("pm25") if pollutants.get("pm25") is not None else aqi * 0.75
            pm10 = pollutants.get("pm10") if pollutants.get("pm10") is not None else aqi * 1.25
            no2 = pollutants.get("no2") if pollutants.get("no2") is not None else aqi * 0.35
            so2 = pollutants.get("so2") if pollutants.get("so2") is not None else aqi * 0.12
            co = pollutants.get("co") if pollutants.get("co") is not None else aqi * 0.008
            
            # Temperature, humidity, wind
            temp = pollutants.get("t") if pollutants.get("t") is not None else 25.0
            humi = pollutants.get("h") if pollutants.get("h") is not None else 60.0
            wind = pollutants.get("w") if pollutants.get("w") is not None else 10.0
            
            # Clamp CO in ppm if it seems to be reported as a sub-index/AQI instead of concentration
            if co > 5.0:
                co = min(5.0, co / 10.0)
                
            return AQIService._format_response(city, aqi, pm25, pm10, no2, so2, co, temp, humi, wind)
        except Exception as e:
            print(f"Error scraping AQICN for {city}: {e}")
        return None

    # --- Open-Meteo & Geocoding Client ---
    @staticmethod
    def _geocode_city(city):
        try:
            url = f"https://geocoding-api.open-meteo.com/v1/search?name={city}&count=1&language=en&format=json"
            res = requests.get(url, timeout=5)
            if res.status_code == 200:
                results = res.json().get("results")
                if results and len(results) > 0:
                    return {
                        "lat": results[0]["latitude"],
                        "lon": results[0]["longitude"]
                    }
        except Exception as e:
            print(f"Error geocoding city {city}: {e}")
        return None

    @staticmethod
    def _fetch_openmeteo_current(city):
        try:
            city_coords = CITIES_COORDS.get(city)
            if not city_coords:
                return None
            lat = city_coords["lat"]
            lon = city_coords["lon"]
            
            tz_name = get_city_timezone(city)
            # Fetch Air Quality
            aq_url = f"https://air-quality-api.open-meteo.com/v1/air-quality?latitude={lat}&longitude={lon}&current=pm2_5,pm10,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,us_aqi&timezone={tz_name}"
            aq_res = requests.get(aq_url, timeout=10)
            if aq_res.status_code != 200:
                return None
            aq_data = aq_res.json().get("current", {})
            
            # Fetch Weather
            w_url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m"
            w_res = requests.get(w_url, timeout=10)
            if w_res.status_code != 200:
                return None
            w_data = w_res.json().get("current", {})
            
            # Parse parameters
            aqi_val = aq_data.get("us_aqi", 50)
            aqi = int(aqi_val) if aqi_val is not None else 50
            pm25 = aq_data.get("pm2_5", 0.0)
            pm10 = aq_data.get("pm10", 0.0)
            
            # Unit conversions (ug/m3 to ppm / ppb)
            co_ug = aq_data.get("carbon_monoxide", 0.0)
            no2_ug = aq_data.get("nitrogen_dioxide", 0.0)
            so2_ug = aq_data.get("sulphur_dioxide", 0.0)
            
            co = co_ug * 0.000873 if co_ug is not None else 0.0
            no2 = no2_ug / 1.88 if no2_ug is not None else 0.0
            so2 = so2_ug / 2.62 if so2_ug is not None else 0.0
            
            temp = w_data.get("temperature_2m", 25.0)
            humi = w_data.get("relative_humidity_2m", 60.0)
            wind = w_data.get("wind_speed_10m", 10.0)
            
            return AQIService._format_response(city, aqi, pm25, pm10, no2, so2, co, temp, humi, wind)
        except Exception as e:
            print(f"Error fetching from Open-Meteo API for {city}: {e}")
        return None

    @staticmethod
    def _fetch_openmeteo_historical(city, days):
        try:
            city_coords = CITIES_COORDS.get(city)
            if not city_coords:
                return None
            lat = city_coords["lat"]
            lon = city_coords["lon"]
            
            tz_name = get_city_timezone(city)
            # Fetch Air Quality History
            aq_url = f"https://air-quality-api.open-meteo.com/v1/air-quality?latitude={lat}&longitude={lon}&hourly=pm2_5,pm10,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,us_aqi&past_days={days}&forecast_days=1&timezone={tz_name}"
            aq_res = requests.get(aq_url, timeout=15)
            if aq_res.status_code != 200:
                return None
            aq_hourly = aq_res.json().get("hourly", {})
            
            # Fetch Weather History
            w_url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&hourly=temperature_2m,relative_humidity_2m,wind_speed_10m&past_days={days}&forecast_days=1&timezone={tz_name}"
            w_res = requests.get(w_url, timeout=15)
            if w_res.status_code != 200:
                return None
            w_hourly = w_res.json().get("hourly", {})
            
            # Align records
            time_list = aq_hourly.get("time", [])
            records = []
            
            for i in range(len(time_list)):
                timestamp_str = time_list[i]
                dt = datetime.strptime(timestamp_str, "%Y-%m-%dT%H:%M")
                
                aqi_val = aq_hourly.get("us_aqi", [])[i]
                aqi = int(aqi_val) if aqi_val is not None else 50
                pm25 = aq_hourly.get("pm2_5", [])[i]
                pm10 = aq_hourly.get("pm10", [])[i]
                
                co_ug = aq_hourly.get("carbon_monoxide", [])[i]
                no2_ug = aq_hourly.get("nitrogen_dioxide", [])[i]
                so2_ug = aq_hourly.get("sulphur_dioxide", [])[i]
                
                co = co_ug * 0.000873 if co_ug is not None else 0.0
                no2 = no2_ug / 1.88 if no2_ug is not None else 0.0
                so2 = so2_ug / 2.62 if so2_ug is not None else 0.0
                
                temp = w_hourly.get("temperature_2m", [])[i]
                humi = w_hourly.get("relative_humidity_2m", [])[i]
                wind = w_hourly.get("wind_speed_10m", [])[i]
                
                records.append({
                    "city": city,
                    "timestamp": dt.strftime("%Y-%m-%d %H:%M:%S"),
                    "aqi": aqi,
                    "pm25": pm25 if pm25 is not None else 0.0,
                    "pm10": pm10 if pm10 is not None else 0.0,
                    "no2": round(no2, 1),
                    "so2": round(so2, 1),
                    "co": round(co, 2),
                    "temperature": round(temp, 1) if temp is not None else 25.0,
                    "humidity": round(humi, 1) if humi is not None else 60.0,
                    "wind_speed": round(wind, 1) if wind is not None else 10.0,
                })
            
            return records
        except Exception as e:
            print(f"Error fetching historical from Open-Meteo for {city}: {e}")
        return None

    # --- WAQI API Client ---
    @staticmethod
    def _fetch_waqi_current(city):
        try:
            path = AQICN_URL_MAP.get(city, city)
            url = f"https://api.waqi.info/feed/{path}/?token={Config.WAQI_API_TOKEN}"
            response = requests.get(url, timeout=5)
            data = response.json()
            if data.get("status") == "ok" and "data" in data:
                payload = data["data"]
                
                # Check for stale data (older than 24 hours)
                time_payload = payload.get("time", {})
                stime = time_payload.get("s")
                if stime:
                    try:
                        report_dt = datetime.strptime(stime, "%Y-%m-%d %H:%M:%S")
                        tz_name = get_city_timezone(city)
                        local_now = datetime.now(ZoneInfo(tz_name)).replace(tzinfo=None)
                        if local_now - report_dt > timedelta(hours=24):
                            print(f"WAQI data for {city} is stale (reported at {stime}). Falling back.")
                            return None
                    except Exception as e:
                        print(f"Error parsing WAQI time: {e}")
                        
                aqi = payload.get("aqi", 50)
                iaqi = payload.get("iaqi", {})
                
                # Fetch pollutant values
                pm25 = iaqi.get("pm25", {}).get("v", aqi * 0.75)
                pm10 = iaqi.get("pm10", {}).get("v", aqi * 1.2)
                no2 = iaqi.get("no2", {}).get("v", aqi * 0.4)
                so2 = iaqi.get("so2", {}).get("v", aqi * 0.15)
                co = iaqi.get("co", {}).get("v", aqi * 0.01)
                
                # Fetch weather
                temp = iaqi.get("t", {}).get("v")
                humi = iaqi.get("h", {}).get("v")
                wind = iaqi.get("w", {}).get("v")
                
                # If weather values are missing from WAQI, fetch from Open-Meteo
                if temp is None or humi is None or wind is None:
                    om_w = AQIService._fetch_openmeteo_current(city)
                    if om_w:
                        if temp is None: temp = om_w["temperature"]
                        if humi is None: humi = om_w["humidity"]
                        if wind is None: wind = om_w["wind_speed"]
                        
                # Fallback if both fail
                if temp is None: temp = 25.0
                if humi is None: humi = 60.0
                if wind is None: wind = 10.0
                
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

                # If weather values are missing, fetch from Open-Meteo
                om_w = AQIService._fetch_openmeteo_current(city)
                if om_w:
                    temp = om_w["temperature"]
                    humi = om_w["humidity"]
                    wind = om_w["wind_speed"]
                else:
                    temp = 25.0
                    humi = 60.0
                    wind = 10.0
                
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
        tz_name = get_city_timezone(city)
        now = datetime.now(ZoneInfo(tz_name))
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
        tz_name = get_city_timezone(city)
        end_time = datetime.now(ZoneInfo(tz_name))
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
        tz_name = get_city_timezone(city)
        local_now = datetime.now(ZoneInfo(tz_name))

        return {
            "city": city,
            "aqi": min(500, int(aqi)),
            "raw_aqi": int(aqi),
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
            "timestamp": local_now.strftime("%Y-%m-%d %H:%M:%S")
        }

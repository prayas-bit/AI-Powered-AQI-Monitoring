import sys
import os
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

# Add backend directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from services.aqi_service import AQIService, get_city_timezone
from ml.predict import predict_future_aqi

def verify_city(city):
    print(f"\n=================== Verifying city: {city} ===================")
    tz_name = get_city_timezone(city)
    print(f"Timezone: {tz_name}")
    
    # 1. Current AQI
    curr = AQIService.get_current_aqi(city)
    print(f"Current AQI Timestamp: {curr['timestamp']}")
    local_now = datetime.now(ZoneInfo(tz_name))
    print(f"Actual City Local Time: {local_now.strftime('%Y-%m-%d %H:%M:%S')}")
    
    curr_dt = datetime.strptime(curr['timestamp'], "%Y-%m-%d %H:%M:%S")
    diff = abs((local_now - curr_dt.replace(tzinfo=ZoneInfo(tz_name))).total_seconds())
    
    # Tolerable difference is 60 seconds (due to execution/network time)
    if diff <= 60:
        print("[OK] Current AQI timestamp matches city local time.")
    else:
        print(f"[FAIL] Current AQI timestamp mismatch! Diff: {diff}s")
        
    # 2. Historical Data
    hist = AQIService.get_historical_data(city, days=1)
    print(f"Historical Records: {len(hist)}")
    if hist:
        last_rec = hist[-1]
        print(f"Last Historical Record Timestamp: {last_rec['timestamp']}")
        last_dt = datetime.strptime(last_rec['timestamp'], "%Y-%m-%d %H:%M:%S").replace(tzinfo=ZoneInfo(tz_name))
        
        if last_dt <= local_now:
            print("[OK] Last historical record is in the past or current hour (no forecast leak!).")
        else:
            print("[FAIL] Last historical record is in the future! Forecast leak detected.")
            
    # 3. Prediction alignment
    pred = predict_future_aqi(city)
    print("Prediction outputs:")
    print(f"  Next Hour AQI: {pred['next_hour']}")
    print(f"  Tomorrow AQI: {pred['tomorrow']}")
    print(f"  First Weekly Forecast Date: {pred['weekly_trend'][0]['date']}")
    
    # Verify first weekly trend date is tomorrow or today
    first_trend_date = datetime.strptime(pred['weekly_trend'][0]['date'], "%Y-%m-%d").date()
    today_date = local_now.date()
    tomorrow_date = (local_now + timedelta(days=1)).date()
    
    if first_trend_date in (today_date, tomorrow_date):
        print("[OK] Weekly trend date alignment is correct.")
    else:
        print(f"[FAIL] Weekly trend date alignment is incorrect! First date: {first_trend_date}, local today: {today_date}")

if __name__ == "__main__":
    verify_city("Bengaluru - Silk Board")
    verify_city("New York - Central Park Baseline")
    verify_city("London - Westminster Roadside")

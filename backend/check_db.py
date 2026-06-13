from models.db import db
import json

city = "Bengaluru - Silk Board"
cursor = db.aqi_data.find({"city": {"$regex": f"^{city}$", "$options": "i"}}, sort=[("timestamp", 1)])
hist_data = list(cursor)
print(f"Total historical database records for {city}: {len(hist_data)}")
if hist_data:
    print("First 3 records:")
    print(json.dumps(hist_data[:3], indent=2))
    print("Last 3 records:")
    print(json.dumps(hist_data[-3:], indent=2))

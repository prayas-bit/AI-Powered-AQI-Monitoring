import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from services.aqi_service import AQIService

print("Fetching current AQI for Peenya...")
res = AQIService.get_current_aqi("Bengaluru - Peenya Industrial Area")
print("Peenya Result:")
import json
print(json.dumps(res, indent=2))

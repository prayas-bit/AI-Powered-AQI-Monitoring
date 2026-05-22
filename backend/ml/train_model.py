import os
import pickle
try:
    import pandas as pd
    import numpy as np
    from sklearn.linear_model import LinearRegression
    HAS_ML_LIBRARIES = True
except ImportError:
    HAS_ML_LIBRARIES = False
from services.aqi_service import AQIService

from config import Config

if Config.IS_VERCEL:
    MODEL_DIR = "/tmp"
else:
    MODEL_DIR = os.path.dirname(os.path.abspath(__file__))

def prepare_features(df):
    """
    Given a DataFrame with columns: timestamp, aqi, temperature, humidity, wind_speed
    Generates lag and time features.
    """
    df = df.copy()
    
    # Parse timestamps
    df['dt'] = pd.to_datetime(df['timestamp'])
    df['hour'] = df['dt'].dt.hour
    df['day_of_week'] = df['dt'].dt.dayofweek
    
    # Sort just in case
    df = df.sort_values('dt').reset_index(drop=True)
    
    # Lags
    df['lag_1'] = df['aqi'].shift(1)
    df['lag_2'] = df['aqi'].shift(2)
    df['lag_24'] = df['aqi'].shift(24)
    
    # Drop rows with NaN due to shift
    df_clean = df.dropna(subset=['lag_1', 'lag_2', 'lag_24']).reset_index(drop=True)
    return df_clean

def train_city_model(city):
    """
    Fetches historical data, trains a Linear Regression model for the city,
    and saves the model checkpoint to disk.
    """
    if not HAS_ML_LIBRARIES:
        print(f"ML libraries not available. Skipping model training for {city}")
        return None
        
    # Fetch 14 days of hourly data for a robust training set (336 data points)
    hist_data = AQIService.get_historical_data(city, days=14)
    
    df = pd.DataFrame(hist_data)
    if len(df) < 50:
        print(f"Not enough data to train model for {city}")
        return None
        
    df_features = prepare_features(df)
    
    # Features and Target
    feature_cols = ['hour', 'day_of_week', 'lag_1', 'lag_2', 'lag_24', 'temperature', 'humidity', 'wind_speed']
    X = df_features[feature_cols]
    y = df_features['aqi']
    
    model = LinearRegression()
    model.fit(X, y)
    
    # Check model performance metrics
    r2 = model.score(X, y)
    print(f"Model trained for {city}. R2 score: {r2:.4f}")
    
    # Save the model
    model_path = os.path.join(MODEL_DIR, f"aqi_model_{city.lower().replace(' ', '_')}.pkl")
    with open(model_path, "wb") as f:
        pickle.dump({
            "model": model,
            "feature_cols": feature_cols,
            "r2_score": r2,
            "last_trained": pd.Timestamp.now().strftime("%Y-%m-%d %H:%M:%S")
        }, f)
        
    return model_path

import axios from 'axios';

// ─────────────────────────────────────────────────────────────
// Dynamic API base URL:
//   • Development (npm run dev):  http://127.0.0.1:5000/api
//   • Production  (Vercel):       /_/backend/api  (relative, same-origin)
// ─────────────────────────────────────────────────────────────
const API_BASE_URL = import.meta.env.DEV
  ? 'http://127.0.0.1:5000/api'
  : '/_/backend/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30s timeout — serverless cold starts can be slow
});

// Simple error logging interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error?.config?.url || 'unknown';
    const status = error?.response?.status || 'network error';
    console.error(`[API] ${error.config?.method?.toUpperCase()} ${url} → ${status}`);
    return Promise.reject(error);
  }
);

export const aqiService = {
  getCurrentAqi: async (city) => {
    const response = await api.get('/current-aqi', { params: { city } });
    return response.data;
  },
  
  getHistoricalData: async (city, days = 7) => {
    const response = await api.get('/historical-data', { params: { city, days } });
    return response.data;
  },
  
  compareLocations: async (citiesList) => {
    const citiesStr = citiesList.join(',');
    const response = await api.get('/compare-locations', { params: { cities: citiesStr } });
    return response.data;
  },
  
  getCorrelation: async (city) => {
    const response = await api.get('/aqi-correlation', { params: { city } });
    return response.data;
  },
  
  getMapStations: async () => {
    const response = await api.get('/stations-map');
    return response.data;
  }
};

export const predictionService = {
  getPrediction: async (city) => {
    const response = await api.get('/predict-aqi', { params: { city } });
    return response.data;
  }
};

export const reportService = {
  downloadPdfReport: (city) => {
    // Uses same dynamic base URL — works on both localhost and Vercel
    return `${API_BASE_URL}/download-pdf?city=${encodeURIComponent(city)}`;
  }
};

export const CITY_STATIONS = {
  "Bengaluru": [
    "Bengaluru - Silk Board",
    "Bengaluru - Peenya Industrial Area",
    "Bengaluru - City Railway Station",
    "Bengaluru - Whitefield IT Hub",
    "Bengaluru - Hebbal Outer Ring Road"
  ],
  "New Delhi": [
    "New Delhi - ITO",
    "New Delhi - Anand Vihar",
    "New Delhi - Dwarka Sector 8",
    "New Delhi - RK Puram",
    "New Delhi - Connaught Place"
  ],
  "Mumbai": [
    "Mumbai - Bandra Kurla Complex",
    "Mumbai - Chembur",
    "Mumbai - Colaba Clean Air",
    "Mumbai - Andheri East"
  ],
  "New York": [
    "New York - Bronx Traffic Corridor",
    "New York - Central Park Baseline",
    "New York - Queens Industrial"
  ],
  "London": [
    "London - Westminster Roadside",
    "London - Greenwich Environment",
    "London - City of London Center"
  ],
  "Tokyo": [
    "Tokyo - Shinjuku Highway Station",
    "Tokyo - Shibuya Center",
    "Tokyo - Koto Industrial Outer"
  ],
  "Sydney": [
    "Sydney - CBD Macquarie Street",
    "Sydney - Parramatta Transit"
  ]
};

export default api;

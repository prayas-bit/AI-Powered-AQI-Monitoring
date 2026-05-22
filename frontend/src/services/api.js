import axios from 'axios';

// Set up base API url pointing to local Flask server
const API_BASE_URL = 'http://127.0.0.1:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle session expiration (expired tokens)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear token and user context
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Optional: redirect to login
      if (!window.location.pathname.includes('/login') && window.location.pathname !== '/') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const authService = {
  login: async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
  },
  
  register: async (name, email, password, role = 'user') => {
    const response = await api.post('/auth/register', { name, email, password, role });
    return response.data;
  },
  
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },
  
  getProfile: async () => {
    const response = await api.get('/auth/profile');
    return response.data;
  },
  
  getCurrentUser: () => {
    const userStr = localStorage.getItem('user');
    try {
      return userStr ? JSON.parse(userStr) : null;
    } catch {
      return null;
    }
  }
};

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
    // Returns the full direct link for browser anchor triggers
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

import { API_URL } from './constants';

// Generic API client
const apiClient = {
  async get(endpoint, token) {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    return response.json();
  },

  async post(endpoint, data, token) {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });
    return response.json();
  }
};

// Authentication API
export const authAPI = {
  async login(token) {
    return apiClient.post('/api/auth/login', {}, token);
  }
};

// Session API
export const sessionAPI = {
  async start(token, startLocation) {
    return apiClient.post('/api/session/start', { startLocation }, token);
  },

  async stop(token, sessionId) {
    return apiClient.post('/api/session/stop', { sessionId }, token);
  },

  async getSessions(token, limit = 20) {
    return apiClient.get(`/api/sessions?limit=${limit}`, token);
  },

  async getSessionDetails(token, sessionId) {
    return apiClient.get(`/api/sessions/${sessionId}`, token);
  }
};

// Data API
export const dataAPI = {
  async sync(token, sessionId, sensorData) {
    return apiClient.post('/api/data', { sessionId, sensorData }, token);
  }
};

// Air Quality API
export const airQualityAPI = {
  async getCurrent(token, lat, lng) {
    return apiClient.get(`/api/air-quality/current?lat=${lat}&lng=${lng}`, token);
  },

  async getRecommendations(token, lat, lng, activity) {
    return apiClient.get(`/api/recommendations?lat=${lat}&lng=${lng}&activity=${activity}`, token);
  }
};

// Dublin Bikes API
export const dublinBikesAPI = {
  async getStations(token, limit = 200) {
    return apiClient.get(`/api/firestore/dublin-bikes?limit=${limit}`, token);
  }
};

// Luas API
export const luasAPI = {
  async getRealtime(token) {
    return apiClient.get('/api/luas/realtime', token);
  }
};

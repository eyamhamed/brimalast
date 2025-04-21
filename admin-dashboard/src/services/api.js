// src/services/api.js
import axios from 'axios';

// Use the full API URL instead of just /admin
const API_BASE_URL = process.env.REACT_APP_API_FULL_URL || 'http://localhost:5000/api';
const ADMIN_SECRET_KEY = process.env.REACT_APP_ADMIN_SECRET_KEY || 'brimasouksecret2025';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Request interceptor for adding token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('adminToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Add secret key for admin routes
    if (config.url.includes('/admin/auth/login')) {
      config.data = {
        ...config.data,
        secretKey: ADMIN_SECRET_KEY
      };
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Update the API methods to use the correct paths
export const authAPI = {
  login: (credentials) => {
    return api.post('/admin/auth/login', credentials);
  },
};

export const dashboardAPI = {
  getStats: () => api.get('/admin/dashboard'),
  getEnhancedStats: () => api.get('/admin/dashboard/enhanced'),
};

export const artisansAPI = {
  getPending: () => api.get('/admin/artisans/pending'),
  approve: (id) => api.put(`/admin/artisans/${id}/approve`),
  reject: (id, reason) => api.put(`/admin/artisans/${id}/reject`, { reason }),
};

export const productsAPI = {
  getPending: () => api.get('/admin/products/pending'),
  approve: (id) => api.put(`/admin/products/${id}/approve`),
  reject: (id, reason) => api.put(`/admin/products/${id}/reject`, { reason }),
};

export const collaboratorsAPI = {
  getPending: () => api.get('/admin/collaborators/pending'),
  approve: (id) => api.put(`/admin/collaborators/${id}/approve`),
  reject: (id, reason) => api.put(`/admin/collaborators/${id}/reject`, { reason }),
};

export const eventsAPI = {
  getPending: () => api.get('/admin/events/pending'),
  approve: (id) => api.put(`/admin/events/${id}/approve`),
  reject: (id, reason) => api.put(`/admin/events/${id}/reject`, { reason }),
};

export default api;
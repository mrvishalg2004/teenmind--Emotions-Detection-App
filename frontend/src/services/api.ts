import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// ─── URL Configuration ──────────────────────────────────────────────────────
const PRODUCTION_URL = 'https://your-teenmind-api.onrender.com/api';

// Your Mac's LAN IP – update this if you change WiFi networks
const DEV_MACHINE_IP = '192.168.1.7';

const getLocalIPAddress = (): string => {
  if (Platform.OS === 'web') {
    return 'http://localhost:3001/api';
  }
  try {
    const hostUri = Constants.expoConfig?.hostUri;
    if (hostUri) {
      const ip = hostUri.split(':')[0];
      if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
        return `http://${ip}:3001/api`;
      }
    }
  } catch {
    console.log('Could not resolve dynamic IP, using fallback');
  }
  // Fallback: use the hardcoded dev machine IP so physical devices can connect
  return `http://${DEV_MACHINE_IP}:3001/api`;
};

const API_BASE_URL = __DEV__ ? getLocalIPAddress() : PRODUCTION_URL;

console.log('──────────────────────────────────');
console.log('TeenMind API Service Initialized');
console.log(`Mode: ${__DEV__ ? 'DEVELOPMENT' : 'PRODUCTION'}`);
console.log(`Base URL: ${API_BASE_URL}`);
console.log('──────────────────────────────────');

// ─── Token Storage ──────────────────────────────────────────────────────────
const TOKEN_KEY = 'teenmind_auth_token';
const REFRESH_TOKEN_KEY = 'teenmind_refresh_token';

export const TokenStorage = {
  async getToken(): Promise<string | null> {
    try {
      if (Platform.OS === 'web') {
        return localStorage.getItem(TOKEN_KEY);
      }
      return await SecureStore.getItemAsync(TOKEN_KEY);
    } catch {
      return null;
    }
  },

  async setToken(token: string): Promise<void> {
    if (Platform.OS === 'web') {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      await SecureStore.setItemAsync(TOKEN_KEY, token);
    }
  },

  async removeToken(): Promise<void> {
    if (Platform.OS === 'web') {
      localStorage.removeItem(TOKEN_KEY);
    } else {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    }
  },

  async getRefreshToken(): Promise<string | null> {
    try {
      if (Platform.OS === 'web') {
        return localStorage.getItem(REFRESH_TOKEN_KEY);
      }
      return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    } catch {
      return null;
    }
  },

  async setRefreshToken(token: string): Promise<void> {
    if (Platform.OS === 'web') {
      localStorage.setItem(REFRESH_TOKEN_KEY, token);
    } else {
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
    }
  },

  async removeRefreshToken(): Promise<void> {
    if (Platform.OS === 'web') {
      localStorage.removeItem(REFRESH_TOKEN_KEY);
    } else {
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    }
  },

  async clearAll(): Promise<void> {
    await Promise.all([
      this.removeToken(),
      this.removeRefreshToken()
    ]);
  }
};

// ─── Axios Instance ──────────────────────────────────────────────────────────
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ─── Request Interceptor ─────────────────────────────────────────────────────
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await TokenStorage.getToken();
      if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
        // Also support legacy x-auth-token
        config.headers['x-auth-token'] = token;
      }
    } catch (error) {
      console.error('Token attachment failed:', error);
    }
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// ─── Response Interceptor ────────────────────────────────────────────────────
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach(promise => {
    if (error) {
      promise.reject(error);
    } else {
      promise.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

    // Handle 401 Unauthorized errors
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Queue concurrent requests while refreshing
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers['Authorization'] = `Bearer ${token}`;
            }
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = await TokenStorage.getRefreshToken();

        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        // Attempt token refresh
        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refreshToken
        });

        if (response.data.success) {
          const { token: newToken } = response.data.data;
          await TokenStorage.setToken(newToken);

          // Update the failed request with new token
          if (originalRequest.headers) {
            originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
          }

          processQueue(null, newToken);
          return api(originalRequest);
        }

        throw new Error('Token refresh failed');
      } catch {
        processQueue(error, null);
        // Clear all tokens and redirect to login
        await TokenStorage.clearAll();
        return Promise.reject(error);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
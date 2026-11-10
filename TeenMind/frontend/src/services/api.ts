import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
import { StorageService } from './storage.service';

// Create axios instance with base configuration
const API_BASE_URL = 'http://localhost:8000/api';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor - Add auth token
    this.client.interceptors.request.use(
      async (config) => {
        const token = await StorageService.getToken();
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        // Log requests in development
        if (process.env.NODE_ENV === 'development') {
          console.log(`🌐 API Request: ${config.method?.toUpperCase()} ${config.url}`);
        }

        return config;
      },
      (error) => {
        console.error('Request interceptor error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor - Handle common errors
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        // Log successful responses in development
        if (process.env.NODE_ENV === 'development') {
          console.log(`✅ API Response: ${response.config.method?.toUpperCase()} ${response.config.url} - ${response.status}`);
        }
        return response;
      },
      async (error: AxiosError) => {
        // Log errors in development
        if (process.env.NODE_ENV === 'development') {
          console.error(`❌ API Error: ${error.config?.method?.toUpperCase()} ${error.config?.url} - ${error.response?.status}`);
        }

        // Handle 401 Unauthorized - Auto logout
        if (error.response?.status === 401) {
          await this.handleUnauthorized();
        }

        // Transform error for consistent handling
        const transformedError = this.transformError(error);
        return Promise.reject(transformedError);
      }
    );
  }

  private async handleUnauthorized() {
    console.log('🔒 Unauthorized access detected, clearing credentials');
    await StorageService.clearAll();
    // Note: Navigation to login screen will be handled by AuthContext
  }

  private transformError(error: AxiosError): ApiError {
    if (error.response) {
      // Server responded with error status
      const { data, status } = error.response;
      return {
        success: false,
        message: (data as any)?.message || `Request failed with status ${status}`,
        errors: (data as any)?.errors || [],
        status
      };
    } else if (error.request) {
      // Network error
      return {
        success: false,
        message: 'Network error. Please check your internet connection.',
        status: 0
      };
    } else {
      // Request configuration error
      return {
        success: false,
        message: 'Request configuration error',
        status: 0
      };
    }
  }

  // HTTP Methods
  async get<T>(url: string, params?: any): Promise<T> {
    const response = await this.client.get(url, { params });
    return response.data;
  }

  async post<T>(url: string, data?: any): Promise<T> {
    const response = await this.client.post(url, data);
    return response.data;
  }

  async put<T>(url: string, data?: any): Promise<T> {
    const response = await this.client.put(url, data);
    return response.data;
  }

  async patch<T>(url: string, data?: any): Promise<T> {
    const response = await this.client.patch(url, data);
    return response.data;
  }

  async delete<T>(url: string): Promise<T> {
    const response = await this.client.delete(url);
    return response.data;
  }

  // Update base URL (useful for switching environments)
  updateBaseURL(newBaseURL: string) {
    this.client.defaults.baseURL = newBaseURL;
  }

  // Get current base URL
  getBaseURL(): string {
    return this.client.defaults.baseURL || API_BASE_URL;
  }
}

// Error interface for better type safety
interface ApiError {
  success: false;
  message: string;
  errors?: Array<{
    field: string;
    message: string;
    value?: any;
  }>;
  status?: number;
}

// Create singleton instance
export const apiClient = new ApiClient();

// Export types
export type { ApiError };
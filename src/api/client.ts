// =============================================================================
// API CLIENT - Axios Setup with Token Handling
// =============================================================================

import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';

// API Base URL - Your backend server
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Token storage key
const TOKEN_KEY = 'bulkflow_token';

// -----------------------------------------------------------------------------
// CREATE AXIOS INSTANCE
// -----------------------------------------------------------------------------

const apiClient: AxiosInstance = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// -----------------------------------------------------------------------------
// TOKEN MANAGEMENT
// -----------------------------------------------------------------------------

export const getToken = (): string | null => {
    return localStorage.getItem(TOKEN_KEY);
};

export const setToken = (token: string): void => {
    localStorage.setItem(TOKEN_KEY, token);
};

export const removeToken = (): void => {
    localStorage.removeItem(TOKEN_KEY);
};

export const isAuthenticated = (): boolean => {
    return !!getToken();
};

// -----------------------------------------------------------------------------
// REQUEST INTERCEPTOR - Add Token to Requests
// -----------------------------------------------------------------------------

apiClient.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        const token = getToken();
        if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// -----------------------------------------------------------------------------
// RESPONSE INTERCEPTOR - Handle Errors
// -----------------------------------------------------------------------------

apiClient.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
        // Handle 401 Unauthorized - Redirect to login
        if (error.response?.status === 401) {
            removeToken();
            window.location.href = '/login';
        }

        // Extract error message
        const errorMessage =
            (error.response?.data as any)?.error ||
            (error.response?.data as any)?.message ||
            error.message ||
            'Something went wrong';

        return Promise.reject(new Error(errorMessage));
    }
);

export default apiClient;
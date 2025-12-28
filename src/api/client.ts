// =============================================================================
// API CLIENT - Axios Setup with Token Handling (FIXED)
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
// HELPER: Extract error message from various response formats
// -----------------------------------------------------------------------------

const extractErrorMessage = (data: any): string | null => {
    if (!data) return null;

    // If data is a string, return it directly
    if (typeof data === 'string') {
        return data;
    }

    // If data is an object, try various common error formats
    if (typeof data === 'object') {
        // Format: { error: "message" }
        if (typeof data.error === 'string') {
            return data.error;
        }

        // Format: { message: "message" }
        if (typeof data.message === 'string') {
            return data.message;
        }

        // Format: { error: { message: "message" } }
        if (data.error && typeof data.error.message === 'string') {
            return data.error.message;
        }

        // Format: { errors: ["message1", "message2"] }
        if (Array.isArray(data.errors) && data.errors.length > 0) {
            return data.errors.join(', ');
        }

        // Format: { error: { errors: ["message"] } }
        if (data.error && Array.isArray(data.error.errors)) {
            return data.error.errors.join(', ');
        }

        // Format: { statusMessage: "message" }
        if (typeof data.statusMessage === 'string') {
            return data.statusMessage;
        }

        // Format: { msg: "message" }
        if (typeof data.msg === 'string') {
            return data.msg;
        }

        // Format: { detail: "message" } (common in FastAPI)
        if (typeof data.detail === 'string') {
            return data.detail;
        }

        // Format: { reason: "message" }
        if (typeof data.reason === 'string') {
            return data.reason;
        }

        // Last resort: stringify the object (but make it readable)
        try {
            const stringified = JSON.stringify(data);
            // Only use stringified if it's not too long
            if (stringified.length < 200) {
                return `Server error: ${stringified}`;
            }
        } catch (e) {
            // Ignore stringify errors
        }
    }

    return null;
};

// -----------------------------------------------------------------------------
// RESPONSE INTERCEPTOR - Handle Errors
// -----------------------------------------------------------------------------

apiClient.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
        // Debug logging - ALWAYS log the full error for debugging
        console.error('=== API ERROR DEBUG ===');
        console.error('Status:', error.response?.status);
        console.error('Status Text:', error.response?.statusText);
        console.error('Response Data:', error.response?.data);
        console.error('Response Data Type:', typeof error.response?.data);
        console.error('Full Error:', error);
        console.error('=======================');

        // Handle 401 Unauthorized - Redirect to login
        if (error.response?.status === 401) {
            removeToken();
            window.location.href = '/login';
        }

        // Extract error message using helper function
        let errorMessage = extractErrorMessage(error.response?.data);

        // Fallback to axios error message if no message extracted
        if (!errorMessage) {
            if (error.response?.status === 400) {
                errorMessage = 'Bad Request - Please check your input data';
            } else if (error.response?.status === 404) {
                errorMessage = 'Resource not found';
            } else if (error.response?.status === 500) {
                errorMessage = 'Server error - Please try again later';
            } else if (error.message && !error.message.includes('[object Object]')) {
                errorMessage = error.message;
            } else {
                errorMessage = 'Something went wrong';
            }
        }

        console.error('Final Error Message:', errorMessage);

        return Promise.reject(new Error(errorMessage));
    }
);

export default apiClient;
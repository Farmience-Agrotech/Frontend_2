// =============================================================================
// AUTH / USERS API SERVICE
// =============================================================================

import apiClient, { setToken, removeToken } from './client';
import {
    User,
    LoginRequest,
    LoginResponse,
    RegisterRequest,
    UsersListResponse,
} from '@/types/api.types';

// -----------------------------------------------------------------------------
// LOGIN
// -----------------------------------------------------------------------------

export const login = async (credentials: LoginRequest): Promise<LoginResponse> => {
    const response = await apiClient.post<LoginResponse>('/users/login', credentials);

    // Store token on successful login
    if (response.data.token) {
        setToken(response.data.token);
    }

    return response.data;
};

// -----------------------------------------------------------------------------
// REGISTER
// -----------------------------------------------------------------------------

export const register = async (data: RegisterRequest): Promise<User> => {
    const response = await apiClient.post<User>('/users/register', data);
    return response.data;
};

// -----------------------------------------------------------------------------
// LOGOUT
// -----------------------------------------------------------------------------

export const logout = (): void => {
    removeToken();
};

// -----------------------------------------------------------------------------
// LIST USERS
// -----------------------------------------------------------------------------

export const listUsers = async (): Promise<User[]> => {
    const response = await apiClient.get<UsersListResponse>('/users/list');
    return response.data.users;
};

// -----------------------------------------------------------------------------
// EXPORT ALL
// -----------------------------------------------------------------------------

const authApi = {
    login,
    register,
    logout,
    listUsers,
};

export default authApi;
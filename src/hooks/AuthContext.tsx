// =============================================================================
// AUTH CONTEXT - Login State Management
// =============================================================================

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { setToken, removeToken, getToken } from '@/api/client';
import authApi from '@/api/auth.api';
import { LoginRequest, RegisterRequest } from '@/types/api.types';
import { useToast } from '@/hooks/use-toast';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

interface AuthState {
    isLoggedIn: boolean;
    role: string | null;
    token: string | null;
}

interface AuthContextType extends AuthState {
    login: (credentials: LoginRequest) => Promise<void>;
    register: (data: RegisterRequest) => Promise<void>;
    logout: () => void;
    isLoading: boolean;
}

// -----------------------------------------------------------------------------
// CONTEXT
// -----------------------------------------------------------------------------

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// -----------------------------------------------------------------------------
// PROVIDER
// -----------------------------------------------------------------------------

interface AuthProviderProps {
    children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
    const [authState, setAuthState] = useState<AuthState>({
        isLoggedIn: false,
        role: null,
        token: null,
    });
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();
    const location = useLocation();
    const { toast } = useToast();

    // Check if user is already logged in on mount
    useEffect(() => {
        const checkAuth = () => {
            const token = getToken();
            if (token) {
                setAuthState({
                    isLoggedIn: true,
                    token: token,
                    role: null, // Role could be decoded from JWT if needed
                });
            }
            setIsLoading(false);
        };

        checkAuth();
    }, []);

    // Login function
    const login = async (credentials: LoginRequest): Promise<void> => {
        setIsLoading(true);
        try {
            const response = await authApi.login(credentials);

            setAuthState({
                isLoggedIn: true,
                token: response.token,
                role: response.role,
            });

            toast({
                title: 'Login Successful',
                description: `Welcome! You are logged in as ${response.role}`,
            });

            // Redirect to the page they tried to visit or dashboard
            const from = (location.state as any)?.from?.pathname || '/dashboard';
            navigate(from, { replace: true });
        } catch (error) {
            toast({
                title: 'Login Failed',
                description: error instanceof Error ? error.message : 'Invalid credentials',
                variant: 'destructive',
            });
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    // Register function
    const register = async (data: RegisterRequest): Promise<void> => {
        setIsLoading(true);
        try {
            await authApi.register(data);

            toast({
                title: 'Registration Successful',
                description: 'You can now login with your credentials',
            });

            navigate('/login');
        } catch (error) {
            toast({
                title: 'Registration Failed',
                description: error instanceof Error ? error.message : 'Could not create account',
                variant: 'destructive',
            });
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    // Logout function
    const logout = (): void => {
        authApi.logout();
        setAuthState({
            isLoggedIn: false,
            token: null,
            role: null,
        });
        toast({
            title: 'Logged Out',
            description: 'You have been logged out successfully',
        });
        navigate('/login');
    };

    const value: AuthContextType = {
        ...authState,
        login,
        register,
        logout,
        isLoading,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// -----------------------------------------------------------------------------
// HOOK
// -----------------------------------------------------------------------------

export function useAuth(): AuthContextType {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

export default AuthContext;
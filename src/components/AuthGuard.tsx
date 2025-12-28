// =============================================================================
// AUTH GUARD - Authentication-based Route Protection
// =============================================================================
// This component checks if the user is logged in before rendering children.
// It redirects to /login if not authenticated.
// Different from ProtectedRoute which checks module permissions.
// =============================================================================

import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/AuthContext';
import { Loader2 } from 'lucide-react';

interface AuthGuardProps {
    children: ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
    const { isLoggedIn, isLoading } = useAuth();
    const location = useLocation();

    // Show loading spinner while checking auth state
    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-background">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Loading...</p>
                </div>
            </div>
        );
    }

    // Redirect to login if not authenticated
    if (!isLoggedIn) {
        // Save the attempted URL for redirecting after login
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // User is authenticated, render the children
    return <>{children}</>;
}

export default AuthGuard;
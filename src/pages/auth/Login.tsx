// =============================================================================
// LOGIN PAGE
// =============================================================================

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, EyeOff, Loader2, Package } from 'lucide-react';

const Login = () => {
    const { login, isLoading, isLoggedIn } = useAuth();
    const navigate = useNavigate();
    const [userName, setUserName] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');

    // Redirect if already logged in
    useEffect(() => {
        if (isLoggedIn) {
            navigate('/dashboard', { replace: true });
        }
    }, [isLoggedIn, navigate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // Basic validation
        if (!userName || !password) {
            setError('Please enter both username and password');
            return;
        }

        try {
            await login({ userName, password });
            // Navigation happens in AuthContext after successful login
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Login failed');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
            <div className="w-full max-w-md">
                {/* Logo/Brand */}
                <div className="flex flex-col items-center mb-8">
                    <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-primary mb-4">
                        <Package className="w-8 h-8 text-primary-foreground" />
                    </div>
                    <h1 className="text-2xl font-bold text-foreground">BulkFlow</h1>
                    <p className="text-muted-foreground">Inventory Management System</p>
                </div>

                {/* Login Card */}
                <Card className="shadow-lg">
                    <CardHeader className="space-y-1">
                        <CardTitle className="text-2xl text-center">Welcome back</CardTitle>
                        <CardDescription className="text-center">
                            Enter your credentials to access your account
                        </CardDescription>
                    </CardHeader>

                    <form onSubmit={handleSubmit}>
                        <CardContent className="space-y-4">
                            {/* Error Message */}
                            {error && (
                                <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded-md">
                                    {error}
                                </div>
                            )}

                            {/* Username Field */}
                            <div className="space-y-2">
                                <Label htmlFor="userName">Username</Label>
                                <Input
                                    id="userName"
                                    type="text"
                                    placeholder="Enter your username"
                                    value={userName}
                                    onChange={(e) => setUserName(e.target.value)}
                                    disabled={isLoading}
                                    autoComplete="username"
                                    autoFocus
                                />
                            </div>

                            {/* Password Field */}
                            <div className="space-y-2">
                                <Label htmlFor="password">Password</Label>
                                <div className="relative">
                                    <Input
                                        id="password"
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder="Enter your password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        disabled={isLoading}
                                        autoComplete="current-password"
                                        className="pr-10"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                        tabIndex={-1}
                                    >
                                        {showPassword ? (
                                            <EyeOff className="h-4 w-4" />
                                        ) : (
                                            <Eye className="h-4 w-4" />
                                        )}
                                    </button>
                                </div>
                            </div>
                        </CardContent>

                        <CardFooter className="flex flex-col gap-4">
                            <Button
                                type="submit"
                                className="w-full"
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Signing in...
                                    </>
                                ) : (
                                    'Sign in'
                                )}
                            </Button>

                            {/* Optional: Forgot password link */}
                            <p className="text-sm text-center text-muted-foreground">
                                Contact your administrator if you need access
                            </p>
                        </CardFooter>
                    </form>
                </Card>

                {/* Footer */}
                <p className="text-center text-sm text-muted-foreground mt-6">
                    © {new Date().getFullYear()} BulkFlow. All rights reserved.
                </p>
            </div>
        </div>
    );
};

export default Login;
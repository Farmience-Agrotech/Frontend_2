import { ReactNode, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUsers } from '@/contexts/UsersContext';
import { toast } from '@/hooks/use-toast';
import { ModuleName } from '@/types/role';

interface ProtectedRouteProps {
  children: ReactNode;
  module: ModuleName | ModuleName[];
  requireAny?: boolean; // If true, requires ANY of the modules, not ALL
}

export function ProtectedRoute({ children, module, requireAny = true }: ProtectedRouteProps) {
  const navigate = useNavigate();
  const { currentUser } = useUsers();
  const hasShownToast = useRef(false);

  // ✅ Memoize modules array to prevent unnecessary recalculations
  const modules = useMemo(
      () => (Array.isArray(module) ? module : [module]),
      [module]
  );

  // ✅ Memoize permission check to avoid recalculating on every render
  const hasPermission = useMemo(() => {
    if (!currentUser?.role?.permissions) return false;

    if (requireAny) {
      return modules.some((mod) => {
        const permission = currentUser.role.permissions[mod];
        return permission && 'view' in permission && permission.view;
      });
    }

    return modules.every((mod) => {
      const permission = currentUser.role.permissions[mod];
      return permission && 'view' in permission && permission.view;
    });
  }, [currentUser?.role?.permissions, modules, requireAny]);

  // ✅ Handle redirect with proper dependencies
  useEffect(() => {
    // Don't redirect if user has permission
    if (hasPermission) return;

    // Don't redirect if no currentUser yet (context still initializing)
    if (!currentUser) return;

    // Only show toast once per mount to avoid spam
    if (!hasShownToast.current) {
      hasShownToast.current = true;
      toast({
        title: 'Access Denied',
        description: "You don't have permission to access this page.",
        variant: 'destructive',
      });
    }

    navigate('/dashboard', { replace: true });
  }, [hasPermission, currentUser, navigate]);

  // Reset toast flag when module changes (user navigates to different protected route)
  useEffect(() => {
    hasShownToast.current = false;
  }, [modules]);

  // ✅ Show nothing if no permission (redirect will happen via useEffect)
  if (!hasPermission) {
    return null;
  }

  return <>{children}</>;
}
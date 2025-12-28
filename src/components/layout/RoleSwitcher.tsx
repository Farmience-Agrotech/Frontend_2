import { useNavigate, useLocation } from 'react-router-dom';
import { useRoles } from '@/contexts/RolesContext';
import { useUsers } from '@/contexts/UsersContext';
import { toast } from '@/hooks/use-toast';
import { ModuleName } from '@/types/role';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertTriangle } from 'lucide-react';

const routeToModule: Record<string, ModuleName> = {
  '/orders': 'orders',
  '/invoices': 'invoices',
  '/inventory': 'inventory',
  '/customers': 'customers',
  '/suppliers': 'suppliers',
  '/settings': 'settings',
};

export function RoleSwitcher() {
  const navigate = useNavigate();
  const location = useLocation();
  const { roles } = useRoles();
  const { currentUser, setCurrentUserRole } = useUsers();

  if (!currentUser) return null;

  const handleRoleChange = (roleId: string) => {
    const newRole = roles.find((r) => r.id === roleId);
    if (!newRole) return;

    setCurrentUserRole(roleId);

    toast({
      title: 'Role Switched',
      description: `Switched to ${newRole.name} role`,
    });

    // Check if current page is accessible with new role
    const currentPath = location.pathname;
    const baseRoute = '/' + currentPath.split('/')[1];
    const module = routeToModule[baseRoute];

    if (module) {
      const permission = newRole.permissions[module];
      const hasAccess = permission && 'view' in permission && permission.view;
      
      // Special case for settings - also check userManagement
      if (baseRoute === '/settings') {
        const settingsAccess = newRole.permissions.settings.view;
        const userMgmtAccess = newRole.permissions.userManagement.view;
        if (!settingsAccess && !userMgmtAccess) {
          navigate('/dashboard', { replace: true });
          return;
        }
      } else if (!hasAccess) {
        navigate('/dashboard', { replace: true });
      }
    }
  };

  return (
    <div className="flex flex-col items-center gap-1 px-2 py-1 border-2 border-dashed border-destructive rounded-lg bg-destructive/5">
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground">Test As:</span>
        <Select
          value={currentUser.role.id}
          onValueChange={handleRoleChange}
        >
          <SelectTrigger className="h-7 w-32 text-xs bg-background">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-popover z-50">
            {roles.map((role) => (
              <SelectItem key={role.id} value={role.id} className="text-xs">
                {role.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-1 text-[10px] text-destructive">
        <AlertTriangle className="h-3 w-3" />
        <span>DEV MODE - Remove before production</span>
      </div>
    </div>
  );
}

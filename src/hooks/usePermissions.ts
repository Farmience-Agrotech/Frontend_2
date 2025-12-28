import { useUsers } from '@/contexts/UsersContext';
import { ModuleName, PermissionType } from '@/types/role';

export function usePermissions() {
  const { currentUser } = useUsers();

  const hasPermission = (module: ModuleName, action: PermissionType): boolean => {
    if (!currentUser?.role?.permissions) return false;
    
    const modulePermissions = currentUser.role.permissions[module];
    if (!modulePermissions) return false;
    
    return (modulePermissions as Record<PermissionType, boolean>)[action] ?? false;
  };

  const canView = (module: ModuleName): boolean => hasPermission(module, 'view');
  const canCreate = (module: ModuleName): boolean => hasPermission(module, 'create');
  const canEdit = (module: ModuleName): boolean => hasPermission(module, 'edit');
  const canDelete = (module: ModuleName): boolean => hasPermission(module, 'delete');

  return {
    hasPermission,
    canView,
    canCreate,
    canEdit,
    canDelete,
    currentUser,
  };
}

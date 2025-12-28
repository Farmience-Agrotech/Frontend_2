import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info } from 'lucide-react';
import { useRoles } from '@/contexts/RolesContext';
import { Role, RolePermissions, MODULE_LABELS, MODULE_PERMISSION_CONFIG, ModuleName, PermissionType } from '@/types/role';
import { useToast } from '@/hooks/use-toast';

const MODULE_DESCRIPTIONS: Partial<Record<ModuleName, string>> = {
  invoices: 'Controls ability to generate and manage invoices within orders',
};

interface AddEditRoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: Role | null;
}

const createEmptyPermissions = (): RolePermissions => ({
  dashboard: { view: false },
  orders: { view: false, create: false, edit: false, delete: false },
  invoices: { view: false, create: false },
  inventory: { view: false, create: false, edit: false, delete: false },
  customers: { view: false, create: false, edit: false, delete: false },
  suppliers: { view: false, create: false, edit: false, delete: false },
  settings: { view: false },
  userManagement: { view: false, create: false, edit: false, delete: false },
});

export function AddEditRoleDialog({ open, onOpenChange, role }: AddEditRoleDialogProps) {
  const { addRole, updateRole, isRoleNameUnique } = useRoles();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [permissions, setPermissions] = useState<RolePermissions>(createEmptyPermissions());
  const [errors, setErrors] = useState<{ name?: string; permissions?: string }>({});

  const isEditing = !!role;

  useEffect(() => {
    if (role) {
      setName(role.name);
      setPermissions(JSON.parse(JSON.stringify(role.permissions)));
    } else {
      setName('');
      setPermissions(createEmptyPermissions());
    }
    setErrors({});
  }, [role, open]);

  const handlePermissionChange = (module: ModuleName, permission: PermissionType, checked: boolean) => {
    setPermissions((prev) => {
      const newPermissions = { ...prev };
      const modulePerms = { ...newPermissions[module] } as Record<PermissionType, boolean>;
      
      modulePerms[permission] = checked;
      
      // If checking create/edit/delete, auto-check view
      if (checked && permission !== 'view') {
        modulePerms.view = true;
      }
      
      (newPermissions[module] as Record<PermissionType, boolean>) = modulePerms;
      return newPermissions;
    });
  };

  const handleSelectAll = (checked: boolean) => {
    const modules = Object.keys(MODULE_PERMISSION_CONFIG) as ModuleName[];
    const newPermissions = { ...permissions };
    
    modules.forEach((module) => {
      const availablePermissions = MODULE_PERMISSION_CONFIG[module];
      const modulePerms = newPermissions[module] as Record<PermissionType, boolean>;
      availablePermissions.forEach((perm) => {
        modulePerms[perm] = checked;
      });
    });
    
    setPermissions(newPermissions);
  };

  const handleSelectRow = (module: ModuleName, checked: boolean) => {
    const availablePermissions = MODULE_PERMISSION_CONFIG[module];
    const newPermissions = { ...permissions };
    const modulePerms = { ...newPermissions[module] } as Record<PermissionType, boolean>;
    
    availablePermissions.forEach((perm) => {
      modulePerms[perm] = checked;
    });
    
    (newPermissions[module] as Record<PermissionType, boolean>) = modulePerms;
    setPermissions(newPermissions);
  };

  const isAllSelected = () => {
    const modules = Object.keys(MODULE_PERMISSION_CONFIG) as ModuleName[];
    return modules.every((module) => {
      const availablePermissions = MODULE_PERMISSION_CONFIG[module];
      const modulePerms = permissions[module] as Record<PermissionType, boolean>;
      return availablePermissions.every((perm) => modulePerms[perm]);
    });
  };

  const isRowAllSelected = (module: ModuleName) => {
    const availablePermissions = MODULE_PERMISSION_CONFIG[module];
    const modulePerms = permissions[module] as Record<PermissionType, boolean>;
    return availablePermissions.every((perm) => modulePerms[perm]);
  };

  const validate = (): boolean => {
    const newErrors: { name?: string; permissions?: string } = {};

    if (!name.trim()) {
      newErrors.name = 'Role name is required';
    } else if (name.trim().length < 2) {
      newErrors.name = 'Role name must be at least 2 characters';
    } else if (!isRoleNameUnique(name.trim(), role?.id)) {
      newErrors.name = 'Role name already exists';
    }

    if (!permissions.dashboard.view) {
      newErrors.permissions = 'Select at least Dashboard view permission';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;

    if (isEditing && role) {
      updateRole(role.id, { name: name.trim(), permissions });
      toast({
        title: 'Role updated',
        description: `${name} role has been updated successfully.`,
      });
    } else {
      addRole({ name: name.trim(), permissions, isLocked: false });
      toast({
        title: 'Role created',
        description: `${name} role has been created successfully.`,
      });
    }

    onOpenChange(false);
  };

  const modules = Object.keys(MODULE_PERMISSION_CONFIG) as ModuleName[];
  const allPermissionTypes: PermissionType[] = ['view', 'create', 'edit', 'delete'];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Role' : 'Add New Role'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Update role name and permissions' : 'Create a new role with specific permissions'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="roleName">Role Name</Label>
            <Input
              id="roleName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter role name"
            />
            {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Permissions</Label>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="selectAll"
                  checked={isAllSelected()}
                  onCheckedChange={(checked) => handleSelectAll(!!checked)}
                />
                <Label htmlFor="selectAll" className="text-sm font-normal cursor-pointer">
                  Select All
                </Label>
              </div>
            </div>

            {errors.permissions && <p className="text-sm text-destructive">{errors.permissions}</p>}

            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left p-3 font-medium">Module</th>
                    {allPermissionTypes.map((perm) => (
                      <th key={perm} className="text-center p-3 font-medium capitalize w-20">
                        {perm}
                      </th>
                    ))}
                    <th className="text-center p-3 font-medium w-24">Select Row</th>
                  </tr>
                </thead>
                <tbody>
                  {modules.map((module) => {
                    const availablePermissions = MODULE_PERMISSION_CONFIG[module];
                    const modulePerms = permissions[module] as Record<PermissionType, boolean>;

                      return (
                      <tr key={module} className="border-t">
                        <td className="p-3 font-medium">
                          <div className="flex items-center gap-2">
                            {MODULE_LABELS[module]}
                            {MODULE_DESCRIPTIONS[module] && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>{MODULE_DESCRIPTIONS[module]}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                        </td>
                        {allPermissionTypes.map((perm) => (
                          <td key={perm} className="text-center p-3">
                            {availablePermissions.includes(perm) ? (
                              <Checkbox
                                checked={modulePerms[perm] ?? false}
                                onCheckedChange={(checked) =>
                                  handlePermissionChange(module, perm, !!checked)
                                }
                              />
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </td>
                        ))}
                        <td className="text-center p-3">
                          <Checkbox
                            checked={isRowAllSelected(module)}
                            onCheckedChange={(checked) => handleSelectRow(module, !!checked)}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>{isEditing ? 'Save Changes' : 'Create Role'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

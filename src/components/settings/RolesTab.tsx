import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Plus, Pencil, Trash2, Lock } from 'lucide-react';
import { useRoles } from '@/contexts/RolesContext';
import { Role } from '@/types/role';
import { format } from 'date-fns';
import { AddEditRoleDialog } from './AddEditRoleDialog';
import { DeleteRoleDialog } from './DeleteRoleDialog';
import { useToast } from '@/hooks/use-toast';

export function RolesTab() {
  const { roles, deleteRole } = useRoles();
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [deletingRole, setDeletingRole] = useState<Role | null>(null);

  const handleDeleteConfirm = () => {
    if (!deletingRole) return;

    if (deletingRole.usersCount > 0) {
      toast({
        title: "Cannot delete role",
        description: `Cannot delete. ${deletingRole.usersCount} users are assigned to this role. Reassign them first.`,
        variant: "destructive",
      });
      setDeletingRole(null);
      return;
    }

    const success = deleteRole(deletingRole.id);
    if (success) {
      toast({
        title: "Role deleted",
        description: `${deletingRole.name} role has been deleted successfully.`,
      });
    }
    setDeletingRole(null);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Roles</CardTitle>
          <CardDescription>Manage user roles and permissions</CardDescription>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Role
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Role Name</TableHead>
              <TableHead>Users Count</TableHead>
              <TableHead>Created Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {roles.map((role) => (
              <TableRow key={role.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    {role.name}
                    {role.isLocked && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Lock className="h-4 w-4 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Admin role cannot be modified</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{role.usersCount}</Badge>
                </TableCell>
                <TableCell>{format(role.createdAt, 'dd MMM yyyy')}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={role.isLocked}
                            onClick={() => setEditingRole(role)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{role.isLocked ? 'Admin role cannot be modified' : 'Edit role'}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    {!role.isLocked && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeletingRole(role)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Delete role</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>

      <AddEditRoleDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        role={null}
      />

      <AddEditRoleDialog
        open={!!editingRole}
        onOpenChange={(open) => !open && setEditingRole(null)}
        role={editingRole}
      />

      <DeleteRoleDialog
        open={!!deletingRole}
        onOpenChange={(open) => !open && setDeletingRole(null)}
        role={deletingRole}
        onConfirm={handleDeleteConfirm}
      />
    </Card>
  );
}

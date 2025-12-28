import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Pencil, Trash2, Power, PowerOff, Lock } from 'lucide-react';
import { useUsers } from '@/contexts/UsersContext';
import { useRoles } from '@/contexts/RolesContext';
import { UserRoleBadge } from './UserRoleBadge';
import { UserStatusBadge } from './UserStatusBadge';
import { User } from '@/types/user';
import { toast } from '@/hooks/use-toast';
import { AddEditUserDialog } from './AddEditUserDialog';
import { DeleteUserDialog } from './DeleteUserDialog';

export function UsersTable() {
  const { users, currentUser, toggleUserStatus } = useUsers();
  const { roles } = useRoles();
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);

  const adminRole = roles.find(r => r.name === 'Admin');
  const adminUsersCount = adminRole 
    ? users.filter(u => u.roleId === adminRole.id && u.status === 'active').length 
    : 0;

  const isCurrentUser = (user: User) => user.id === currentUser?.id;
  const isLastAdmin = (user: User) => adminRole && user.roleId === adminRole.id && adminUsersCount === 1;
  const canShowDeactivate = (user: User) => !isCurrentUser(user) && !isLastAdmin(user);
  const canShowDelete = (user: User) => !isCurrentUser(user) && !isLastAdmin(user);

  const handleToggleStatus = (user: User) => {
    const result = toggleUserStatus(user.id);
    if (!result.success) {
      toast({
        title: 'Error',
        description: result.error,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: `User ${user.status === 'active' ? 'deactivated' : 'activated'} successfully.`,
      });
    }
  };

  return (
    <>
      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Designation</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    {user.name}
                    {isCurrentUser(user) && (
                      <span className="text-xs text-muted-foreground">(You)</span>
                    )}
                    {isLastAdmin(user) && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Lock className="h-3.5 w-3.5 text-orange-500" />
                          </TooltipTrigger>
                          <TooltipContent>Only Admin user</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                </TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{user.phone}</TableCell>
                <TableCell>{user.department}</TableCell>
                <TableCell>{user.designation}</TableCell>
                <TableCell>
                  <UserRoleBadge roleId={user.roleId} />
                </TableCell>
                <TableCell>
                  <UserStatusBadge status={user.status} />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditingUser(user)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Edit user</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    {canShowDeactivate(user) && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleToggleStatus(user)}
                            >
                              {user.status === 'active' ? (
                                <PowerOff className="h-4 w-4 text-orange-500" />
                              ) : (
                                <Power className="h-4 w-4 text-green-500" />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            {user.status === 'active' ? 'Deactivate' : 'Activate'}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}

                    {canShowDelete(user) && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeletingUser(user)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Delete user</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AddEditUserDialog
        open={!!editingUser}
        onOpenChange={(open) => !open && setEditingUser(null)}
        user={editingUser}
      />

      <DeleteUserDialog
        open={!!deletingUser}
        onOpenChange={(open) => !open && setDeletingUser(null)}
        user={deletingUser}
      />
    </>
  );
}

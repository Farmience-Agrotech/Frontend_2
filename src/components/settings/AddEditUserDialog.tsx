import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { User, Department, DEPARTMENTS } from '@/types/user';
import { useUsers } from '@/contexts/UsersContext';
import { useRoles } from '@/contexts/RolesContext';
import { toast } from '@/hooks/use-toast';

interface AddEditUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: User | null;
}

export function AddEditUserDialog({
  open,
  onOpenChange,
  user,
}: AddEditUserDialogProps) {
  const { addUser, updateUser, currentUser, isEmailUnique, getAdminCount } = useUsers();
  const { roles } = useRoles();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState<Department>('Sales');
  const [designation, setDesignation] = useState('');
  const [roleId, setRoleId] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isEditing = !!user;
  const isEditingSelf = user?.id === currentUser?.id;
  const adminRole = roles.find((r) => r.name === 'Admin');
  const isLastAdmin = user?.roleId === adminRole?.id && getAdminCount() <= 1;

  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
      setPhone(user.phone);
      setDepartment(user.department);
      setDesignation(user.designation);
      setRoleId(user.roleId);
      setStatus(user.status);
    } else {
      setName('');
      setEmail('');
      setPhone('');
      setDepartment('Sales');
      setDesignation('');
      setRoleId(roles[0]?.id || '');
      setStatus('active');
    }
    setErrors({});
  }, [user, roles, open]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = 'Full name is required';
    }

    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Invalid email format';
    } else if (!isEmailUnique(email, user?.id)) {
      newErrors.email = 'Email already exists';
    }

    if (!roleId) {
      newErrors.role = 'Role is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;

    if (isEditing && user) {
      // Check if trying to change role of last admin
      if (isLastAdmin && roleId !== adminRole?.id) {
        toast({
          title: 'Error',
          description: 'Cannot change role. This is the only Admin user.',
          variant: 'destructive',
        });
        return;
      }

      const success = updateUser(user.id, {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        department,
        designation: designation.trim(),
        roleId: isEditingSelf ? user.roleId : roleId,
        status,
      });

      if (success) {
        toast({
          title: 'Success',
          description: 'User updated successfully.',
        });
        onOpenChange(false);
      } else {
        toast({
          title: 'Error',
          description: 'Failed to update user.',
          variant: 'destructive',
        });
      }
    } else {
      addUser({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        department,
        designation: designation.trim(),
        roleId,
        status,
      });
      toast({
        title: 'Success',
        description: 'User added successfully.',
      });
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit User' : 'Add User'}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Full Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter full name"
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name}</p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter email address"
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email}</p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Enter phone number"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="department">Department</Label>
            <Select value={department} onValueChange={(v) => setDepartment(v as Department)}>
              <SelectTrigger>
                <SelectValue placeholder="Select department" />
              </SelectTrigger>
              <SelectContent>
                {DEPARTMENTS.map((dept) => (
                  <SelectItem key={dept} value={dept}>
                    {dept}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="designation">Designation/Title</Label>
            <Input
              id="designation"
              value={designation}
              onChange={(e) => setDesignation(e.target.value)}
              placeholder="Enter designation or title"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="role">Role *</Label>
            {isEditingSelf ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <Select value={roleId} disabled>
                        <SelectTrigger className="opacity-50 cursor-not-allowed">
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                          {roles.map((role) => (
                            <SelectItem key={role.id} value={role.id}>
                              {role.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    Ask another Admin to change your role.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <Select value={roleId} onValueChange={setRoleId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {errors.role && (
              <p className="text-sm text-destructive">{errors.role}</p>
            )}
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="status">Status</Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {status === 'active' ? 'Active' : 'Inactive'}
              </span>
              <Switch
                id="status"
                checked={status === 'active'}
                onCheckedChange={(checked) =>
                  setStatus(checked ? 'active' : 'inactive')
                }
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            {isEditing ? 'Save Changes' : 'Add User'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

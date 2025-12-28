import React, { createContext, useContext, useState, ReactNode } from 'react';
import { User, Department } from '@/types/user';
import { Role } from '@/types/role';
import { useRoles } from './RolesContext';

interface CurrentUser extends User {
  role: Role;
}

interface UsersContextType {
  users: User[];
  currentUser: CurrentUser | null;
  setCurrentUserRole: (roleId: string) => void;
  addUser: (user: Omit<User, 'id' | 'createdAt'>) => void;
  updateUser: (id: string, userData: Partial<User>) => boolean;
  deleteUser: (id: string) => { success: boolean; error?: string };
  toggleUserStatus: (id: string) => { success: boolean; error?: string };
  getUsersByRole: (roleId: string) => User[];
  getAdminCount: () => number;
  isEmailUnique: (email: string, excludeId?: string) => boolean;
}

const UsersContext = createContext<UsersContextType | undefined>(undefined);

const mockUsers: User[] = [
  {
    id: '1',
    name: 'Rajesh Kumar',
    email: 'rajesh@bulkflow.com',
    phone: '+91 98765 43210',
    department: 'Management',
    designation: 'CEO',
    roleId: '1', // Admin
    status: 'active',
    createdAt: new Date('2024-01-01'),
  },
  {
    id: '2',
    name: 'Priya Sharma',
    email: 'priya@bulkflow.com',
    phone: '+91 98765 43211',
    department: 'Operations',
    designation: 'Operations Head',
    roleId: '2', // Manager
    status: 'active',
    createdAt: new Date('2024-02-15'),
  },
  {
    id: '3',
    name: 'Amit Patel',
    email: 'amit@bulkflow.com',
    phone: '+91 98765 43212',
    department: 'Sales',
    designation: 'Sales Executive',
    roleId: '3', // Staff
    status: 'active',
    createdAt: new Date('2024-03-10'),
  },
];

export function UsersProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<User[]>(mockUsers);
  const [testingRoleId, setTestingRoleId] = useState<string | null>(null);
  const { roles } = useRoles();

  // Current logged-in user is Rajesh Kumar (id: '1')
  const currentUserData = users.find((u) => u.id === '1');
  // Use testing role if set, otherwise use actual user role
  const currentUserRole = testingRoleId 
    ? roles.find((r) => r.id === testingRoleId)
    : roles.find((r) => r.id === currentUserData?.roleId);
  
  const currentUser: CurrentUser | null = currentUserData && currentUserRole
    ? { ...currentUserData, role: currentUserRole }
    : null;

  const setCurrentUserRole = (roleId: string) => {
    setTestingRoleId(roleId);
  };

  const getAdminCount = () => {
    const adminRole = roles.find((r) => r.name === 'Admin');
    if (!adminRole) return 0;
    return users.filter((u) => u.roleId === adminRole.id && u.status === 'active').length;
  };

  const getUsersByRole = (roleId: string) => {
    return users.filter((u) => u.roleId === roleId);
  };

  const isEmailUnique = (email: string, excludeId?: string) => {
    return !users.some(
      (u) => u.email.toLowerCase() === email.toLowerCase() && u.id !== excludeId
    );
  };

  const addUser = (userData: Omit<User, 'id' | 'createdAt'>) => {
    const newUser: User = {
      ...userData,
      id: Date.now().toString(),
      createdAt: new Date(),
    };
    setUsers((prev) => [...prev, newUser]);
  };

  const updateUser = (id: string, userData: Partial<User>): boolean => {
    const user = users.find((u) => u.id === id);
    if (!user) return false;

    const adminRole = roles.find((r) => r.name === 'Admin');
    
    // Check if changing role away from Admin
    if (userData.roleId && user.roleId === adminRole?.id && userData.roleId !== adminRole.id) {
      const adminCount = getAdminCount();
      if (adminCount <= 1) {
        return false;
      }
    }

    setUsers((prev) =>
      prev.map((u) => (u.id === id ? { ...u, ...userData } : u))
    );
    return true;
  };

  const deleteUser = (id: string): { success: boolean; error?: string } => {
    const user = users.find((u) => u.id === id);
    if (!user) return { success: false, error: 'User not found' };

    // Cannot delete yourself
    if (id === currentUser?.id) {
      return { success: false, error: 'You cannot delete your own account.' };
    }

    // Check if last admin
    const adminRole = roles.find((r) => r.name === 'Admin');
    if (user.roleId === adminRole?.id) {
      const adminCount = getAdminCount();
      if (adminCount <= 1) {
        return { success: false, error: 'Cannot delete. This is the last Admin user.' };
      }
    }

    setUsers((prev) => prev.filter((u) => u.id !== id));
    return { success: true };
  };

  const toggleUserStatus = (id: string): { success: boolean; error?: string } => {
    const user = users.find((u) => u.id === id);
    if (!user) return { success: false, error: 'User not found' };

    // Cannot deactivate yourself
    if (id === currentUser?.id) {
      return { success: false, error: 'You cannot deactivate your own account.' };
    }

    // Check if deactivating last admin
    const adminRole = roles.find((r) => r.name === 'Admin');
    if (user.roleId === adminRole?.id && user.status === 'active') {
      const adminCount = getAdminCount();
      if (adminCount <= 1) {
        return { success: false, error: 'Cannot deactivate the last Admin user.' };
      }
    }

    setUsers((prev) =>
      prev.map((u) =>
        u.id === id ? { ...u, status: u.status === 'active' ? 'inactive' : 'active' } : u
      )
    );
    return { success: true };
  };

  return (
    <UsersContext.Provider
      value={{
        users,
        currentUser,
        setCurrentUserRole,
        addUser,
        updateUser,
        deleteUser,
        toggleUserStatus,
        getUsersByRole,
        getAdminCount,
        isEmailUnique,
      }}
    >
      {children}
    </UsersContext.Provider>
  );
}

export function useUsers() {
  const context = useContext(UsersContext);
  if (!context) {
    throw new Error('useUsers must be used within a UsersProvider');
  }
  return context;
}

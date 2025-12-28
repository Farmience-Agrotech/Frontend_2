import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Role, RolePermissions } from '@/types/role';

interface RolesContextType {
  roles: Role[];
  addRole: (role: Omit<Role, 'id' | 'createdAt' | 'usersCount'>) => void;
  updateRole: (id: string, role: Partial<Role>) => void;
  deleteRole: (id: string) => boolean;
  getRoleByName: (name: string) => Role | undefined;
  isRoleNameUnique: (name: string, excludeId?: string) => boolean;
}

const createFullPermissions = (): RolePermissions => ({
  dashboard: { view: true },
  orders: { view: true, create: true, edit: true, delete: true },
  invoices: { view: true, create: true },
  inventory: { view: true, create: true, edit: true, delete: true },
  customers: { view: true, create: true, edit: true, delete: true },
  suppliers: { view: true, create: true, edit: true, delete: true },
  settings: { view: true },
  userManagement: { view: true, create: true, edit: true, delete: true },
});

const mockRoles: Role[] = [
  {
    id: '1',
    name: 'Admin',
    permissions: createFullPermissions(),
    usersCount: 2,
    createdAt: new Date('2024-01-01'),
    isLocked: true,
  },
  {
    id: '2',
    name: 'Manager',
    permissions: {
      dashboard: { view: true },
      orders: { view: true, create: true, edit: true, delete: true },
      invoices: { view: true, create: true },
      inventory: { view: true, create: true, edit: true, delete: true },
      customers: { view: true, create: true, edit: true, delete: true },
      suppliers: { view: true, create: true, edit: true, delete: true },
      settings: { view: true },
      userManagement: { view: false, create: false, edit: false, delete: false },
    },
    usersCount: 5,
    createdAt: new Date('2024-02-15'),
    isLocked: false,
  },
  {
    id: '3',
    name: 'Staff',
    permissions: {
      dashboard: { view: true },
      orders: { view: true, create: true, edit: true, delete: false },
      invoices: { view: true, create: true },
      inventory: { view: true, create: false, edit: false, delete: false },
      customers: { view: true, create: true, edit: true, delete: false },
      suppliers: { view: false, create: false, edit: false, delete: false },
      settings: { view: false },
      userManagement: { view: false, create: false, edit: false, delete: false },
    },
    usersCount: 8,
    createdAt: new Date('2024-03-10'),
    isLocked: false,
  },
];

const RolesContext = createContext<RolesContextType | undefined>(undefined);

export function RolesProvider({ children }: { children: ReactNode }) {
  const [roles, setRoles] = useState<Role[]>(mockRoles);

  const addRole = (roleData: Omit<Role, 'id' | 'createdAt' | 'usersCount'>) => {
    const newRole: Role = {
      ...roleData,
      id: Date.now().toString(),
      createdAt: new Date(),
      usersCount: 0,
    };
    setRoles((prev) => [...prev, newRole]);
  };

  const updateRole = (id: string, roleData: Partial<Role>) => {
    setRoles((prev) =>
      prev.map((role) => (role.id === id ? { ...role, ...roleData } : role))
    );
  };

  const deleteRole = (id: string): boolean => {
    const role = roles.find((r) => r.id === id);
    if (!role || role.isLocked || role.usersCount > 0) {
      return false;
    }
    setRoles((prev) => prev.filter((r) => r.id !== id));
    return true;
  };

  const getRoleByName = (name: string) => {
    return roles.find((r) => r.name.toLowerCase() === name.toLowerCase());
  };

  const isRoleNameUnique = (name: string, excludeId?: string) => {
    return !roles.some(
      (r) => r.name.toLowerCase() === name.toLowerCase() && r.id !== excludeId
    );
  };

  return (
    <RolesContext.Provider
      value={{ roles, addRole, updateRole, deleteRole, getRoleByName, isRoleNameUnique }}
    >
      {children}
    </RolesContext.Provider>
  );
}

export function useRoles() {
  const context = useContext(RolesContext);
  if (!context) {
    throw new Error('useRoles must be used within a RolesProvider');
  }
  return context;
}

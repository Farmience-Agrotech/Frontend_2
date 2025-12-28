export type ModuleName = 
  | 'dashboard'
  | 'orders'
  | 'invoices'
  | 'inventory'
  | 'customers'
  | 'suppliers'
  | 'settings'
  | 'userManagement';

export type PermissionType = 'view' | 'create' | 'edit' | 'delete';

export interface ModulePermissions {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
}

export interface RolePermissions {
  dashboard: Pick<ModulePermissions, 'view'>;
  orders: ModulePermissions;
  invoices: Pick<ModulePermissions, 'view' | 'create'>;
  inventory: ModulePermissions;
  customers: ModulePermissions;
  suppliers: ModulePermissions;
  settings: Pick<ModulePermissions, 'view'>;
  userManagement: ModulePermissions;
}

export interface Role {
  id: string;
  name: string;
  permissions: RolePermissions;
  usersCount: number;
  createdAt: Date;
  isLocked: boolean;
}

export const MODULE_LABELS: Record<ModuleName, string> = {
  dashboard: 'Dashboard',
  orders: 'Orders',
  invoices: 'Invoices',
  inventory: 'Inventory',
  customers: 'Customers',
  suppliers: 'Suppliers',
  settings: 'Settings',
  userManagement: 'User Management',
};

export const MODULE_PERMISSION_CONFIG: Record<ModuleName, PermissionType[]> = {
  dashboard: ['view'],
  orders: ['view', 'create', 'edit', 'delete'],
  invoices: ['view', 'create'],
  inventory: ['view', 'create', 'edit', 'delete'],
  customers: ['view', 'create', 'edit', 'delete'],
  suppliers: ['view', 'create', 'edit', 'delete'],
  settings: ['view'],
  userManagement: ['view', 'create', 'edit', 'delete'],
};

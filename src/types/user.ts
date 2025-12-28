export type Department = 'Sales' | 'Operations' | 'Warehouse' | 'Finance' | 'Management' | 'Other';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  department: Department;
  designation: string;
  roleId: string;
  status: 'active' | 'inactive';
  createdAt: Date;
}

export const DEPARTMENTS: Department[] = [
  'Sales',
  'Operations',
  'Warehouse',
  'Finance',
  'Management',
  'Other',
];

export const ROLE_BADGE_COLORS: Record<string, string> = {
  Admin: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

export const DEFAULT_ROLE_COLORS: string[] = [
  'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400',
];

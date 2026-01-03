import { Package, LayoutDashboard, Boxes, Users, Factory, Settings, ShoppingCart, LogOut } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useUsers } from '@/contexts/UsersContext';
import { useAuth } from '@/hooks/AuthContext';
import { ModuleName } from '@/types/role';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';

interface NavItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  module: ModuleName;
}

const mainNavItems: NavItem[] = [
  { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard, module: 'dashboard' },
  { title: 'Orders', url: '/orders', icon: ShoppingCart, module: 'orders' },
  { title: 'Inventory', url: '/inventory', icon: Boxes, module: 'inventory' },
  { title: 'Customers', url: '/customers', icon: Users, module: 'customers' },
  { title: 'Suppliers', url: '/suppliers', icon: Factory, module: 'suppliers' },
];

export function AppSidebar() {
  const location = useLocation();
  const { state } = useSidebar();
  const { currentUser } = useUsers();
  const { logout } = useAuth();
  const isCollapsed = state === 'collapsed';

  const hasPermission = (module: ModuleName): boolean => {
    if (!currentUser?.role?.permissions) return false;
    const permission = currentUser.role.permissions[module];
    return permission && 'view' in permission && permission.view;
  };

  const canSeeSettings = (): boolean => {
    return hasPermission('settings') || hasPermission('userManagement');
  };

  const visibleMainItems = mainNavItems.filter((item) => hasPermission(item.module));

  const handleLogout = () => {
    logout();
  };

  return (
      <Sidebar collapsible="icon" className="border-r border-sidebar-border">
        <SidebarHeader className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
              <Package className="h-5 w-5 text-primary-foreground" />
            </div>
            {!isCollapsed && (
                <div className="flex flex-col">
                  <span className="font-semibold text-sidebar-foreground">Orkhest</span>
                  <span className="text-xs text-sidebar-foreground/60">Order Management System</span>
                </div>
            )}
          </div>
        </SidebarHeader>

        <SidebarContent className="px-2">
          <SidebarGroup>
            <SidebarGroupLabel className="text-sidebar-foreground/50 text-xs uppercase tracking-wider">
              {!isCollapsed && 'Main Menu'}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {visibleMainItems.map((item) => {
                  const isActive = location.pathname === item.url || location.pathname.startsWith(item.url + '/');
                  return (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton
                            asChild
                            isActive={isActive}
                            tooltip={item.title}
                        >
                          <NavLink
                              to={item.url}
                              className={cn(
                                  'flex items-center gap-3 rounded-lg px-3 py-2 transition-colors',
                                  isActive
                                      ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                                      : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                              )}
                          >
                            <item.icon className="h-5 w-5" />
                            {!isCollapsed && <span>{item.title}</span>}
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {canSeeSettings() && (
              <SidebarGroup className="mt-auto">
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                          asChild
                          isActive={location.pathname === '/settings'}
                          tooltip="Settings"
                      >
                        <NavLink
                            to="/settings"
                            className={cn(
                                'flex items-center gap-3 rounded-lg px-3 py-2 transition-colors',
                                location.pathname === '/settings'
                                    ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                            )}
                        >
                          <Settings className="h-5 w-5" />
                          {!isCollapsed && <span>Settings</span>}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
          )}
        </SidebarContent>

        <SidebarFooter className="p-4 border-t border-sidebar-border">
          <div className="flex flex-col gap-3">
            {/* Logout Button */}
            <Button
                variant="ghost"
                onClick={handleLogout}
                className={cn(
                    'w-full justify-start gap-3 text-sidebar-foreground/70 hover:bg-destructive/10 hover:text-destructive',
                    isCollapsed && 'justify-center px-2'
                )}
            >
              <LogOut className="h-5 w-5" />
              {!isCollapsed && <span>Logout</span>}
            </Button>

            {/* Footer Text */}
            {!isCollapsed && (
                <div className="text-xs text-sidebar-foreground/50 text-center">
                  © 2024 Orkhest
                </div>
            )}
          </div>
        </SidebarFooter>
      </Sidebar>
  );
}
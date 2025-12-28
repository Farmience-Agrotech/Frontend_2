import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, FileText, Package, AlertTriangle, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface Notification {
  id: string;
  type: 'quote' | 'order' | 'stock' | 'payment';
  message: string;
  time: string;
  read: boolean;
  link: string;
}

const mockNotifications: Notification[] = [
  {
    id: '1',
    type: 'order',
    message: 'New order #ORD-2024-156 from ABC Corporation',
    time: '15 minutes ago',
    read: false,
    link: '/orders/ORD-2024-156',
  },
  {
    id: '2',
    type: 'quote',
    message: 'Quote request pending from Tech Solutions Ltd',
    time: '2 hours ago',
    read: false,
    link: '/orders',
  },
  {
    id: '3',
    type: 'stock',
    message: 'Low stock alert: Industrial Bearing Set (5 units left)',
    time: '4 hours ago',
    read: false,
    link: '/inventory/INV-001',
  },
  {
    id: '4',
    type: 'payment',
    message: 'Payment received for order #ORD-2024-152',
    time: '1 day ago',
    read: true,
    link: '/orders/ORD-2024-152',
  },
  {
    id: '5',
    type: 'order',
    message: 'Order #ORD-2024-148 shipped successfully',
    time: '2 days ago',
    read: true,
    link: '/orders/ORD-2024-148',
  },
  {
    id: '6',
    type: 'stock',
    message: 'Low stock alert: Precision Valve Assembly (3 units left)',
    time: '3 days ago',
    read: true,
    link: '/inventory/INV-003',
  },
];

const iconMap = {
  quote: FileText,
  order: Package,
  stock: AlertTriangle,
  payment: CreditCard,
};

const iconColorMap = {
  quote: 'text-blue-500',
  order: 'text-green-500',
  stock: 'text-amber-500',
  payment: 'text-emerald-500',
};

export function NotificationsDropdown() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState(mockNotifications);
  const [open, setOpen] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleNotificationClick = (notification: Notification) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n))
    );
    setOpen(false);
    navigate(notification.link);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center font-medium">
              {unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="font-semibold text-foreground">Notifications</h3>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="text-sm text-primary hover:underline"
            >
              Mark all read
            </button>
          )}
        </div>
        
        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No new notifications
            </div>
          ) : (
            notifications.map((notification) => {
              const Icon = iconMap[notification.type];
              return (
                <button
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={cn(
                    'w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors border-b border-border last:border-0',
                    !notification.read && 'bg-primary/5'
                  )}
                >
                  <div
                    className={cn(
                      'mt-0.5 p-1.5 rounded-full bg-muted',
                      iconColorMap[notification.type]
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className={cn(
                        'text-sm text-foreground line-clamp-2',
                        !notification.read && 'font-medium'
                      )}
                    >
                      {notification.message}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {notification.time}
                    </p>
                  </div>
                  {!notification.read && (
                    <span className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-2" />
                  )}
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

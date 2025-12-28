import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, FileText, Package, AlertTriangle, CreditCard, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import apiClient from '@/api/client';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

interface Notification {
  id: string;
  type: 'order' | 'stock' | 'payment' | 'quote';
  message: string;
  time: string;
  timestamp: Date;
  read: boolean;
  link: string;
}

interface Order {
  _id: string;
  orderId?: string;
  orderNumber?: string;
  totalAmount?: number;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface Product {
  _id: string;
  name: string;
  sku?: string;
  stockQuantity?: number;
  minStockLevel?: number;
}

// -----------------------------------------------------------------------------
// HELPER FUNCTIONS
// -----------------------------------------------------------------------------

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;
  return date.toLocaleDateString();
}

function getOrderNotificationType(status: string): 'order' | 'payment' | 'quote' {
  switch (status?.toUpperCase()) {
    case 'PENDING':
    case 'QUOTED':
      return 'quote';
    case 'PAID':
    case 'PAYMENT_RECEIVED':
      return 'payment';
    default:
      return 'order';
  }
}

function getOrderMessage(order: Order): string {
  const orderId = order.orderNumber || order.orderId || order._id.slice(-8);
  const status = order.status?.toUpperCase();

  switch (status) {
    case 'PENDING':
      return `New order #${orderId} is pending approval`;
    case 'CONFIRMED':
      return `Order #${orderId} has been confirmed`;
    case 'PROCESSING':
      return `Order #${orderId} is being processed`;
    case 'SHIPPED':
      return `Order #${orderId} has been shipped`;
    case 'DELIVERED':
      return `Order #${orderId} was delivered successfully`;
    case 'CANCELLED':
      return `Order #${orderId} has been cancelled`;
    case 'PAID':
    case 'PAYMENT_RECEIVED':
      return `Payment received for order #${orderId}`;
    default:
      return `Order #${orderId} status updated to ${status || 'Unknown'}`;
  }
}

// -----------------------------------------------------------------------------
// COMPONENT
// -----------------------------------------------------------------------------

export function NotificationsDropdown() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [readNotifications, setReadNotifications] = useState<Set<string>>(() => {
    // Load read notifications from localStorage
    const stored = localStorage.getItem('readNotifications');
    return stored ? new Set(JSON.parse(stored)) : new Set();
  });

  // Fetch data when dropdown opens
  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [ordersRes, productsRes] = await Promise.all([
        apiClient.get('/orders/list').catch(() => ({ data: { orders: [] } })),
        apiClient.get('/products/list').catch(() => ({ data: { products: [] } })),
      ]);

      setOrders(ordersRes.data?.orders || ordersRes.data || []);
      setProducts(productsRes.data?.products || productsRes.data || []);
    } catch (error) {
      console.error('Failed to fetch notifications data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Generate notifications from orders and products
  const notifications = useMemo((): Notification[] => {
    const notifs: Notification[] = [];

    // Generate notifications from recent orders (last 10)
    const recentOrders = [...orders]
        .sort((a, b) => {
          const dateA = new Date(a.updatedAt || a.createdAt || 0);
          const dateB = new Date(b.updatedAt || b.createdAt || 0);
          return dateB.getTime() - dateA.getTime();
        })
        .slice(0, 10);

    recentOrders.forEach((order) => {
      const timestamp = new Date(order.updatedAt || order.createdAt || new Date());
      const id = `order-${order._id}`;

      notifs.push({
        id,
        type: getOrderNotificationType(order.status || ''),
        message: getOrderMessage(order),
        time: formatTimeAgo(timestamp),
        timestamp,
        read: readNotifications.has(id),
        link: `/orders/${order._id}`,
      });
    });

    // Generate low stock alerts from products
    const lowStockProducts = products.filter((product) => {
      const stock = product.stockQuantity ?? 0;
      const minLevel = product.minStockLevel ?? 10;
      return stock <= minLevel && stock >= 0;
    });

    lowStockProducts.forEach((product) => {
      const id = `stock-${product._id}`;

      notifs.push({
        id,
        type: 'stock',
        message: `Low stock alert: ${product.name} (${product.stockQuantity ?? 0} units left)`,
        time: 'Action required',
        timestamp: new Date(), // Stock alerts are always "now"
        read: readNotifications.has(id),
        link: `/inventory/${product._id}`,
      });
    });

    // Sort by timestamp (newest first), but keep unread at top
    return notifs.sort((a, b) => {
      // Unread notifications come first
      if (!a.read && b.read) return -1;
      if (a.read && !b.read) return 1;
      // Then sort by timestamp
      return b.timestamp.getTime() - a.timestamp.getTime();
    });
  }, [orders, products, readNotifications]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAllRead = () => {
    const allIds = notifications.map((n) => n.id);
    const newReadSet = new Set([...readNotifications, ...allIds]);
    setReadNotifications(newReadSet);
    localStorage.setItem('readNotifications', JSON.stringify([...newReadSet]));
  };

  const handleNotificationClick = (notification: Notification) => {
    // Mark as read
    const newReadSet = new Set([...readNotifications, notification.id]);
    setReadNotifications(newReadSet);
    localStorage.setItem('readNotifications', JSON.stringify([...newReadSet]));

    setOpen(false);
    navigate(notification.link);
  };

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

  return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center font-medium">
              {unreadCount > 9 ? '9+' : unreadCount}
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
            {loading ? (
                <div className="py-8 flex flex-col items-center justify-center text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin mb-2" />
                  <span className="text-sm">Loading notifications...</span>
                </div>
            ) : notifications.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  No notifications
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
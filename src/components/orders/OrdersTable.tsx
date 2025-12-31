import { formatDistanceToNow, format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Eye, Edit, XCircle, User, Loader2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { usePermissions } from '@/hooks/usePermissions';
import { useCustomers } from '@/hooks/useApi';
import type { ApiCustomer } from '@/api/customers.api';
import { useMemo } from 'react';
import { Order } from '@/types/order';

interface OrdersTableProps {
  orders: Order[];
  selectedOrders: string[];
  onSelectOrder: (orderId: string, selected: boolean) => void;
  onSelectAll: (selected: boolean) => void;
  showCheckboxes?: boolean;
  onCancelOrder?: (orderId: string) => void;
}

export function OrdersTable({
                              orders,
                              selectedOrders,
                              onSelectOrder,
                              onSelectAll,
                              showCheckboxes = true,
                              onCancelOrder
                            }: OrdersTableProps) {
  const navigate = useNavigate();
  const { canEdit, canDelete } = usePermissions();

  // Fetch customers to look up names by customerId
  const { data: customers, isLoading: customersLoading } = useCustomers();

  // Create a lookup map for faster customer search
  const customerMap = useMemo(() => {
    if (!customers) return new Map<string, ApiCustomer>();
    const map = new Map<string, ApiCustomer>();
    (customers as ApiCustomer[]).forEach(c => {
      if (c._id) map.set(c._id, c);
      if (c.id && c.id !== c._id) map.set(c.id, c);
    });
    return map;
  }, [customers]);

  const allSelected = orders.length > 0 && selectedOrders.length === orders.length;
  const someSelected = selectedOrders.length > 0 && selectedOrders.length < orders.length;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const priorityColors: Record<string, string> = {
    low: 'text-muted-foreground',
    medium: 'text-blue-600',
    high: 'text-orange-600',
    urgent: 'text-red-600',
  };

  // Look up customer by customerId
  const getCustomerInfo = (order: Order): { name: string; company: string; isLoading: boolean; hasCustomer: boolean } => {
    // If order has customerId
    if (order.customerId) {
      // Still loading customers
      if (customersLoading) {
        return {
          name: 'Loading...',
          company: '',
          isLoading: true,
          hasCustomer: true,
        };
      }

      // Customers loaded, look up
      const customer = customerMap.get(order.customerId);

      if (customer) {
        return {
          name: customer.contactPerson || customer.businessName || 'Unknown',
          company: customer.businessName || '',
          isLoading: false,
          hasCustomer: true,
        };
      }

      // Customer ID exists but not found (might be deleted)
      return {
        name: 'Unknown Customer',
        company: `ID: ${order.customerId.slice(-6)}`,
        isLoading: false,
        hasCustomer: true,
      };
    }

    // No customerId - check legacy customer object
    if (order.customer && order.customer.name && order.customer.name !== 'Unknown Customer') {
      return {
        name: order.customer.name,
        company: order.customer.company || '',
        isLoading: false,
        hasCustomer: true,
      };
    }

    // No customer at all
    return {
      name: 'Guest',
      company: 'Walk-in Customer',
      isLoading: false,
      hasCustomer: false,
    };
  };

  // Get order ID for display
  const getOrderId = (order: Order): string => {
    return order.orderNumber || order.orderId || order.id;
  };

  // Get items count
  const getItemsCount = (order: Order): number => {
    if (order.items && order.items.length > 0) {
      return order.items.length;
    }
    if (order.products && order.products.length > 0) {
      return order.products.length;
    }
    return 0;
  };

  // Get row ID for navigation
  const getRowId = (order: Order): string => {
    return order._id || order.id;
  };

  const showEditAction = canEdit('orders');
  const showDeleteAction = canDelete('orders');
  const hasAnyAction = showEditAction || showDeleteAction;

  return (
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              {showCheckboxes && (
                  <TableHead className="w-12">
                    <Checkbox
                        checked={allSelected}
                        onCheckedChange={(checked) => onSelectAll(!!checked)}
                        aria-label="Select all"
                        className={cn(someSelected && 'opacity-50')}
                    />
                  </TableHead>
              )}
              <TableHead className="font-semibold">Order</TableHead>
              <TableHead className="font-semibold">Customer</TableHead>
              <TableHead className="font-semibold">Date</TableHead>
              <TableHead className="font-semibold">Amount</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="font-semibold">Priority</TableHead>
              {hasAnyAction && <TableHead className="w-12"></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={showCheckboxes ? (hasAnyAction ? 8 : 7) : (hasAnyAction ? 7 : 6)} className="h-32 text-center text-muted-foreground">
                    No orders found
                  </TableCell>
                </TableRow>
            ) : (
                orders.map((order) => {
                  const customerInfo = getCustomerInfo(order);
                  const orderId = getOrderId(order);
                  const itemsCount = getItemsCount(order);
                  const rowId = getRowId(order);

                  return (
                      <TableRow
                          key={rowId}
                          className="cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => navigate(`/orders/${rowId}`)}
                      >
                        {showCheckboxes && (
                            <TableCell onClick={(e) => e.stopPropagation()}>
                              <Checkbox
                                  checked={selectedOrders.includes(rowId)}
                                  onCheckedChange={(checked) => onSelectOrder(rowId, !!checked)}
                                  aria-label={`Select order ${orderId}`}
                              />
                            </TableCell>
                        )}
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium text-foreground">{orderId}</span>
                            <span className="text-xs text-muted-foreground">
                        {itemsCount} item{itemsCount !== 1 ? 's' : ''}
                      </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <div className="flex items-center gap-1.5">
                              {customerInfo.isLoading ? (
                                  <Loader2 className="h-3.5 w-3.5 text-muted-foreground animate-spin" />
                              ) : customerInfo.hasCustomer ? (
                                  <User className="h-3.5 w-3.5 text-primary" />
                              ) : (
                                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                              )}
                              <span className={cn(
                                  "font-medium",
                                  customerInfo.isLoading && "text-muted-foreground"
                              )}>
                          {customerInfo.name}
                        </span>
                            </div>
                            <span className="text-xs text-muted-foreground">{customerInfo.company}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-sm">{format(new Date(order.createdAt), 'MMM d, yyyy')}</span>
                            <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(order.createdAt), { addSuffix: true })}
                      </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-semibold">{formatCurrency(order.totalAmount)}</span>
                        </TableCell>
                        <TableCell>
                          <OrderStatusBadge status={order.status} />
                        </TableCell>
                        <TableCell>
                    <span className={cn('text-sm font-medium capitalize', priorityColors[order.priority] || 'text-blue-600')}>
                      {order.priority || 'medium'}
                    </span>
                        </TableCell>
                        {hasAnyAction && (
                            <TableCell onClick={(e) => e.stopPropagation()}>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => navigate(`/orders/${rowId}`)}>
                                    <Eye className="mr-2 h-4 w-4" />
                                    View Details
                                  </DropdownMenuItem>
                                  {showEditAction && (
                                      <DropdownMenuItem>
                                        <Edit className="mr-2 h-4 w-4" />
                                        Edit Order
                                      </DropdownMenuItem>
                                  )}
                                  {showDeleteAction && onCancelOrder && (
                                      <>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                            className="text-destructive"
                                            onClick={() => onCancelOrder(rowId)}
                                        >
                                          <XCircle className="mr-2 h-4 w-4" />
                                          Cancel Order
                                        </DropdownMenuItem>
                                      </>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                        )}
                      </TableRow>
                  );
                })
            )}
          </TableBody>
        </Table>
      </div>
  );
}

// Order Status Badge Component
function OrderStatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string, { label: string; className: string }> = {
    PENDING: {
      label: 'Pending',
      className: 'bg-yellow-100 text-yellow-800 border-yellow-200'
    },
    CONFIRMED: {
      label: 'Confirmed',
      className: 'bg-blue-100 text-blue-800 border-blue-200'
    },
    PROCESSING: {
      label: 'Processing',
      className: 'bg-purple-100 text-purple-800 border-purple-200'
    },
    SHIPPED: {
      label: 'Shipped',
      className: 'bg-indigo-100 text-indigo-800 border-indigo-200'
    },
    DELIVERED: {
      label: 'Delivered',
      className: 'bg-green-100 text-green-800 border-green-200'
    },
    CANCELLED: {
      label: 'Cancelled',
      className: 'bg-red-100 text-red-800 border-red-200'
    },
    pending: {
      label: 'Pending',
      className: 'bg-yellow-100 text-yellow-800 border-yellow-200'
    },
    confirmed: {
      label: 'Confirmed',
      className: 'bg-blue-100 text-blue-800 border-blue-200'
    },
    processing: {
      label: 'Processing',
      className: 'bg-purple-100 text-purple-800 border-purple-200'
    },
    shipped: {
      label: 'Shipped',
      className: 'bg-indigo-100 text-indigo-800 border-indigo-200'
    },
    delivered: {
      label: 'Delivered',
      className: 'bg-green-100 text-green-800 border-green-200'
    },
    cancelled: {
      label: 'Cancelled',
      className: 'bg-red-100 text-red-800 border-red-200'
    },
    awaiting_quote: {
      label: 'Awaiting Quote',
      className: 'bg-orange-100 text-orange-800 border-orange-200'
    },
    payment_pending: {
      label: 'Payment Pending',
      className: 'bg-amber-100 text-amber-800 border-amber-200'
    },
    quote_requested: {
      label: 'Quote Requested',
      className: 'bg-orange-100 text-orange-800 border-orange-200'
    },
    quote_sent: {
      label: 'Quote Sent',
      className: 'bg-cyan-100 text-cyan-800 border-cyan-200'
    },
    negotiation: {
      label: 'Negotiation',
      className: 'bg-purple-100 text-purple-800 border-purple-200'
    },
    order_booked: {
      label: 'Order Booked',
      className: 'bg-emerald-100 text-emerald-800 border-emerald-200'
    },
    paid: {
      label: 'Paid',
      className: 'bg-green-100 text-green-800 border-green-200'
    },
    packed: {
      label: 'Packed',
      className: 'bg-violet-100 text-violet-800 border-violet-200'
    },
    completed: {
      label: 'Completed',
      className: 'bg-green-100 text-green-800 border-green-200'
    },
    rejected: {
      label: 'Rejected',
      className: 'bg-red-100 text-red-800 border-red-200'
    },
    returned: {
      label: 'Returned',
      className: 'bg-rose-100 text-rose-800 border-rose-200'
    },
    refunded: {
      label: 'Refunded',
      className: 'bg-pink-100 text-pink-800 border-pink-200'
    },
    on_hold: {
      label: 'On Hold',
      className: 'bg-slate-100 text-slate-800 border-slate-200'
    },
  };

  const config = statusConfig[status] || {
    label: status,
    className: 'bg-gray-100 text-gray-800 border-gray-200'
  };

  return (
      <span className={cn(
          'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
          config.className
      )}>
      {config.label}
    </span>
  );
}
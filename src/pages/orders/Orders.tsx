import { useState, useMemo } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout.tsx';
import { OrdersTable } from '@/components/orders/OrdersTable.tsx';
import { OrderFilters } from '@/components/orders/OrderFilters.tsx';
import { OrderStats } from '@/components/orders/OrderStats.tsx';
import { AddOrderDialog } from '@/components/orders/AddOrderDialog';
import { Order, OrderStatus } from '@/types/order.ts';
import { Button } from '@/components/ui/button.tsx';
import { Plus, Download, RefreshCw, Loader2, XCircle, AlertCircle } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { isWithinInterval } from 'date-fns';
import { usePermissions } from '@/hooks/usePermissions.ts';
import { useToast } from '@/hooks/use-toast';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// ✅ Import API hooks - now includes useProducts
import { useOrders, useProducts, useUpdateOrderStatus, useUpdateQuotation } from '@/hooks/useApi';

// =============================================================================
// STATUS MAPPING - EC2 (uppercase) → Frontend (lowercase)
// =============================================================================
const mapApiStatusToFrontend = (apiStatus: string): OrderStatus => {
  const statusMap: Record<string, OrderStatus> = {
    'PENDING': 'payment_pending',
    'PAID': 'confirmed',
    'SHIPPED': 'shipped',
    'DELIVERED': 'delivered',
    'CANCELLED': 'cancelled',
    'pending': 'payment_pending',
    'paid': 'confirmed',
    'shipped': 'shipped',
    'delivered': 'delivered',
    'cancelled': 'cancelled',
    'processing': 'processing',
    'packed': 'packed',
    'quote_requested': 'quote_requested',
    'quote_sent': 'quote_sent',
    'confirmed': 'confirmed',
    'payment_pending': 'payment_pending',
    'completed': 'completed',
    'returned': 'returned',
    'refunded': 'refunded',
    'on_hold': 'on_hold',
    'rejected': 'rejected',
  };

  return statusMap[apiStatus] || 'processing';
};

const mapPaymentStatus = (apiStatus: string): 'pending' | 'partial' | 'paid' | 'refunded' => {
  const paymentMap: Record<string, 'pending' | 'partial' | 'paid' | 'refunded'> = {
    'PENDING': 'pending',
    'PAID': 'paid',
    'SHIPPED': 'paid',
    'DELIVERED': 'paid',
    'CANCELLED': 'refunded',
  };
  return paymentMap[apiStatus] || 'pending';
};

export default function Orders() {
  const { canCreate, canEdit, canDelete } = usePermissions();
  const { toast } = useToast();

  // ✅ Fetch orders AND products from API
  const { data: apiOrders, isLoading: ordersLoading, error: ordersError, refetch } = useOrders();
  const { data: apiProducts, isLoading: productsLoading } = useProducts();
  const updateStatusMutation = useUpdateOrderStatus();
  const updateQuotationMutation = useUpdateQuotation();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [amountFilter, setAmountFilter] = useState('all');
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [addOrderDialogOpen, setAddOrderDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [isBulkCancelling, setIsBulkCancelling] = useState(false);

// Handle single order cancel from row menu
  const handleSingleCancelOrder = (orderId: string) => {
    setSelectedOrders([orderId]);
    setCancelDialogOpen(true);
  };

  // ✅ Create product lookup map for fast access
  const productLookup: Record<string, { name: string; sku: string }> = useMemo(() => {
    if (!apiProducts) return {};
    const lookup: Record<string, { name: string; sku: string }> = {};
    (apiProducts as any[]).forEach((product) => {
      lookup[product._id] = {
        name: product.name,
        sku: product.sku || '',
      };
    });
    return lookup;
  }, [apiProducts]);

  // ✅ Map API orders to frontend Order type with product names
  const orders: Order[] = useMemo(() => {
    if (!apiOrders) return [];

    return apiOrders.map((apiOrder: any) => {
      // ✅ Map products array to items format WITH product names
      const items = (apiOrder.products || apiOrder.items || []).map((product: any, index: number) => {
        const productInfo = productLookup[product.productId] || { name: '', sku: '' };
        return {
          id: product.id || product._id || `item-${index}`,
          productId: product.productId || product._id,
          productName: product.productName || productInfo.name || `Product ${index + 1}`,
          sku: product.sku || productInfo.sku || '',
          quantity: product.quantity || 1,
          unit: product.unit || 'pieces',
          unitPrice: product.price || product.unitPrice || 0,
          totalPrice: (product.quantity || 1) * (product.price || product.unitPrice || 0),
        };
      });

      const subtotal = apiOrder.subtotal || items.reduce((sum: number, item: any) => sum + item.totalPrice, 0);

      // ✅ Calculate tax: use provided value, or derive from total - subtotal
      const shippingCost = apiOrder.shippingCost || 0;
      const discount = apiOrder.discount || 0;
      const totalAmount = apiOrder.totalAmount || subtotal;

      // If tax isn't provided, derive it from: total = subtotal + tax + shipping - discount
      let tax = apiOrder.tax;
      if (tax === undefined || tax === null || tax === 0) {
        const derivedTax = totalAmount - subtotal - shippingCost + discount;
        // Use derived tax if it's positive and reasonable (up to 30% of subtotal)
        if (derivedTax > 0 && derivedTax <= subtotal * 0.3) {
          tax = Math.round(derivedTax * 100) / 100; // Round to 2 decimals
        } else {
          tax = 0; // No tax if we can't derive it
        }
      }

      return {
        id: apiOrder._id || apiOrder.id,
        orderNumber: apiOrder.orderNumber || apiOrder.orderId || `ORD-${apiOrder._id?.slice(-6) || '000000'}`,

        // ✅ FIXED: Include customerId for customer lookup in OrdersTable
        customerId: apiOrder.customerId,

        customer: apiOrder.customer || {
          id: apiOrder.customerId || 'unknown',
          name: 'Unknown Customer',
          email: '',
          phone: '',
          company: '',
          type: 'retailer' as const,
        },
        billingAddress: apiOrder.billingAddress || {
          street: '',
          city: '',
          state: '',
          pincode: '',
          country: 'India',
        },
        shippingAddress: apiOrder.shippingAddress || {
          street: '',
          city: '',
          state: '',
          pincode: '',
          country: 'India',
        },
        items: items,
        subtotal: subtotal,
        tax: tax,
        shippingCost: shippingCost,
        discount: discount,
        totalAmount: totalAmount,
        status: mapApiStatusToFrontend(apiOrder.status),
        paymentStatus: apiOrder.paymentStatus || mapPaymentStatus(apiOrder.status),
        paymentMethod: apiOrder.paymentMethod,
        createdAt: apiOrder.createdAt || new Date().toISOString(),
        updatedAt: apiOrder.updatedAt || new Date().toISOString(),
        expectedDelivery: apiOrder.expectedDelivery,
        timeline: apiOrder.timeline || [],
        notes: apiOrder.notes,
        assignedTo: apiOrder.assignedTo,
        priority: apiOrder.priority || 'medium',
      };
    });
  }, [apiOrders, productLookup]);

  // ✅ Calculate stats
  const stats = useMemo(() => {
    // Filter out cancelled and rejected orders for all stats
    const activeOrders = orders.filter(o =>
        !['cancelled', 'rejected'].includes(o.status)
    );

    const total = activeOrders.length;
    const pending = activeOrders.filter(o =>
        ['quote_requested', 'quote_sent', 'negotiation', 'confirmed', 'payment_pending'].includes(o.status)
    ).length;
    const processing = activeOrders.filter(o =>
        ['processing', 'packed', 'order_booked', 'paid'].includes(o.status)
    ).length;
    const shipped = activeOrders.filter(o => o.status === 'shipped').length;
    const completed = activeOrders.filter(o =>
        ['delivered', 'completed'].includes(o.status)
    ).length;
    const totalValue = activeOrders
        .filter(o => !['returned', 'refunded'].includes(o.status))
        .reduce((sum, o) => sum + o.totalAmount, 0);

    return { total, pending, processing, shipped, completed, totalValue };
  }, [orders]);

  const filteredOrders = useMemo(() => {
    return orders
        .filter((order) => {
          // "All Statuses" shows everything including cancelled
          if (statusFilter === 'all') {
            return true;
          }
          // "Cancelled" filter shows both cancelled and rejected
          if (statusFilter === 'cancelled') {
            return order.status === 'cancelled' || order.status === 'rejected';
          }
          // Other filters match exact status
          return true;
        })
        .filter((order) => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
            order.orderNumber.toLowerCase().includes(query) ||
            order.customer.name.toLowerCase().includes(query) ||
            order.customer.company?.toLowerCase().includes(query) ||
            order.items.some((item) => item.productName.toLowerCase().includes(query));
        if (!matchesSearch) return false;
      }

      if (statusFilter !== 'all' && order.status !== statusFilter) return false;

      if (dateRange?.from && dateRange?.to) {
        const orderDate = new Date(order.createdAt);
        if (!isWithinInterval(orderDate, { start: dateRange.from, end: dateRange.to })) return false;
      }

      if (amountFilter !== 'all') {
        const amount = order.totalAmount;
        switch (amountFilter) {
          case '0-10000': if (amount >= 10000) return false; break;
          case '10000-50000': if (amount < 10000 || amount >= 50000) return false; break;
          case '50000-100000': if (amount < 50000 || amount >= 100000) return false; break;
          case '100000+': if (amount < 100000) return false; break;
        }
      }

      return true;
    });
  }, [orders, searchQuery, statusFilter, dateRange, amountFilter]);

  const hasActiveFilters = searchQuery !== '' || statusFilter !== 'all' || dateRange !== undefined || amountFilter !== 'all';

  const handleClearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setDateRange(undefined);
    setAmountFilter('all');
  };

  const handleSelectOrder = (orderId: string, selected: boolean) => {
    if (selected) {
      setSelectedOrders((prev) => [...prev, orderId]);
    } else {
      setSelectedOrders((prev) => prev.filter((id) => id !== orderId));
    }
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedOrders(filteredOrders.map((order) => order.id));
    } else {
      setSelectedOrders([]);
    }
  };

  const handleBulkCancel = async () => {
    if (selectedOrders.length === 0) return;

    setIsBulkCancelling(true);

    try {
      const ordersToCancel = filteredOrders.filter(order =>
          selectedOrders.includes(order.id)
      );

      await Promise.all(
          ordersToCancel.map(order => {
            // Check if it's a quotation (orderNumber starts with "QUO")
            const isQuotation = order.orderNumber?.startsWith('QUO') ||
                order.orderId?.startsWith('QUO');

            if (isQuotation) {
              // Use updateQuotation for quotations
              return updateQuotationMutation.mutateAsync({
                quotationId: order.id,
                data: { status: 'REJECTED' },
              });
            } else {
              // Use updateOrderStatus for regular orders
              return updateStatusMutation.mutateAsync({
                orderId: order.orderNumber || order.orderId || order.id,
                newStatus: 'cancelled',
              });
            }
          })
      );

      toast({
        title: selectedOrders.length > 1 ? 'Orders Cancelled' : 'Order Cancelled',
        description: `Successfully cancelled ${selectedOrders.length} order${selectedOrders.length > 1 ? 's' : ''}.`,
      });

      setSelectedOrders([]);
      setCancelDialogOpen(false);
      refetch();
    } catch (error) {
      console.error('Failed to cancel orders:', error);
      toast({
        title: 'Error',
        description: 'Failed to cancel order(s). Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsBulkCancelling(false);
    }
  };

  const handleRefresh = () => {
    refetch();
  };

  const isLoading = ordersLoading || productsLoading;

  if (isLoading) {
    return (
        <DashboardLayout>
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">Loading orders...</span>
          </div>
        </DashboardLayout>
    );
  }

  if (ordersError) {
    return (
        <DashboardLayout>
          <div className="flex flex-col items-center justify-center h-64 text-destructive">
            <p>Failed to load orders</p>
            <p className="text-sm">{ordersError?.message}</p>
            <Button onClick={handleRefresh} className="mt-4">Try Again</Button>
          </div>
        </DashboardLayout>
    );
  }

  return (
      <DashboardLayout>
        <div className="space-y-6 animate-fade-in">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Orders</h1>
              <p className="text-muted-foreground">Manage and track all customer orders</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
              <Button variant="outline" size="sm" onClick={handleRefresh}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
              {canCreate('orders') && (
                  <Button size="sm" onClick={() => setAddOrderDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    New Order
                  </Button>
              )}
            </div>
          </div>

          <OrderStats stats={stats} />

          <OrderFilters
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              statusFilter={statusFilter}
              onStatusChange={setStatusFilter}
              dateRange={dateRange}
              onDateRangeChange={setDateRange}
              amountFilter={amountFilter}
              onAmountChange={setAmountFilter}
              onClearFilters={handleClearFilters}
              hasActiveFilters={hasActiveFilters}
          />

          {selectedOrders.length > 0 && (
              <div className="flex items-center gap-4 p-3 bg-primary/5 rounded-lg border border-primary/20">
      <span className="text-sm font-medium">
        {selectedOrders.length} order{selectedOrders.length > 1 ? 's' : ''} selected
      </span>
                <div className="flex items-center gap-2">
                  {canEdit('orders') && (
                      <Button variant="outline" size="sm">Update Status</Button>
                  )}
                  <Button variant="outline" size="sm">Export Selected</Button>
                  {canDelete('orders') && (
                      <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setCancelDialogOpen(true)}
                      >
                        <XCircle className="mr-2 h-4 w-4" />
                        Cancel Order{selectedOrders.length > 1 ? 's' : ''}
                      </Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => setSelectedOrders([])}>
                    Clear Selection
                  </Button>
                </div>
              </div>
          )}
          <OrdersTable
              orders={filteredOrders}
              selectedOrders={selectedOrders}
              onSelectOrder={handleSelectOrder}
              onSelectAll={handleSelectAll}
              showCheckboxes={canDelete('orders')}
              onCancelOrder={handleSingleCancelOrder}
          />

          <div className="text-sm text-muted-foreground">
            Showing {filteredOrders.length} of {orders.length} orders
          </div>
        </div>

        <AddOrderDialog
            open={addOrderDialogOpen}
            onOpenChange={setAddOrderDialogOpen}
        />

        {/* Cancel Order Confirmation Dialog */}
        <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-destructive" />
                Cancel Order{selectedOrders.length > 1 ? 's' : ''}
              </DialogTitle>
              <DialogDescription>
                Are you sure you want to cancel {selectedOrders.length} order{selectedOrders.length > 1 ? 's' : ''}?
                This action cannot be undone.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-700">
                  <strong>Orders to cancel:</strong> {selectedOrders.length}
                </p>
                <p className="text-sm text-red-700 mt-1">
                  <strong>Order ID{selectedOrders.length > 1 ? 's' : ''}:</strong>{' '}
                  {filteredOrders
                      .filter(order => selectedOrders.includes(order.id))
                      .map(order => order.orderNumber || order.orderId)
                      .slice(0, 5)
                      .join(', ')}
                  {selectedOrders.length > 5 && ` and ${selectedOrders.length - 5} more...`}
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button
                  variant="outline"
                  onClick={() => setCancelDialogOpen(false)}
                  disabled={isBulkCancelling}
              >
                Keep Order{selectedOrders.length > 1 ? 's' : ''}
              </Button>
              <Button
                  variant="destructive"
                  onClick={handleBulkCancel}
                  disabled={isBulkCancelling}
              >
                {isBulkCancelling && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Cancel Order{selectedOrders.length > 1 ? 's' : ''}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DashboardLayout>
  );
}
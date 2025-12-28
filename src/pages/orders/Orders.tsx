import { useState, useMemo } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout.tsx';
import { OrdersTable } from '@/components/orders/OrdersTable.tsx';
import { OrderFilters } from '@/components/orders/OrderFilters.tsx';
import { OrderStats } from '@/components/orders/OrderStats.tsx';
import { AddOrderDialog } from '@/components/orders/AddOrderDialog';
import { Order, OrderStatus } from '@/types/order.ts';
import { Button } from '@/components/ui/button.tsx';
import { Plus, Download, RefreshCw, Loader2 } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { isWithinInterval } from 'date-fns';
import { usePermissions } from '@/hooks/usePermissions.ts';

// ✅ Import API hooks - now includes useProducts
import { useOrders, useProducts } from '@/hooks/useApi';

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

  // ✅ Fetch orders AND products from API
  const { data: apiOrders, isLoading: ordersLoading, error: ordersError, refetch } = useOrders();
  const { data: apiProducts, isLoading: productsLoading } = useProducts();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [amountFilter, setAmountFilter] = useState('all');
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [addOrderDialogOpen, setAddOrderDialogOpen] = useState(false);

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
    const total = orders.length;
    const pending = orders.filter(o =>
        ['quote_requested', 'quote_sent', 'confirmed', 'payment_pending'].includes(o.status)
    ).length;
    const processing = orders.filter(o =>
        ['processing', 'packed'].includes(o.status)
    ).length;
    const shipped = orders.filter(o => o.status === 'shipped').length;
    const completed = orders.filter(o =>
        ['delivered', 'completed'].includes(o.status)
    ).length;
    const totalValue = orders
        .filter(o => !['cancelled', 'returned', 'refunded'].includes(o.status))
        .reduce((sum, o) => sum + o.totalAmount, 0);

    return { total, pending, processing, shipped, completed, totalValue };
  }, [orders]);

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
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
          />

          <div className="text-sm text-muted-foreground">
            Showing {filteredOrders.length} of {orders.length} orders
          </div>
        </div>

        <AddOrderDialog
            open={addOrderDialogOpen}
            onOpenChange={setAddOrderDialogOpen}
        />
      </DashboardLayout>
  );
}
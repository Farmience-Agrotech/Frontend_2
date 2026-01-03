// =============================================================================
// PRODUCTION LISTING PAGE
// Shows all orders that are in production/processing stage
// Route: /production (Sidebar access)
// =============================================================================

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    ClipboardList,
    Package,
    Loader2,
    Eye,
    Clock,
    CheckCircle2,
    AlertCircle,
    TrendingUp,
    Users,
    Factory,
    Settings2,
} from 'lucide-react';
import { format } from 'date-fns';

// Hooks & API
import { useOrders, useCustomers } from '@/hooks/useApi';
import type { ApiOrder } from '@/api/orders.api';
import type { ApiCustomer } from '@/api/customers.api';

// Template
import { useProductionTemplate } from '@/hooks/useProductionTemplate';
import { TemplateEditorDialog } from '@/components/production/TemplateEditorDialog';

// =============================================================================
// HELPER: Map API status to frontend status
// =============================================================================
const mapApiStatusToFrontend = (apiStatus: string): string => {
    const statusMap: Record<string, string> = {
        'PENDING': 'quote_requested',
        'QUOTE_SENT': 'quote_sent',
        'NEGOTIATING': 'negotiation',
        'ACCEPTED': 'order_booked',
        'REJECTED': 'rejected',
        'PROCESSING': 'processing',
        'PAID': 'processing',
        'SHIPPED': 'shipped',
        'DELIVERED': 'delivered',
        'CANCELLED': 'cancelled',
    };
    return statusMap[apiStatus] || apiStatus.toLowerCase();
};

// =============================================================================
// COMPONENT
// =============================================================================

export default function Production() {
    const navigate = useNavigate();

    // ---------------------------------------------------------------------------
    // TEMPLATE MANAGEMENT
    // ---------------------------------------------------------------------------
    const { template, saveTemplate, resetTemplate } = useProductionTemplate();
    const [showTemplateEditor, setShowTemplateEditor] = useState(false);

    // ---------------------------------------------------------------------------
    // DATA FETCHING
    // ---------------------------------------------------------------------------
    const { data: apiOrders, isLoading: ordersLoading } = useOrders();
    const { data: apiCustomers, isLoading: customersLoading } = useCustomers();

    // ---------------------------------------------------------------------------
    // CUSTOMER LOOKUP
    // ---------------------------------------------------------------------------
    const customerMap = useMemo(() => {
        if (!apiCustomers) return new Map<string, ApiCustomer>();
        const map = new Map<string, ApiCustomer>();
        (apiCustomers as ApiCustomer[]).forEach((c) => {
            if (c._id) map.set(c._id, c);
            if (c.id && c.id !== c._id) map.set(c.id, c);
        });
        return map;
    }, [apiCustomers]);

    const getCustomerName = (order: ApiOrder): string => {
        // Try to get from customerMap first
        if (order.customerId) {
            const customer = customerMap.get(order.customerId);
            if (customer) {
                return customer.contactPerson || customer.businessName || 'Unknown';
            }
        }
        // Fallback to order.customer.name
        if (order.customer?.name && order.customer.name !== 'Loading...') {
            return order.customer.name;
        }
        return 'N/A';
    };

    const isLoading = ordersLoading || customersLoading;

    // ---------------------------------------------------------------------------
    // FILTER ORDERS IN PRODUCTION STAGE
    // ---------------------------------------------------------------------------
    const productionOrders = useMemo(() => {
        if (!apiOrders) return [];

        return (apiOrders as ApiOrder[]).filter((order) => {
            const frontendStatus = mapApiStatusToFrontend(order.status);
            // Include orders that are in processing stage
            return ['processing', 'paid', 'packed'].includes(frontendStatus);
        });
    }, [apiOrders]);

    // ---------------------------------------------------------------------------
    // STATS
    // ---------------------------------------------------------------------------
    const stats = useMemo(() => {
        const total = productionOrders.length;
        const processing = productionOrders.filter(
            (o) => mapApiStatusToFrontend(o.status) === 'processing'
        ).length;
        const packed = productionOrders.filter(
            (o) => mapApiStatusToFrontend(o.status) === 'packed'
        ).length;

        const totalValue = productionOrders.reduce(
            (sum, order) => sum + (order.totalAmount || 0),
            0
        );

        return { total, processing, packed, totalValue };
    }, [productionOrders]);

    // ---------------------------------------------------------------------------
    // HANDLERS
    // ---------------------------------------------------------------------------
    const handleViewProduction = (orderId: string) => {
        navigate(`/orders/${orderId}/production`);
    };

    const handleViewOrder = (orderId: string) => {
        navigate(`/orders/${orderId}`);
    };

    // ---------------------------------------------------------------------------
    // FORMAT HELPERS
    // ---------------------------------------------------------------------------
    const formatCurrency = (amount: number): string => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0,
        }).format(amount);
    };

    const formatDate = (dateString: string): string => {
        try {
            return format(new Date(dateString), 'dd MMM yyyy');
        } catch {
            return 'N/A';
        }
    };

    // ---------------------------------------------------------------------------
    // LOADING STATE
    // ---------------------------------------------------------------------------
    if (isLoading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            </DashboardLayout>
        );
    }
    // ===========================================================================
    // RENDER
    // ===========================================================================

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <ClipboardList className="h-6 w-6 text-blue-600" />
                            Production & Sourcing
                        </h1>
                        <p className="text-muted-foreground">
                            Track and manage orders currently in production
                        </p>
                    </div>
                    <Button
                        onClick={() => setShowTemplateEditor(true)}
                        variant="outline"
                    >
                        <Settings2 className="h-4 w-4 mr-2" />
                        Edit Template
                    </Button>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                Total In Production
                            </CardTitle>
                            <Factory className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.total}</div>
                            <p className="text-xs text-muted-foreground">Active orders</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                Processing
                            </CardTitle>
                            <Clock className="h-4 w-4 text-amber-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-amber-600">{stats.processing}</div>
                            <p className="text-xs text-muted-foreground">In progress</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                Ready to Ship
                            </CardTitle>
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-green-600">{stats.packed}</div>
                            <p className="text-xs text-muted-foreground">Packed & ready</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                Total Value
                            </CardTitle>
                            <TrendingUp className="h-4 w-4 text-blue-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-blue-600">
                                {formatCurrency(stats.totalValue)}
                            </div>
                            <p className="text-xs text-muted-foreground">In production</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Orders Table */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Package className="h-5 w-5" />
                            Orders in Production
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {productionOrders.length === 0 ? (
                            <div className="text-center py-12">
                                <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                                <h3 className="text-lg font-medium">No Orders in Production</h3>
                                <p className="text-muted-foreground">
                                    Orders will appear here once they move to the processing stage.
                                </p>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Order Number</TableHead>
                                        <TableHead>Customer</TableHead>
                                        <TableHead>Items</TableHead>
                                        <TableHead>Total Amount</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Date</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {productionOrders.map((order) => {
                                        const frontendStatus = mapApiStatusToFrontend(order.status);
                                        return (
                                            <TableRow key={order._id}>
                                                <TableCell className="font-medium">
                                                    {order.orderNumber}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <Users className="h-4 w-4 text-muted-foreground" />
                                                        {getCustomerName(order)}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    {order.items?.length || 0} products
                                                </TableCell>
                                                <TableCell>
                                                    {formatCurrency(order.totalAmount || 0)}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge
                                                        className={
                                                            frontendStatus === 'processing'
                                                                ? 'bg-amber-100 text-amber-700 border-amber-200'
                                                                : frontendStatus === 'packed'
                                                                    ? 'bg-purple-100 text-purple-700 border-purple-200'
                                                                    : 'bg-blue-100 text-blue-700 border-blue-200'
                                                        }
                                                    >
                                                        {frontendStatus === 'processing'
                                                            ? 'Processing'
                                                            : frontendStatus === 'packed'
                                                                ? 'Packed'
                                                                : 'In Production'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-muted-foreground">
                                                    {formatDate(order.createdAt)}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleViewOrder(order._id)}
                                                        >
                                                            <Eye className="h-4 w-4 mr-1" />
                                                            Order
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            onClick={() => handleViewProduction(order._id)}
                                                            className="bg-blue-600 hover:bg-blue-700"
                                                        >
                                                            <ClipboardList className="h-4 w-4 mr-1" />
                                                            Production
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Template Editor Dialog */}
            <TemplateEditorDialog
                open={showTemplateEditor}
                onOpenChange={setShowTemplateEditor}
                template={template}
                onSave={saveTemplate}
                onReset={resetTemplate}
            />
        </DashboardLayout>
    );
}

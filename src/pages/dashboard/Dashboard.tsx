import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table.tsx";
import { IndianRupee, ShoppingCart, FileText, Users, TrendingUp, TrendingDown, Package, Clock, AlertTriangle, ArrowRight, UserPlus, PackageCheck, RefreshCw, AlertCircle, Loader2 } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";

// ✅ Import API hooks
import { useOrders, useProducts, useInventory } from "@/hooks/useApi";

const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);

const formatCompact = (amount: number) =>
    new Intl.NumberFormat("en-IN", {
      notation: "compact",
      compactDisplay: "short",
      maximumFractionDigits: 1,
    }).format(amount);

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    processing: "bg-primary text-primary-foreground",
    shipped: "bg-info text-info-foreground",
    confirmed: "bg-success text-success-foreground",
    delivered: "bg-success text-success-foreground",
    completed: "bg-success text-success-foreground",
    pending: "bg-warning text-warning-foreground",
    payment_pending: "bg-warning text-warning-foreground",
    quote_requested: "bg-warning text-warning-foreground",
    quote_sent: "bg-info text-info-foreground",
    cancelled: "bg-destructive text-destructive-foreground",
  };
  return colors[status] || "bg-muted text-muted-foreground";
};

// ✅ Map EC2 status to frontend status
const mapApiStatus = (status: string): string => {
  const statusMap: Record<string, string> = {
    'PENDING': 'payment_pending',
    'PAID': 'confirmed',
    'SHIPPED': 'shipped',
    'DELIVERED': 'delivered',
    'CANCELLED': 'cancelled',
  };
  return statusMap[status] || status.toLowerCase();
};

const Dashboard = () => {
  const navigate = useNavigate();

  // ✅ Fetch data from API (removed useCustomers - not available on EC2)
  const { data: apiOrders, isLoading: ordersLoading, error: ordersError } = useOrders();
  const { data: apiProducts, isLoading: productsLoading } = useProducts();
  const { data: apiInventory, isLoading: inventoryLoading } = useInventory();

  const isLoading = ordersLoading || productsLoading || inventoryLoading;

  // ✅ Create product lookup for names
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

  // ✅ Calculate stats from API data
  const stats = useMemo(() => {
    if (!apiOrders || !apiInventory || !apiProducts) {
      return {
        totalRevenue: 0,
        totalOrders: 0,
        pendingOrders: 0,
        totalProducts: 0,
        avgOrderValue: 0,
        ordersThisWeek: 0,
        lowStockCount: 0,
        outOfStockCount: 0,
      };
    }

    // Calculate total revenue from non-cancelled orders
    const validOrders = apiOrders.filter((o: any) =>
        !['CANCELLED', 'cancelled'].includes(o.status)
    );
    const totalRevenue = validOrders.reduce((sum: number, order: any) => sum + (order.totalAmount || 0), 0);
    const totalOrders = apiOrders.length;

    // Pending orders (PENDING status from EC2)
    const pendingOrders = apiOrders.filter((o: any) =>
        ['PENDING', 'pending', 'payment_pending', 'quote_requested', 'quote_sent'].includes(o.status)
    ).length;

    const totalProducts = apiProducts.length;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Orders this week
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const ordersThisWeek = apiOrders.filter((o: any) => {
      const orderDate = new Date(o.createdAt || Date.now());
      return orderDate >= oneWeekAgo;
    }).length;

    // Low stock items (stock <= reorderLevel and stock > 0)
    const lowStockCount = apiInventory.filter((inv: any) =>
        inv.stock > 0 && inv.stock <= inv.reorderLevel
    ).length;

    // Out of stock (stock = 0)
    const outOfStockCount = apiInventory.filter((inv: any) => inv.stock === 0).length;

    return {
      totalRevenue,
      totalOrders,
      pendingOrders,
      totalProducts,
      avgOrderValue,
      ordersThisWeek,
      lowStockCount,
      outOfStockCount,
    };
  }, [apiOrders, apiInventory, apiProducts]);

  // ✅ Orders by status for pie chart
  const orderStatusData = useMemo(() => {
    if (!apiOrders || apiOrders.length === 0) return [];

    const statusCounts: Record<string, number> = {};
    apiOrders.forEach((order: any) => {
      const status = mapApiStatus(order.status || "unknown");
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });

    const statusColors: Record<string, string> = {
      completed: "hsl(142, 76%, 36%)",
      processing: "hsl(221, 83%, 53%)",
      shipped: "hsl(199, 89%, 48%)",
      delivered: "hsl(142, 76%, 36%)",
      quote_requested: "hsl(45, 93%, 47%)",
      quote_sent: "hsl(280, 83%, 53%)",
      confirmed: "hsl(142, 76%, 36%)",
      cancelled: "hsl(0, 84%, 60%)",
      payment_pending: "hsl(45, 93%, 47%)",
      pending: "hsl(45, 93%, 47%)",
    };

    return Object.entries(statusCounts).map(([name, value]) => ({
      name: name.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase()),
      value,
      color: statusColors[name] || "hsl(220, 10%, 50%)",
    }));
  }, [apiOrders]);

  // ✅ Revenue trend (last 6 months) - REAL DATA from orders
  const revenueData = useMemo(() => {
    if (!apiOrders) return [];

    const months = [];
    for (let i = 5; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      const monthStart = startOfMonth(date);
      const monthEnd = endOfMonth(date);

      // Calculate actual revenue for this month
      const monthRevenue = apiOrders
          .filter((order: any) => {
            const orderDate = new Date(order.createdAt || Date.now());
            return isWithinInterval(orderDate, { start: monthStart, end: monthEnd }) &&
                !['CANCELLED', 'cancelled'].includes(order.status);
          })
          .reduce((sum: number, order: any) => sum + (order.totalAmount || 0), 0);

      months.push({
        month: format(date, "MMM"),
        revenue: monthRevenue,
      });
    }
    return months;
  }, [apiOrders]);

  // ✅ Low stock items from API
  const lowStockItems = useMemo(() => {
    if (!apiInventory || !apiProducts) return [];

    return apiInventory
        .filter((inv: any) => inv.stock <= inv.reorderLevel)
        .slice(0, 5)
        .map((inv: any) => {
          const product = (apiProducts as any[]).find((p) => p._id === inv.product);
          return {
            id: inv._id,
            sku: product?.sku || "N/A",
            name: product?.name || "Unknown Product",
            qty: inv.stock,
            reorderLevel: inv.reorderLevel,
            status: inv.stock === 0 ? "critical" : "low",
          };
        });
  }, [apiInventory, apiProducts]);

  // ✅ Recent orders from API with product names
  const recentOrders = useMemo(() => {
    if (!apiOrders) return [];

    return [...(apiOrders as any[])]
        .sort((a, b) => {
          const dateA = new Date(a.createdAt || 0);
          const dateB = new Date(b.createdAt || 0);
          return dateB.getTime() - dateA.getTime();
        })
        .slice(0, 5)
        .map((order) => {
          // Get first product name from order
          const firstProduct = order.products?.[0];
          const productInfo = firstProduct ? productLookup[firstProduct.productId] : null;
          const itemCount = order.products?.length || 0;

          return {
            id: order.orderNumber || order.orderId || `ORD-${order._id?.slice(-6)}`,
            customer: productInfo?.name || `${itemCount} item${itemCount !== 1 ? 's' : ''}`,
            amount: order.totalAmount || 0,
            status: mapApiStatus(order.status || "pending"),
            date: order.createdAt || new Date().toISOString(),
          };
        });
  }, [apiOrders, productLookup]);

  // ✅ Recent activity from orders
  const recentActivity = useMemo(() => {
    if (!apiOrders) return [];

    const activities: Array<{
      id: number;
      type: string;
      icon: any;
      text: string;
      time: string;
      color: string;
    }> = [];

    [...(apiOrders as any[])]
        .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
        .slice(0, 5)
        .forEach((order, index) => {
          const orderNumber = order.orderNumber || order.orderId || `ORD-${order._id?.slice(-6)}`;
          const status = mapApiStatus(order.status);
          const itemCount = order.products?.length || 0;

          activities.push({
            id: index + 1,
            type: "order",
            icon: ShoppingCart,
            text: `Order ${orderNumber} - ${itemCount} item${itemCount !== 1 ? 's' : ''} (${status.replace("_", " ")})`,
            time: format(new Date(order.createdAt || Date.now()), "MMM d, yyyy"),
            color: "text-primary",
          });
        });

    return activities;
  }, [apiOrders]);

  const topStatsCards = [
    {
      title: "Total Revenue",
      value: formatCurrency(stats.totalRevenue),
      icon: IndianRupee,
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
      title: "Total Orders",
      value: stats.totalOrders.toLocaleString(),
      icon: ShoppingCart,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Pending Orders",
      value: stats.pendingOrders.toString(),
      icon: Clock,
      color: "text-warning",
      bgColor: "bg-warning/10",
    },
    {
      title: "Total Products",
      value: stats.totalProducts.toString(),
      icon: Package,
      color: "text-info",
      bgColor: "bg-info/10",
    },
  ];

  const quickStatsCards = [
    {
      title: "Average Order Value",
      value: formatCurrency(stats.avgOrderValue),
      icon: IndianRupee,
    },
    {
      title: "Orders This Week",
      value: stats.ordersThisWeek.toString(),
      icon: Package,
    },
    {
      title: "Low Stock Items",
      value: stats.lowStockCount.toString(),
      icon: AlertTriangle,
    },
    {
      title: "Out of Stock",
      value: stats.outOfStockCount.toString(),
      icon: AlertCircle,
    },
  ];

  // Loading state
  if (isLoading) {
    return (
        <DashboardLayout>
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">Loading dashboard...</span>
          </div>
        </DashboardLayout>
    );
  }

  // Error state
  if (ordersError) {
    return (
        <DashboardLayout>
          <div className="flex flex-col items-center justify-center h-64 text-destructive">
            <AlertCircle className="h-12 w-12 mb-4" />
            <p className="text-lg font-medium">Failed to load dashboard data</p>
            <p className="text-sm text-muted-foreground mt-2">Please check your connection and try again</p>
            <Button onClick={() => window.location.reload()} className="mt-4">
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </div>
        </DashboardLayout>
    );
  }

  return (
      <DashboardLayout>
        <div className="space-y-4 animate-fade-in">
          {/* Header */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
              <p className="text-muted-foreground">Welcome back! Here's your business overview.</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
            </div>
          </div>

          {/* Top Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {topStatsCards.map((stat) => (
                <Card key={stat.title} className="border-border/50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground">{stat.title}</p>
                        <p className="text-xl font-bold mt-1">{stat.value}</p>
                      </div>
                      <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                        <stat.icon className={`h-5 w-5 ${stat.color}`} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
            ))}
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {quickStatsCards.map((stat) => (
                <Card key={stat.title} className="border-border/50">
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-muted">
                      <stat.icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{stat.title}</p>
                      <p className="text-lg font-semibold">{stat.value}</p>
                    </div>
                  </CardContent>
                </Card>
            ))}
          </div>

          {/* Charts Row */}
          <div className="grid lg:grid-cols-2 gap-4">
            {/* Revenue Trend */}
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Revenue Trend (Last 6 Months)</CardTitle>
              </CardHeader>
              <CardContent>
                {revenueData.some(d => d.revenue > 0) ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={revenueData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                        <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => formatCompact(v)} />
                        <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))" }} />
                        <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                      </LineChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                      No revenue data available yet
                    </div>
                )}
              </CardContent>
            </Card>

            {/* Orders by Status */}
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Orders by Status</CardTitle>
              </CardHeader>
              <CardContent>
                {orderStatusData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie data={orderStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                          {orderStatusData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))" }} />
                        <Legend verticalAlign="bottom" height={36} />
                      </PieChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                      No orders data available yet
                    </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Two Column Section */}
          <div className="grid lg:grid-cols-2 gap-4">
            {/* Left Column */}
            <div className="space-y-4">
              {/* Low Stock Alerts */}
              <Card className="border-border/50 border-warning/30">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-warning" />
                    Low Stock Alerts
                  </CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => navigate("/inventory")} className="text-xs">
                    View All <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>SKU</TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lowStockItems.length > 0 ? (
                          lowStockItems.map((item) => (
                              <TableRow
                                  key={item.id}
                                  className="cursor-pointer hover:bg-muted/50"
                                  onClick={() => navigate("/inventory")}
                              >
                                <TableCell className="font-mono text-xs">{item.sku}</TableCell>
                                <TableCell className="max-w-[150px] truncate">{item.name}</TableCell>
                                <TableCell className="text-right">{item.qty}</TableCell>
                                <TableCell>
                                  <Badge
                                      className={
                                        item.status === "critical"
                                            ? "bg-destructive text-destructive-foreground"
                                            : "bg-warning text-warning-foreground"
                                      }
                                  >
                                    {item.status === "critical" ? "Critical" : "Low"}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                          ))
                      ) : (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                              <PackageCheck className="h-8 w-8 mx-auto mb-2 text-success" />
                              All stock levels are healthy
                            </TableCell>
                          </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Recent Activity */}
              <Card className="border-border/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-[280px] overflow-y-auto scrollbar-thin">
                    {recentActivity.length > 0 ? (
                        recentActivity.map((activity) => (
                            <div key={activity.id} className="flex gap-3 pb-3 border-b border-border/50 last:border-0">
                              <div className={`mt-0.5 ${activity.color}`}>
                                <activity.icon className="h-4 w-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm leading-tight">{activity.text}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">{activity.time}</p>
                              </div>
                            </div>
                        ))
                    ) : (
                        <p className="text-center text-muted-foreground py-8">No recent activity</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              {/* Recent Orders */}
              <Card className="border-border/50">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-base">Recent Orders</CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => navigate("/orders")} className="text-xs">
                    View All <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order</TableHead>
                        <TableHead>Items</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentOrders.length > 0 ? (
                          recentOrders.map((order) => (
                              <TableRow
                                  key={order.id}
                                  className="cursor-pointer hover:bg-muted/50"
                                  onClick={() => navigate(`/orders`)}
                              >
                                <TableCell className="font-mono text-xs">{order.id}</TableCell>
                                <TableCell className="max-w-[120px] truncate">{order.customer}</TableCell>
                                <TableCell className="text-right">{formatCurrency(order.amount)}</TableCell>
                                <TableCell>
                                  <Badge className={getStatusColor(order.status)}>
                                    {order.status.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                          ))
                      ) : (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                              No orders yet
                            </TableCell>
                          </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Inventory Summary */}
              <Card className="border-border/50">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-base">Inventory Summary</CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => navigate("/inventory")} className="text-xs">
                    View All <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-success/10">
                          <Package className="h-4 w-4 text-success" />
                        </div>
                        <span className="text-sm">In Stock</span>
                      </div>
                      <span className="font-semibold">
                        {apiInventory ? apiInventory.filter((inv: any) => inv.stock > inv.reorderLevel).length : 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-warning/10">
                          <AlertTriangle className="h-4 w-4 text-warning" />
                        </div>
                        <span className="text-sm">Low Stock</span>
                      </div>
                      <span className="font-semibold">{stats.lowStockCount}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-destructive/10">
                          <AlertCircle className="h-4 w-4 text-destructive" />
                        </div>
                        <span className="text-sm">Out of Stock</span>
                      </div>
                      <span className="font-semibold">{stats.outOfStockCount}</span>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t">
                      <span className="text-sm font-medium">Total Products</span>
                      <span className="font-semibold">{stats.totalProducts}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </DashboardLayout>
  );
};

export default Dashboard;
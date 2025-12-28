import { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Edit,
  Building2,
  Phone,
  Mail,
  MapPin,
  Calendar,
  CreditCard,
  FileText,
  ShoppingCart,
  Loader2,
  Ban,
  CheckCircle,
  Landmark,
  Globe,
  User,
  Truck,
  Star,
  ExternalLink,
  Package
} from 'lucide-react';
import { format } from 'date-fns';
import { DashboardLayout } from '@/components/layout/DashboardLayout.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.tsx';
import { Badge } from '@/components/ui/badge.tsx';
import { Separator } from '@/components/ui/separator.tsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.tsx';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table.tsx';
import { usePermissions } from '@/hooks/usePermissions.ts';
import { toast } from 'sonner';

// Import API hooks and types
import { useCustomers, useUpdateCustomer, useOrders } from '@/hooks/useApi';
import type { ApiCustomer } from '@/api/customers.api';

// Import existing dialogs
import AddCustomerDialog from '@/components/customers/AddCustomerDialog.tsx';
import BlockCustomerDialog from '@/components/customers/BlockCustomerDialog.tsx';
import { Customer, BUSINESS_TYPES } from '@/types/customer';

// Status badge component
const StatusBadge = ({ status }: { status: string }) => {
  const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    active: { label: 'Active', variant: 'default' },
    pending_verification: { label: 'Pending Verification', variant: 'secondary' },
    blocked: { label: 'Blocked', variant: 'destructive' },
    inactive: { label: 'Inactive', variant: 'outline' },
  };

  const config = statusConfig[status] || { label: status, variant: 'outline' };

  return <Badge variant={config.variant}>{config.label}</Badge>;
};

// Order Status Badge
const OrderStatusBadge = ({ status }: { status: string }) => {
  const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    PENDING: { label: 'Pending', variant: 'secondary' },
    CONFIRMED: { label: 'Confirmed', variant: 'default' },
    PROCESSING: { label: 'Processing', variant: 'outline' },
    SHIPPED: { label: 'Shipped', variant: 'outline' },
    DELIVERED: { label: 'Delivered', variant: 'default' },
    CANCELLED: { label: 'Cancelled', variant: 'destructive' },
  };

  const config = statusConfig[status?.toUpperCase()] || { label: status, variant: 'outline' };

  return <Badge variant={config.variant}>{config.label}</Badge>;
};

// Convert ApiCustomer to Customer type for dialogs
const apiToCustomerType = (api: ApiCustomer): Customer => ({
  id: api._id,
  businessName: api.businessName,
  businessType: (api.businessType || 'other') as Customer['businessType'],
  gstNumber: api.gstNumber || '',
  panNumber: api.panNumber || '',
  contactPerson: api.contactPerson,
  designation: api.designation,
  primaryPhone: api.primaryPhone,
  secondaryPhone: api.secondaryPhone,
  email: api.email,
  website: api.website,
  billingAddress: {
    label: api.billingAddress?.label || 'Billing',
    street: api.billingAddress?.street || '',
    city: api.billingAddress?.city || '',
    state: api.billingAddress?.state || '',
    pinCode: api.billingAddress?.pinCode || '',
  },
  deliveryAddresses: api.deliveryAddresses?.map(addr => ({
    label: addr.label || 'Shipping',
    street: addr.street || '',
    city: addr.city || '',
    state: addr.state || '',
    pinCode: addr.pinCode || '',
    contactPerson: addr.contactPerson,
    contactPhone: addr.contactPhone,
  })) || [],
  bankDetails: api.bankDetails,
  companyContactDetails: api.companyContactDetails,
  creditLimit: api.creditLimit || 0,
  paymentTerms: (api.paymentTerms || 'net_30') as Customer['paymentTerms'],
  preferredPaymentMethod: (api.preferredPaymentMethod || 'bank_transfer') as Customer['preferredPaymentMethod'],
  documents: [],
  totalOrders: api.totalOrders || 0,
  totalBusinessValue: api.totalBusinessValue || 0,
  outstandingAmount: api.outstandingAmount || 0,
  status: (api.status || 'active') as Customer['status'],
  registeredAt: api.registeredAt || new Date().toISOString(),
});

export default function CustomerDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { canEdit } = usePermissions();

  // State for dialogs
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);

  // Fetch from backend API
  const { data: customers, isLoading, error, refetch } = useCustomers();
  const { data: allOrders, isLoading: ordersLoading } = useOrders();
  const updateCustomerMutation = useUpdateCustomer();

  // Find customer by ID
  const customer = useMemo((): ApiCustomer | undefined => {
    if (!customers || !id) return undefined;
    return (customers as ApiCustomer[]).find((c) => c._id === id || c.id === id);
  }, [customers, id]);

  // Filter orders for this customer
  const customerOrders = useMemo(() => {
    if (!allOrders || !customer) return [];
    return (allOrders as any[]).filter(order => order.customerId === customer._id);
  }, [allOrders, customer]);

  // Calculate order stats
  const orderStats = useMemo(() => {
    if (!customerOrders.length) return { count: 0, totalValue: 0 };
    const totalValue = customerOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
    return { count: customerOrders.length, totalValue };
  }, [customerOrders]);

  // Convert for dialog compatibility
  const customerForDialog = useMemo((): Customer | null => {
    if (!customer) return null;
    return apiToCustomerType(customer);
  }, [customer]);

  // Handle save from edit dialog
  const handleSaveCustomer = async (customerData: Partial<Customer>) => {
    if (!customer) return;

    try {
      await updateCustomerMutation.mutateAsync({
        id: customer._id,
        data: customerData as any
      });
      toast.success('Customer updated successfully');
      setEditDialogOpen(false);
      refetch();
    } catch (err) {
      toast.error('Failed to update customer');
    }
  };

  // Handle block/unblock
  const handleBlockCustomer = async (reason: string) => {
    if (!customer) return;

    const newBlocked = customer.status !== 'blocked';
    try {
      await updateCustomerMutation.mutateAsync({
        id: customer._id,
        data: {
          blocked: newBlocked,
          status: newBlocked ? 'blocked' : 'active',
          blockedReason: newBlocked ? reason : undefined
        } as any
      });
      toast.success(newBlocked ? 'Customer blocked' : 'Customer unblocked');
      setBlockDialogOpen(false);
      refetch();
    } catch (err) {
      toast.error('Failed to update customer status');
    }
  };

  // Loading state
  if (isLoading) {
    return (
        <DashboardLayout>
          <div className="flex items-center justify-center h-[50vh] gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span>Loading customer...</span>
          </div>
        </DashboardLayout>
    );
  }

  // Error state
  if (error) {
    return (
        <DashboardLayout>
          <div className="flex flex-col items-center justify-center h-[50vh] gap-4 text-destructive">
            <p>Failed to load customer</p>
            <p className="text-sm">{(error as Error)?.message}</p>
            <Button onClick={() => navigate('/customers')}>Back to Customers</Button>
          </div>
        </DashboardLayout>
    );
  }

  // Not found state
  if (!customer) {
    return (
        <DashboardLayout>
          <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
            <Building2 className="h-16 w-16 text-muted-foreground" />
            <h2 className="text-xl font-semibold">Customer not found</h2>
            <Button onClick={() => navigate('/customers')}>Back to Customers</Button>
          </div>
        </DashboardLayout>
    );
  }

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Mask account number for display
  const maskAccountNumber = (accNum?: string) => {
    if (!accNum || accNum.length < 4) return accNum || 'N/A';
    return '****' + accNum.slice(-4);
  };

  // Get address street (handles both field names)
  const getStreet = (addr?: { street?: string; streetAddress?: string }) => {
    return addr?.street || addr?.streetAddress || 'N/A';
  };

  return (
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate('/customers')}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold">{customer.businessName || 'Unknown Company'}</h1>
                  <StatusBadge status={customer.status} />
                </div>
                <p className="text-muted-foreground">
                  {customer.contactPerson} {customer.designation && `• ${customer.designation}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {canEdit('customers') && (
                  <>
                    <Button variant="outline" onClick={() => setEditDialogOpen(true)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                    <Button
                        variant={customer.status === 'blocked' ? 'default' : 'destructive'}
                        onClick={() => setBlockDialogOpen(true)}
                    >
                      {customer.status === 'blocked' ? (
                          <>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Unblock
                          </>
                      ) : (
                          <>
                            <Ban className="h-4 w-4 mr-2" />
                            Block
                          </>
                      )}
                    </Button>
                  </>
              )}
            </div>
          </div>

          {/* Quick Stats - Updated with real order data */}
          <div className="grid md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <ShoppingCart className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Orders</p>
                    <p className="text-2xl font-bold">{orderStats.count}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <CreditCard className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Business</p>
                    <p className="text-2xl font-bold">{formatCurrency(orderStats.totalValue)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <FileText className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Outstanding</p>
                    <p className="text-2xl font-bold">{formatCurrency(customer.outstandingAmount || 0)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Calendar className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Credit Limit</p>
                    <p className="text-2xl font-bold">{formatCurrency(customer.creditLimit || 0)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="details" className="space-y-4">
            <TabsList>
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="addresses">Addresses</TabsTrigger>
              <TabsTrigger value="bank">Bank Details</TabsTrigger>
              <TabsTrigger value="orders" className="flex items-center gap-2">
                Orders
                {orderStats.count > 0 && (
                    <Badge variant="secondary" className="ml-1">{orderStats.count}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
            </TabsList>

            {/* DETAILS TAB */}
            <TabsContent value="details" className="space-y-6">
              <div className="grid lg:grid-cols-2 gap-6">
                {/* Business Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="h-5 w-5" />
                      Business Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Company Name</p>
                        <p className="font-medium">{customer.businessName || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Business Type</p>
                        <p className="font-medium">{BUSINESS_TYPES[customer.businessType as keyof typeof BUSINESS_TYPES] || customer.businessType || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">GST Number</p>
                        <p className="font-mono text-sm">{customer.gstNumber || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">PAN Number</p>
                        <p className="font-mono text-sm">{customer.panNumber || 'N/A'}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Contact Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Contact Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Contact Person</p>
                      <p className="font-medium">{customer.contactPerson || 'N/A'}</p>
                      {customer.designation && (
                          <p className="text-sm text-muted-foreground">{customer.designation}</p>
                      )}
                    </div>
                    <Separator />
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{customer.primaryPhone || 'N/A'}</span>
                      </div>
                      {customer.secondaryPhone && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <span>{customer.secondaryPhone}</span>
                            <Badge variant="outline" className="text-xs">Company</Badge>
                          </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span>{customer.email || 'N/A'}</span>
                      </div>
                      {customer.website && (
                          <div className="flex items-center gap-2">
                            <Globe className="h-4 w-4 text-muted-foreground" />
                            <a href={customer.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                              {customer.website}
                            </a>
                          </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Company Contact Details */}
                {customer.companyContactDetails && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Building2 className="h-5 w-5" />
                          Company Contact Details
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span>{customer.companyContactDetails.phoneNumber || 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span>{customer.companyContactDetails.email || 'N/A'}</span>
                        </div>
                        {customer.companyContactDetails.website && (
                            <div className="flex items-center gap-2">
                              <Globe className="h-4 w-4 text-muted-foreground" />
                              <a href={customer.companyContactDetails.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                                {customer.companyContactDetails.website}
                              </a>
                            </div>
                        )}
                      </CardContent>
                    </Card>
                )}

                {/* Credit & Payment */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5" />
                      Credit & Payment
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Credit Limit</p>
                        <p className="font-medium">{formatCurrency(customer.creditLimit || 0)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Payment Terms</p>
                        <p className="font-medium capitalize">{customer.paymentTerms?.replace('_', ' ') || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Preferred Payment</p>
                        <p className="font-medium capitalize">{customer.preferredPaymentMethod?.replace('_', ' ') || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Outstanding Amount</p>
                        <p className="font-medium text-orange-600">{formatCurrency(customer.outstandingAmount || 0)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Timeline */}
              <Card>
                <CardHeader>
                  <CardTitle>Timeline</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Registered</p>
                        <p className="font-medium">
                          {customer.registeredAt
                              ? format(new Date(customer.registeredAt), 'MMM d, yyyy')
                              : 'N/A'}
                        </p>
                      </div>
                    </div>
                    <Separator orientation="vertical" className="h-10" />
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Last Order</p>
                        <p className="font-medium">
                          {customerOrders.length > 0
                              ? format(new Date(customerOrders[customerOrders.length - 1].createdAt), 'MMM d, yyyy')
                              : 'No orders yet'}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ADDRESSES TAB */}
            <TabsContent value="addresses" className="space-y-6">
              <div className="grid lg:grid-cols-2 gap-6">
                {/* Billing Address */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="h-5 w-5" />
                      Billing Address
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {customer.billingAddress?.city ? (
                        <div className="flex items-start gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
                          <div>
                            <p>{getStreet(customer.billingAddress)}</p>
                            <p>{customer.billingAddress.city}, {customer.billingAddress.state}</p>
                            <p>{customer.billingAddress.pinCode}</p>
                          </div>
                        </div>
                    ) : (
                        <p className="text-muted-foreground">No billing address on file</p>
                    )}
                  </CardContent>
                </Card>

                {/* Shipping Addresses */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Truck className="h-5 w-5" />
                      Shipping Addresses
                      <Badge variant="secondary" className="ml-2">
                        {customer.deliveryAddresses?.length || 0}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {customer.deliveryAddresses && customer.deliveryAddresses.length > 0 ? (
                        <div className="space-y-4">
                          {customer.deliveryAddresses.map((addr, index) => (
                              <div key={addr._id || index} className="p-3 border rounded-lg">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="font-medium">{addr.label || `Address ${index + 1}`}</span>
                                  {addr.isDefault && (
                                      <Badge variant="default" className="text-xs">
                                        <Star className="h-3 w-3 mr-1" />
                                        Default
                                      </Badge>
                                  )}
                                </div>
                                <div className="flex items-start gap-2 text-sm">
                                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                                  <div>
                                    <p>{getStreet(addr)}</p>
                                    <p>{addr.city}, {addr.state} - {addr.pinCode}</p>
                                    {addr.contactPerson && (
                                        <p className="text-muted-foreground mt-1">
                                          Contact: {addr.contactPerson} {addr.contactPhone && `(${addr.contactPhone})`}
                                        </p>
                                    )}
                                  </div>
                                </div>
                              </div>
                          ))}
                        </div>
                    ) : (
                        <p className="text-muted-foreground">No shipping addresses on file</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* BANK DETAILS TAB */}
            <TabsContent value="bank" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Landmark className="h-5 w-5" />
                    Bank Account Details
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {customer.bankDetails ? (
                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <div>
                            <p className="text-sm text-muted-foreground">Account Holder Name</p>
                            <p className="font-medium">{customer.bankDetails.accountHolderName || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Bank Name</p>
                            <p className="font-medium">{customer.bankDetails.bankName || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Account Number</p>
                            <p className="font-mono">{maskAccountNumber(customer.bankDetails.accountNumber)}</p>
                          </div>
                        </div>
                        <div className="space-y-4">
                          <div>
                            <p className="text-sm text-muted-foreground">IFSC Code</p>
                            <p className="font-mono">{customer.bankDetails.ifscCode || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">UPI ID</p>
                            <p className="font-mono">{customer.bankDetails.upiId || 'N/A'}</p>
                          </div>
                        </div>
                      </div>
                  ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Landmark className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No bank details on file</p>
                      </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ============================================================= */}
            {/* ORDERS TAB - NOW WITH REAL DATA! */}
            {/* ============================================================= */}
            <TabsContent value="orders">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <ShoppingCart className="h-5 w-5" />
                    Order History
                  </span>
                    {orderStats.count > 0 && (
                        <span className="text-sm font-normal text-muted-foreground">
                      {orderStats.count} order{orderStats.count !== 1 ? 's' : ''} • Total: {formatCurrency(orderStats.totalValue)}
                    </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {ordersLoading ? (
                      <div className="flex items-center justify-center py-8 gap-2">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>Loading orders...</span>
                      </div>
                  ) : customerOrders.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Order ID</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Items</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {customerOrders.map((order) => (
                              <TableRow key={order._id}>
                                <TableCell className="font-mono font-medium">
                                  {order.orderId}
                                </TableCell>
                                <TableCell>
                                  {order.createdAt
                                      ? format(new Date(order.createdAt), 'MMM d, yyyy')
                                      : 'N/A'}
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1">
                                    <Package className="h-4 w-4 text-muted-foreground" />
                                    {order.products?.length || 0} item{(order.products?.length || 0) !== 1 ? 's' : ''}
                                  </div>
                                </TableCell>
                                <TableCell className="font-medium">
                                  {formatCurrency(order.totalAmount || 0)}
                                </TableCell>
                                <TableCell>
                                  <OrderStatusBadge status={order.status} />
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => navigate(`/orders/${order._id}`)}
                                  >
                                    <ExternalLink className="h-4 w-4 mr-1" />
                                    View
                                  </Button>
                                </TableCell>
                              </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                  ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No orders found for this customer</p>
                        <p className="text-sm mt-2">Orders placed by this customer will appear here</p>
                      </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ACTIVITY TAB */}
            <TabsContent value="activity">
              <Card>
                <CardHeader>
                  <CardTitle>Activity Log</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No activity recorded yet</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Edit Customer Dialog */}
        {customerForDialog && (
            <AddCustomerDialog
                open={editDialogOpen}
                onOpenChange={setEditDialogOpen}
                customer={customerForDialog}
                onSave={handleSaveCustomer}
            />
        )}

        {/* Block Customer Dialog */}
        {customerForDialog && (
            <BlockCustomerDialog
                open={blockDialogOpen}
                onOpenChange={setBlockDialogOpen}
                customer={customerForDialog}
                onConfirm={handleBlockCustomer}
            />
        )}
      </DashboardLayout>
  );
}
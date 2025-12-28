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
  Banknote,
  Power
} from 'lucide-react';
import { format } from 'date-fns';
import { DashboardLayout } from '@/components/layout/DashboardLayout.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.tsx';
import { Badge } from '@/components/ui/badge.tsx';
import { Separator } from '@/components/ui/separator.tsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.tsx';
import { usePermissions } from '@/hooks/usePermissions.ts';
import { toast } from 'sonner';

// ✅ Import API hooks and types
import { useSuppliers, useUpdateSupplier } from '@/hooks/useApi';
import type { ApiSupplier } from '@/api/suppliers.api';

// ✅ Import existing dialog components
import { AddSupplierDialog } from '@/components/suppliers/AddSupplierDialog.tsx';
import { BlacklistDialog } from '@/components/suppliers/BlacklistDialog.tsx';
import { SupplierStatusBadge } from '@/components/suppliers/SupplierStatusBadge.tsx';
import { Supplier, PAYMENT_TERMS_CONFIG } from '@/types/supplier';

// ✅ Convert ApiSupplier to Supplier type for the dialog
const apiSupplierToSupplier = (apiSupplier: ApiSupplier): Supplier => {
  return {
    id: apiSupplier.id || apiSupplier._id,
    companyName: apiSupplier.companyName,
    gstNumber: apiSupplier.gstNumber || '',
    panNumber: apiSupplier.panNumber || '',
    contactPerson: apiSupplier.contactPerson,
    phone: apiSupplier.phone,
    email: apiSupplier.email,
    address: {
      street: apiSupplier.address?.street || '',
      city: apiSupplier.address?.city || '',
      state: apiSupplier.address?.state || '',
      pinCode: apiSupplier.address?.pinCode || '',
    },
    productCategories: apiSupplier.productCategories || [],
    paymentTerms: (apiSupplier.paymentTerms || 'net_30') as Supplier['paymentTerms'],
    bankDetails: {
      accountName: apiSupplier.bankDetails?.accountName || '',
      accountNumber: apiSupplier.bankDetails?.accountNumber || '',
      ifscCode: apiSupplier.bankDetails?.ifscCode || '',
      bankName: apiSupplier.bankDetails?.bankName || '',
    },
    documents: [],
    status: apiSupplier.status as Supplier['status'],
    registrationDate: apiSupplier.registrationDate || new Date().toISOString(),
    notes: apiSupplier.notes || '',
    activities: apiSupplier.activities || [],
    orders: apiSupplier.orders || [],
  };
};

export default function SupplierDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { canEdit } = usePermissions();

  // ✅ State for dialogs
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [blacklistDialogOpen, setBlacklistDialogOpen] = useState(false);

  // ✅ Fetch from backend API
  const { data: apiSuppliers, isLoading, error, refetch } = useSuppliers();
  const updateSupplierMutation = useUpdateSupplier();

  // ✅ Find supplier from API data by ID
  const apiSupplier = useMemo((): ApiSupplier | undefined => {
    if (!apiSuppliers || !id) return undefined;
    return (apiSuppliers as ApiSupplier[]).find((s) => s._id === id || s.id === id);
  }, [apiSuppliers, id]);

  // ✅ Convert to Supplier type for dialog
  const supplier = useMemo((): Supplier | null => {
    if (!apiSupplier) return null;
    return apiSupplierToSupplier(apiSupplier);
  }, [apiSupplier]);

  // ✅ Handle save from edit dialog
  const handleSaveSupplier = async (supplierData: Partial<Supplier>) => {
    if (!apiSupplier) return;

    try {
      await updateSupplierMutation.mutateAsync({
        id: apiSupplier._id,
        data: supplierData as Partial<ApiSupplier>
      });
      toast.success('Supplier updated successfully');
      setEditDialogOpen(false);
      refetch();
    } catch (err) {
      toast.error('Failed to update supplier');
    }
  };

  // ✅ Handle blacklist
  const handleBlacklist = async (reason: string) => {
    if (!apiSupplier) return;

    try {
      await updateSupplierMutation.mutateAsync({
        id: apiSupplier._id,
        data: {
          status: 'blacklisted',
          notes: reason
        }
      });
      toast.success('Supplier blacklisted');
      setBlacklistDialogOpen(false);
      refetch();
    } catch (err) {
      toast.error('Failed to blacklist supplier');
    }
  };

  // ✅ Handle status changes (approve, deactivate, reactivate)
  const handleStatusChange = async (newStatus: string) => {
    if (!apiSupplier) return;

    try {
      await updateSupplierMutation.mutateAsync({
        id: apiSupplier._id,
        data: { status: newStatus }
      });

      const messages: Record<string, string> = {
        active: 'Supplier approved',
        inactive: 'Supplier deactivated',
      };
      toast.success(messages[newStatus] || 'Status updated');
      refetch();
    } catch (err) {
      toast.error('Failed to update supplier status');
    }
  };

  // ✅ Loading state
  if (isLoading) {
    return (
        <DashboardLayout>
          <div className="flex items-center justify-center h-[50vh] gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span>Loading supplier...</span>
          </div>
        </DashboardLayout>
    );
  }

  // ✅ Error state
  if (error) {
    return (
        <DashboardLayout>
          <div className="flex flex-col items-center justify-center h-[50vh] gap-4 text-destructive">
            <p>Failed to load supplier</p>
            <p className="text-sm">{(error as Error)?.message}</p>
            <Button onClick={() => navigate('/suppliers')}>Back to Suppliers</Button>
          </div>
        </DashboardLayout>
    );
  }

  // ✅ Not found state
  if (!apiSupplier || !supplier) {
    return (
        <DashboardLayout>
          <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
            <Building2 className="h-16 w-16 text-muted-foreground" />
            <h2 className="text-xl font-semibold">Supplier not found</h2>
            <Button onClick={() => navigate('/suppliers')}>Back to Suppliers</Button>
          </div>
        </DashboardLayout>
    );
  }

  return (
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/suppliers')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">{supplier.companyName}</h1>
                <SupplierStatusBadge status={supplier.status} />
              </div>
              <p className="text-muted-foreground">{supplier.id}</p>
            </div>
            <div className="flex gap-2">
              {canEdit('suppliers') && (
                  <Button variant="outline" onClick={() => setEditDialogOpen(true)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
              )}
              {supplier.status === 'pending_approval' && (
                  <Button
                      variant="outline"
                      className="text-green-600"
                      onClick={() => handleStatusChange('active')}
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Approve
                  </Button>
              )}
              {supplier.status === 'active' && (
                  <>
                    <Button
                        variant="outline"
                        onClick={() => handleStatusChange('inactive')}
                    >
                      <Power className="mr-2 h-4 w-4" />
                      Deactivate
                    </Button>
                    <Button
                        variant="outline"
                        className="text-destructive"
                        onClick={() => setBlacklistDialogOpen(true)}
                    >
                      <Ban className="mr-2 h-4 w-4" />
                      Blacklist
                    </Button>
                  </>
              )}
              {(supplier.status === 'inactive' || supplier.status === 'blacklisted') && (
                  <Button
                      variant="outline"
                      className="text-green-600"
                      onClick={() => handleStatusChange('active')}
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Reactivate
                  </Button>
              )}
            </div>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="details" className="space-y-4">
            <TabsList>
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="bank">Bank Details</TabsTrigger>
              <TabsTrigger value="orders">Orders</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-6">
              <div className="grid lg:grid-cols-2 gap-6">
                {/* Company Information */}
                <Card>
                  <CardHeader>
                    <CardTitle>Company Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Company Name</p>
                        <p className="font-medium">{supplier.companyName}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Supplier ID</p>
                        <p className="font-mono text-sm">{supplier.id}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">GST Number</p>
                        <p className="font-mono text-sm">{supplier.gstNumber || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">PAN Number</p>
                        <p className="font-mono text-sm">{supplier.panNumber || 'N/A'}</p>
                      </div>
                    </div>
                    <Separator />
                    <div>
                      <p className="text-sm text-muted-foreground">Product Categories</p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {supplier.productCategories && supplier.productCategories.length > 0 ? (
                            supplier.productCategories.map((category: string) => (
                                <Badge key={category} variant="secondary">
                                  {category}
                                </Badge>
                            ))
                        ) : (
                            <span className="text-muted-foreground">No categories specified</span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Contact Information */}
                <Card>
                  <CardHeader>
                    <CardTitle>Contact Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Contact Person</p>
                      <p className="font-medium">{supplier.contactPerson}</p>
                    </div>
                    <Separator />
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{supplier.phone}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span>{supplier.email}</span>
                      </div>
                    </div>
                    <Separator />
                    {supplier.address && (
                        <div className="flex items-start gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
                          <div>
                            <p>{supplier.address.street}</p>
                            <p>{supplier.address.city}, {supplier.address.state}</p>
                            <p>{supplier.address.pinCode}</p>
                          </div>
                        </div>
                    )}
                  </CardContent>
                </Card>

                {/* Payment Terms */}
                <Card>
                  <CardHeader>
                    <CardTitle>Payment Terms</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-primary/10 rounded-lg">
                        <Banknote className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Payment Terms</p>
                        <p className="font-medium">
                          {PAYMENT_TERMS_CONFIG[supplier.paymentTerms] || supplier.paymentTerms}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Registration Info */}
                <Card>
                  <CardHeader>
                    <CardTitle>Registration Info</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-blue-500/10 rounded-lg">
                        <Calendar className="h-6 w-6 text-blue-500" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Registration Date</p>
                        <p className="font-medium">
                          {supplier.registrationDate
                              ? format(new Date(supplier.registrationDate), 'MMM d, yyyy')
                              : 'N/A'}
                        </p>
                      </div>
                    </div>
                    {supplier.notes && (
                        <div className="mt-4 p-3 bg-muted rounded-lg">
                          <p className="text-sm text-muted-foreground">Notes</p>
                          <p className="text-sm mt-1">{supplier.notes}</p>
                        </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="bank">
              <Card>
                <CardHeader>
                  <CardTitle>Bank Details</CardTitle>
                </CardHeader>
                <CardContent>
                  {supplier.bankDetails && supplier.bankDetails.accountNumber ? (
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Account Name</p>
                          <p className="font-medium">{supplier.bankDetails.accountName}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Bank Name</p>
                          <p className="font-medium">{supplier.bankDetails.bankName}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Account Number</p>
                          <p className="font-mono">{supplier.bankDetails.accountNumber}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">IFSC Code</p>
                          <p className="font-mono">{supplier.bankDetails.ifscCode}</p>
                        </div>
                      </div>
                  ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No bank details on file</p>
                      </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="orders">
              <Card>
                <CardHeader>
                  <CardTitle>Order History</CardTitle>
                </CardHeader>
                <CardContent>
                  {supplier.orders && supplier.orders.length > 0 ? (
                      <div className="space-y-4">
                        {supplier.orders.map((order) => (
                            <div key={order.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                              <div>
                                <p className="font-medium">{order.id}</p>
                                <p className="text-sm text-muted-foreground">
                                  {format(new Date(order.date), 'MMM d, yyyy')}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-medium">₹{order.amount.toLocaleString()}</p>
                                <Badge variant="outline">{order.status}</Badge>
                              </div>
                            </div>
                        ))}
                      </div>
                  ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No orders found for this supplier</p>
                      </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="documents">
              <Card>
                <CardHeader>
                  <CardTitle>Documents</CardTitle>
                </CardHeader>
                <CardContent>
                  {supplier.documents && supplier.documents.length > 0 ? (
                      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {supplier.documents.map((doc, index) => (
                            <div key={index} className="p-4 border rounded-lg">
                              <FileText className="h-8 w-8 text-muted-foreground mb-2" />
                              <p className="text-sm font-medium">{doc.name}</p>
                              <p className="text-xs text-muted-foreground">{doc.type}</p>
                            </div>
                        ))}
                      </div>
                  ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No documents uploaded yet</p>
                      </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="activity">
              <Card>
                <CardHeader>
                  <CardTitle>Activity Log</CardTitle>
                </CardHeader>
                <CardContent>
                  {supplier.activities && supplier.activities.length > 0 ? (
                      <div className="space-y-4">
                        {supplier.activities.map((activity) => (
                            <div key={activity.id} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                              <div className="p-2 bg-background rounded-full">
                                <FileText className="h-4 w-4 text-muted-foreground" />
                              </div>
                              <div className="flex-1">
                                <p className="font-medium">{activity.description}</p>
                                <p className="text-sm text-muted-foreground">
                                  {activity.user} • {format(new Date(activity.timestamp), 'MMM d, yyyy h:mm a')}
                                </p>
                              </div>
                            </div>
                        ))}
                      </div>
                  ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No activity recorded yet</p>
                      </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* ✅ Edit Supplier Dialog - uses editingSupplier prop */}
        <AddSupplierDialog
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
            editingSupplier={supplier}
            onSave={handleSaveSupplier}
        />

        {/* ✅ Blacklist Dialog */}
        <BlacklistDialog
            open={blacklistDialogOpen}
            onOpenChange={setBlacklistDialogOpen}
            supplier={supplier}
            onConfirm={handleBlacklist}
        />
      </DashboardLayout>
  );
}
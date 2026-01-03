import { useState, useMemo, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout.tsx';
import { SupplierStats } from '@/components/suppliers/SupplierStats.tsx';
import { SupplierFilters } from '@/components/suppliers/SupplierFilters.tsx';
import { SuppliersTable } from '@/components/suppliers/SuppliersTable.tsx';
import { AddSupplierDialog } from '@/components/suppliers/AddSupplierDialog.tsx';
import { BlacklistDialog } from '@/components/suppliers/BlacklistDialog.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Plus, Trash2, Loader2, AlertCircle } from 'lucide-react';
import { Supplier, SupplierStatus } from '@/types/supplier.ts';
import { DateRange } from 'react-day-picker';
import { toast } from '@/hooks/use-toast.ts';
import { isWithinInterval, parseISO } from 'date-fns';
import { usePermissions } from '@/hooks/usePermissions.ts';
import { Alert, AlertDescription } from '@/components/ui/alert.tsx';

// ✅ Import API hooks
import { useSuppliers, useCreateSupplier, useUpdateSupplier } from '@/hooks/useApi';

const Suppliers = () => {
  const { canCreate, canDelete } = usePermissions();

  // ✅ Fetch suppliers from API
  const { data: apiSuppliers, isLoading, error } = useSuppliers();
  const createSupplierMutation = useCreateSupplier();
  const updateSupplierMutation = useUpdateSupplier();

//  Show error toast once when error occurs
  useEffect(() => {
    if (error) {
      const isHtmlError = error?.message?.includes('<!DOCTYPE') || error?.message?.includes('<html');
      const errorMessage = isHtmlError
          ? 'Unable to connect to the server. Please check if the backend is running.'
          : error?.message;

      toast({
        title: 'Failed to load suppliers',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  }, [error]);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<SupplierStatus | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>([]);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [blacklistDialogOpen, setBlacklistDialogOpen] = useState(false);
  const [supplierToBlacklist, setSupplierToBlacklist] = useState<Supplier | null>(null);

  // ✅ Map API suppliers to frontend Supplier type
  const suppliers: Supplier[] = useMemo(() => {
    if (!apiSuppliers) return [];

    return apiSuppliers.map((apiSupplier) => ({
      id: apiSupplier.id || apiSupplier._id,
      companyName: apiSupplier.companyName,
      gstNumber: apiSupplier.gstNumber,
      panNumber: apiSupplier.panNumber,
      contactPerson: apiSupplier.contactPerson,
      phone: apiSupplier.phone,
      email: apiSupplier.email,
      address: apiSupplier.address,
      productCategories: apiSupplier.productCategories || [],
      paymentTerms: apiSupplier.paymentTerms as Supplier['paymentTerms'],
      bankDetails: apiSupplier.bankDetails,
      documents: apiSupplier.documents || [],
      status: apiSupplier.status as SupplierStatus,
      registrationDate: apiSupplier.registrationDate,
      notes: apiSupplier.notes,
      blacklistReason: apiSupplier.blacklistReason,
      activities: apiSupplier.activities || [],
      orders: apiSupplier.orders || [],
    }));
  }, [apiSuppliers]);

  // ✅ Calculate stats from API data
  const stats = useMemo(() => {
    const total = suppliers.length;
    const active = suppliers.filter((s) => s.status === 'active').length;
    const pending = suppliers.filter((s) => s.status === 'pending_approval').length;
    const inactive = suppliers.filter((s) => s.status === 'inactive').length;
    const blacklisted = suppliers.filter((s) => s.status === 'blacklisted').length;
    return { total, active, pending, inactive, blacklisted };
  }, [suppliers]);

  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((supplier) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
            supplier.id.toLowerCase().includes(query) ||
            supplier.companyName.toLowerCase().includes(query) ||
            supplier.contactPerson.toLowerCase().includes(query) ||
            supplier.phone.includes(query) ||
            supplier.email.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      // Status filter
      if (statusFilter !== 'all' && supplier.status !== statusFilter) {
        return false;
      }

      // Category filter
      if (categoryFilter !== 'all' && !supplier.productCategories.includes(categoryFilter)) {
        return false;
      }

      // Date range filter
      if (dateRange?.from) {
        const regDate = parseISO(supplier.registrationDate);
        if (dateRange.to) {
          if (!isWithinInterval(regDate, { start: dateRange.from, end: dateRange.to })) {
            return false;
          }
        } else if (regDate < dateRange.from) {
          return false;
        }
      }

      return true;
    });
  }, [suppliers, searchQuery, statusFilter, categoryFilter, dateRange]);

  const handleClearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setCategoryFilter('all');
    setDateRange(undefined);
  };

  // ✅ Handle save with API
  const handleSaveSupplier = async (supplierData: Partial<Supplier>) => {
    if (editingSupplier) {
      await updateSupplierMutation.mutateAsync({
        id: editingSupplier.id,
        data: supplierData as any,
      });
    } else {
      await createSupplierMutation.mutateAsync(supplierData as any);
    }
    setEditingSupplier(null);
    setAddDialogOpen(false);
  };

  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setAddDialogOpen(true);
  };

  // ✅ Handle deactivate with API
  const handleDeactivate = async (supplier: Supplier) => {
    const newStatus = supplier.status === 'inactive' ? 'active' : 'inactive';

    await updateSupplierMutation.mutateAsync({
      id: supplier.id,
      data: {
        status: newStatus,
        activities: [
          {
            id: `a${Date.now()}`,
            type: 'status_change',
            description: `Status changed to ${newStatus === 'active' ? 'Active' : 'Inactive'}`,
            timestamp: new Date().toISOString(),
            user: 'Admin',
          },
          ...supplier.activities,
        ],
      } as any,
    });

    toast({
      title: `Supplier ${supplier.status === 'inactive' ? 'activated' : 'deactivated'} successfully`,
    });
  };

  const handleBlacklistClick = (supplier: Supplier) => {
    setSupplierToBlacklist(supplier);
    setBlacklistDialogOpen(true);
  };

  // ✅ Handle blacklist with API
  const handleBlacklistConfirm = async (reason: string) => {
    if (supplierToBlacklist) {
      await updateSupplierMutation.mutateAsync({
        id: supplierToBlacklist.id,
        data: {
          status: 'blacklisted',
          blacklistReason: reason,
          activities: [
            {
              id: `a${Date.now()}`,
              type: 'status_change',
              description: `Status changed to Blacklisted - ${reason}`,
              timestamp: new Date().toISOString(),
              user: 'Admin',
            },
            ...supplierToBlacklist.activities,
          ],
        } as any,
      });

      toast({ title: 'Supplier blacklisted', variant: 'destructive' });
      setSupplierToBlacklist(null);
      setBlacklistDialogOpen(false);
    }
  };

  const handleBulkDelete = () => {
    // Note: Bulk delete would need a backend endpoint
    toast({ title: `${selectedSuppliers.length} supplier(s) selected for deletion` });
    setSelectedSuppliers([]);
  };

// ✅ Get error message for display
  const getErrorMessage = () => {
    if (!error) return null;
    const isHtmlError = error?.message?.includes('<!DOCTYPE') || error?.message?.includes('<html');
    return isHtmlError
        ? 'Unable to connect to the server. Please check if the backend is running.'
        : error?.message;
  };

  return (
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">Suppliers</h1>
              <p className="text-muted-foreground">Manage your product suppliers and vendors</p>
            </div>
            <div className="flex items-center gap-3">
              {canDelete('suppliers') && selectedSuppliers.length > 0 && (
                  <Button variant="destructive" onClick={handleBulkDelete}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete ({selectedSuppliers.length})
                  </Button>
              )}
              {canCreate('suppliers') && (
                  <Button onClick={() => setAddDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Supplier
                  </Button>
              )}
            </div>
          </div>

          {/* Error Alert - Shows inline instead of blocking UI */}
          {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {getErrorMessage()}
                  <Button
                      variant="link"
                      className="ml-2 p-0 h-auto text-destructive underline"
                      onClick={() => window.location.reload()}
                  >
                    Try again
                  </Button>
                </AlertDescription>
              </Alert>
          )}

          {/* Stats */}
          <SupplierStats stats={stats} />

          {/* Filters */}
          <SupplierFilters
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              statusFilter={statusFilter}
              onStatusChange={setStatusFilter}
              categoryFilter={categoryFilter}
              onCategoryChange={setCategoryFilter}
              dateRange={dateRange}
              onDateRangeChange={setDateRange}
              onClearFilters={handleClearFilters}
          />

          {/* Table - Shows loading state or empty table */}
          {isLoading ? (
              <div className="flex items-center justify-center h-64 border rounded-lg">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2">Loading suppliers...</span>
              </div>
          ) : (
              <SuppliersTable
                  suppliers={filteredSuppliers}
                  selectedSuppliers={selectedSuppliers}
                  onSelectionChange={setSelectedSuppliers}
                  onEdit={handleEdit}
                  onDeactivate={handleDeactivate}
                  onBlacklist={handleBlacklistClick}
              />
          )}

          {/* Dialogs */}
          <AddSupplierDialog
              open={addDialogOpen}
              onOpenChange={(open) => {
                setAddDialogOpen(open);
                if (!open) setEditingSupplier(null);
              }}
              onSave={handleSaveSupplier}
              editingSupplier={editingSupplier}
          />

          <BlacklistDialog
              open={blacklistDialogOpen}
              onOpenChange={setBlacklistDialogOpen}
              supplier={supplierToBlacklist}
              onConfirm={handleBlacklistConfirm}
          />
        </div>
      </DashboardLayout>
  );
};

export default Suppliers;
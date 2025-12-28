import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout.tsx";
import CustomerStats from "@/components/customers/CustomerStats.tsx";
import CustomerFilters from "@/components/customers/CustomerFilters.tsx";
import CustomersTable from "@/components/customers/CustomersTable.tsx";
import AddCustomerDialog from "@/components/customers/AddCustomerDialog.tsx";
import BlockCustomerDialog from "@/components/customers/BlockCustomerDialog.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Plus, Loader2 } from "lucide-react";
import { Customer } from "@/types/customer.ts";
import { toast } from "@/hooks/use-toast.ts";
import { usePermissions } from "@/hooks/usePermissions.ts";

// ✅ Import API hooks
import { useCustomers, useCreateCustomer, useUpdateCustomer, useOrders } from "@/hooks/useApi";

const Customers = () => {
  const { canCreate, canEdit, canDelete } = usePermissions();

  // ✅ Fetch customers from API
  const { data: apiCustomers, isLoading, error } = useCustomers();
  // ✅ Fetch orders to calculate order counts per customer
  const { data: allOrders } = useOrders();
  const createCustomerMutation = useCreateCustomer();
  const updateCustomerMutation = useUpdateCustomer();

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [cityFilter, setCityFilter] = useState("all");
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [customerToBlock, setCustomerToBlock] = useState<Customer | null>(null);

  // ✅ Calculate order stats per customer from orders data
  const customerOrderStats = useMemo(() => {
    if (!allOrders) return {};

    const stats: Record<string, { count: number; totalValue: number }> = {};

    (allOrders as any[]).forEach((order) => {
      const customerId = order.customerId;
      if (!customerId) return;

      if (!stats[customerId]) {
        stats[customerId] = { count: 0, totalValue: 0 };
      }
      stats[customerId].count += 1;
      stats[customerId].totalValue += order.totalAmount || 0;
    });

    return stats;
  }, [allOrders]);

  // ✅ Map API customers to frontend Customer type
  const customers: Customer[] = useMemo(() => {
    if (!apiCustomers) return [];

    return apiCustomers.map((apiCustomer) => {
      const customerId = apiCustomer.id || apiCustomer._id;
      const orderStats = customerOrderStats[customerId] || { count: 0, totalValue: 0 };

      return {
        id: customerId,
        businessName: apiCustomer.businessName,
        businessType: apiCustomer.businessType as Customer['businessType'],
        gstNumber: apiCustomer.gstNumber,
        panNumber: apiCustomer.panNumber,
        establishedYear: apiCustomer.establishedYear,
        contactPerson: apiCustomer.contactPerson,
        designation: apiCustomer.designation,
        primaryPhone: apiCustomer.primaryPhone,
        secondaryPhone: apiCustomer.secondaryPhone,
        email: apiCustomer.email,
        website: apiCustomer.website,
        billingAddress: apiCustomer.billingAddress,
        deliveryAddresses: apiCustomer.deliveryAddresses || [],
        creditLimit: apiCustomer.creditLimit,
        paymentTerms: apiCustomer.paymentTerms as Customer['paymentTerms'],
        preferredPaymentMethod: apiCustomer.preferredPaymentMethod as Customer['preferredPaymentMethod'],
        documents: apiCustomer.documents || [],
        // ✅ Use calculated order stats from orders API
        totalOrders: orderStats.count,
        totalBusinessValue: orderStats.totalValue,
        outstandingAmount: apiCustomer.outstandingAmount || 0,
        lastOrderDate: apiCustomer.lastOrderDate,
        status: apiCustomer.status as Customer['status'],
        blockedReason: apiCustomer.blockedReason,
        notes: apiCustomer.notes,
        registeredAt: apiCustomer.registeredAt,
        orders: apiCustomer.orders || [],
        activities: apiCustomer.activities || [],
      };
    });
  }, [apiCustomers, customerOrderStats]);

  // ✅ Calculate stats from API data (matching CustomerStatsProps)
  const stats = useMemo(() => {
    const total = customers.length;
    const active = customers.filter(c => c.status === 'active').length;

    // Calculate new this month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const newThisMonth = customers.filter(c => {
      const registeredDate = new Date(c.registeredAt);
      return registeredDate >= startOfMonth;
    }).length;

    const blockedInactive = customers.filter(c =>
        c.status === 'blocked' || c.status === 'inactive'
    ).length;

    return {
      total,
      active,
      newThisMonth,
      blockedInactive,
    };
  }, [customers]);

  const filteredCustomers = useMemo(() => {
    return customers.filter((customer) => {
      const matchesSearch =
          !searchTerm ||
          customer.businessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          customer.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
          customer.contactPerson.toLowerCase().includes(searchTerm.toLowerCase()) ||
          customer.primaryPhone.includes(searchTerm) ||
          customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          customer.billingAddress.city.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === "all" || customer.status === statusFilter;
      const matchesCity = cityFilter === "all" || customer.billingAddress.state === cityFilter;

      return matchesSearch && matchesStatus && matchesCity;
    });
  }, [customers, searchTerm, statusFilter, cityFilter]);

  const handleSelectCustomer = (id: string) => {
    setSelectedCustomers((prev) =>
        prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    setSelectedCustomers(
        selectedCustomers.length === filteredCustomers.length
            ? []
            : filteredCustomers.map((c) => c.id)
    );
  };

  // ✅ Handle save with API
  const handleSaveCustomer = async (customerData: Partial<Customer>) => {
    if (editingCustomer) {
      // Update existing customer
      await updateCustomerMutation.mutateAsync({
        id: editingCustomer.id,
        data: customerData as any,
      });
    } else {
      // Create new customer
      await createCustomerMutation.mutateAsync(customerData as any);
    }
    setEditingCustomer(null);
    setAddDialogOpen(false);
  };

  const handleBlock = (customer: Customer) => {
    setCustomerToBlock(customer);
    setBlockDialogOpen(true);
  };

  // ✅ Handle block/unblock with API
  const handleBlockConfirm = async (reason: string) => {
    if (!customerToBlock) return;

    const newStatus = customerToBlock.status === "blocked" ? "active" : "blocked";

    await updateCustomerMutation.mutateAsync({
      id: customerToBlock.id,
      data: {
        status: newStatus,
        blockedReason: newStatus === "blocked" ? reason : undefined,
      } as any,
    });

    toast({
      title: customerToBlock.status === "blocked" ? "Customer unblocked" : "Customer blocked",
    });

    setCustomerToBlock(null);
    setBlockDialogOpen(false);
  };

  // ✅ Loading state
  if (isLoading) {
    return (
        <DashboardLayout>
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">Loading customers...</span>
          </div>
        </DashboardLayout>
    );
  }

  // ✅ Error state
  if (error) {
    return (
        <DashboardLayout>
          <div className="flex flex-col items-center justify-center h-64 text-destructive">
            <p>Failed to load customers</p>
            <p className="text-sm">{error?.message}</p>
          </div>
        </DashboardLayout>
    );
  }

  return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Customers</h1>
              <p className="text-muted-foreground">Manage your business customers</p>
            </div>
            {canCreate('customers') && (
                <Button onClick={() => setAddDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Customer
                </Button>
            )}
          </div>

          <CustomerStats stats={stats} />

          <CustomerFilters
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              cityFilter={cityFilter}
              setCityFilter={setCityFilter}
              onClearFilters={() => {
                setSearchTerm("");
                setStatusFilter("all");
                setCityFilter("all");
              }}
          />

          <CustomersTable
              customers={filteredCustomers}
              selectedCustomers={selectedCustomers}
              onSelectCustomer={handleSelectCustomer}
              onSelectAll={handleSelectAll}
              onEdit={(customer) => {
                setEditingCustomer(customer);
                setAddDialogOpen(true);
              }}
              onBlock={handleBlock}
          />

          <AddCustomerDialog
              open={addDialogOpen}
              onOpenChange={(open) => {
                setAddDialogOpen(open);
                if (!open) setEditingCustomer(null);
              }}
              onSave={handleSaveCustomer}
              customer={editingCustomer}
          />

          <BlockCustomerDialog
              open={blockDialogOpen}
              onOpenChange={setBlockDialogOpen}
              customer={customerToBlock}
              onConfirm={handleBlockConfirm}
          />
        </div>
      </DashboardLayout>
  );
};

export default Customers;
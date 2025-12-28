import { useState, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import html2pdf from 'html2pdf.js';
import { DashboardLayout } from '@/components/layout/DashboardLayout.tsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Badge } from '@/components/ui/badge.tsx';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.tsx';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table.tsx';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu.tsx';
import {
  FileText,
  FileCheck,
  FilePlus,
  IndianRupee,
  Search,
  Download,
  Printer,
  Eye,
  MoreHorizontal,
  Send,
  Calendar,
  Loader2,
  RefreshCw,
} from 'lucide-react';

// ✅ REMOVED: import { mockInvoices } from '@/data/mockInvoices.ts';

// ✅ NEW: Import API hooks
import { useOrders, useCustomers, useProducts } from '@/hooks/useApi';

import { GeneratedInvoice } from '@/types/invoice.ts';
import { InvoiceViewDialog } from '@/components/invoices/InvoiceViewDialog.tsx';
import { format } from 'date-fns';
import { cn } from '@/lib/utils.ts';
import { useToast } from '@/hooks/use-toast.ts';

// =============================================================================
// HELPER: Generate Invoice from Order
// =============================================================================

const generateInvoiceFromOrder = (
    order: any,
    type: 'proforma' | 'tax',
    customerMap: Map<string, any>,
    productMap: Map<string, any>
): GeneratedInvoice | null => {

  // Normalize status to lowercase
  const orderStatus = (order.status || '').toLowerCase();

  // Define which statuses are eligible for each invoice type
  const eligibleStatuses = {
    proforma: [
      'quote_sent', 'negotiating', 'negotiation',
      'confirmed', 'order_booked', 'accepted',
      'payment_pending', 'paid',
      'processing', 'packed',
      'shipped', 'delivered', 'completed'
    ],
    tax: [
      'paid', 'processing', 'packed',
      'shipped', 'delivered', 'completed'
    ],
  };

  // Check if order status is eligible for this invoice type
  if (!eligibleStatuses[type].includes(orderStatus)) {
    return null;
  }

  // Get customer info
  const customer = customerMap.get(order.customerId);
  const orderDate = new Date(order.createdAt);

  // Generate invoice number
  const prefix = type === 'proforma' ? 'PI' : 'INV';
  const orderIdSuffix = (order._id || order.id || '000000').slice(-6).toUpperCase();
  const invoiceNumber = `${prefix}-${order.orderNumber || order.orderId || 'ORD'}-${orderIdSuffix}`;

  // Map order products to invoice items
  const items = (order.products || order.items || []).map((item: any, index: number) => {
    const product = productMap.get(item.productId);
    const qty = item.quantity || 1;
    const rate = item.quotedPrice || item.price || 0;
    const taxRate = product?.taxRate || 18;

    return {
      id: String(index + 1),
      hsnCode: product?.hsnCode || '8483',
      description: product?.name || item.productName || `Product ${item.productId?.slice(-6) || index + 1}`,
      qty,
      unit: product?.unit || item.unit || 'PCS',
      rate,
      taxableValue: qty * rate,
      taxPercentage: taxRate,
      taxAmount: (qty * rate) * (taxRate / 100),
    };
  });

  // Calculate totals
  const subtotal = items.reduce((sum: number, item: any) => sum + item.taxableValue, 0);
  const totalTax = items.reduce((sum: number, item: any) => sum + (item.taxAmount || 0), 0);
  const shippingCost = order.shippingCost || 0;
  const discount = order.discount || 0;
  const totalBeforeRound = subtotal + totalTax + shippingCost - discount;
  const roundOff = Math.round(totalBeforeRound) - totalBeforeRound;
  const grandTotal = Math.round(totalBeforeRound);

  // Determine GST type (CGST+SGST vs IGST)
  const sellerStateCode = '27'; // Maharashtra - Your company state
  const buyerState = customer?.billingAddress?.state ||
      customer?.companyInfo?.billingAddress?.state ||
      order.shippingAddress?.state ||
      'Maharashtra';

  // State code lookup
  const stateCodes: Record<string, string> = {
    'Maharashtra': '27', 'Delhi': '07', 'Karnataka': '29',
    'Tamil Nadu': '33', 'Telangana': '36', 'Gujarat': '24',
    'Uttar Pradesh': '09', 'West Bengal': '19', 'Rajasthan': '08',
    'Andhra Pradesh': '37', 'Kerala': '32', 'Punjab': '03',
  };

  const buyerStateCode = stateCodes[buyerState] || '27';
  const isSameState = sellerStateCode === buyerStateCode;

  // Calculate GST split
  const cgst = isSameState ? totalTax / 2 : 0;
  const sgst = isSameState ? totalTax / 2 : 0;
  const igst = !isSameState ? totalTax : 0;

  // Determine invoice status based on order status
  let invoiceStatus: 'draft' | 'sent' | 'paid' | 'cancelled' = 'sent';
  if (['paid', 'delivered', 'completed'].includes(orderStatus)) {
    invoiceStatus = 'paid';
  } else if (['cancelled', 'rejected'].includes(orderStatus)) {
    invoiceStatus = 'cancelled';
  } else if (type === 'tax' && !['paid', 'delivered', 'completed'].includes(orderStatus)) {
    invoiceStatus = 'draft';
  }

  // Build billing address
  const billingAddress = {
    street: customer?.billingAddress?.streetAddress ||
        customer?.companyInfo?.billingAddress?.streetAddress || '',
    city: customer?.billingAddress?.city ||
        customer?.companyInfo?.billingAddress?.city || '',
    state: buyerState,
    pin: customer?.billingAddress?.pinCode ||
        customer?.companyInfo?.billingAddress?.pinCode || '',
  };

  // Build shipping address
  const shippingAddress = {
    street: order.shippingAddress?.streetAddress || billingAddress.street,
    city: order.shippingAddress?.city || billingAddress.city,
    state: order.shippingAddress?.state || billingAddress.state,
    pin: order.shippingAddress?.pinCode || billingAddress.pin,
  };

  return {
    id: `${type}-${order._id || order.id}`,
    orderId: order._id || order.id,
    orderNumber: order.orderNumber || order.orderId || `ORD-${orderIdSuffix}`,
    type,
    invoiceNumber,
    invoiceDate: orderDate.toISOString().split('T')[0],
    dueDate: new Date(orderDate.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    placeOfSupply: `${buyerState} (${buyerStateCode})`,
    seller: {
      companyName: 'Your Company Name',
      address: 'Your Company Address',
      city: 'Mumbai',
      state: 'Maharashtra',
      pin: '400001',
      gstin: '27XXXXXXXXXXXXX',
      pan: 'XXXXXXXXXX',
      stateCode: '27',
    },
    buyer: {
      customerName: customer?.contactPerson ||
          customer?.fullName ||
          customer?.companyInfo?.contactDetails?.email?.split('@')[0] ||
          'Customer',
      companyName: customer?.businessName ||
          customer?.companyInfo?.companyName ||
          '',
      gstin: customer?.gstNumber ||
          customer?.companyInfo?.gstNumber ||
          '',
      stateCode: buyerStateCode,
    },
    billingAddress,
    shippingAddress,
    items,
    subtotal: Math.round(subtotal * 100) / 100,
    cgst: Math.round(cgst * 100) / 100,
    sgst: Math.round(sgst * 100) / 100,
    igst: Math.round(igst * 100) / 100,
    shippingCost,
    discount,
    discountPercent: subtotal > 0 ? Math.round((discount / subtotal) * 100) : 0,
    roundOff: Math.round(roundOff * 100) / 100,
    grandTotal,
    bankDetails: {
      accountName: 'Your Company Name',
      accountNumber: 'XXXXXXXXXXXX',
      ifsc: 'XXXX0000XXX',
      bankName: 'Your Bank Name',
    },
    terms: [
      'Payment due within 30 days from invoice date.',
      'Goods once sold will not be taken back or exchanged.',
    ],
    status: invoiceStatus,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt || order.createdAt,
  };
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function Invoices() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const printRef = useRef<HTMLDivElement>(null);

  // Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Dialog state
  const [selectedInvoice, setSelectedInvoice] = useState<GeneratedInvoice | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);

  // ✅ Fetch real data from API
  const {
    data: orders = [],
    isLoading: ordersLoading,
    error: ordersError,
    refetch: refetchOrders
  } = useOrders();

  const {
    data: customers = [],
    isLoading: customersLoading
  } = useCustomers();

  const {
    data: products = [],
    isLoading: productsLoading
  } = useProducts();

  // ✅ Create lookup maps for fast access
  const customerMap = useMemo(() => {
    const map = new Map<string, any>();
    (customers as any[]).forEach(c => {
      if (c._id) map.set(c._id, c);
      if (c.id && c.id !== c._id) map.set(c.id, c);
    });
    return map;
  }, [customers]);

  const productMap = useMemo(() => {
    const map = new Map<string, any>();
    (products as any[]).forEach(p => {
      if (p._id) map.set(p._id, p);
    });
    return map;
  }, [products]);

  // ✅ Generate invoices from real orders
  const invoices = useMemo(() => {
    const generatedInvoices: GeneratedInvoice[] = [];

    (orders as any[]).forEach(order => {
      // Generate proforma invoice (for eligible orders)
      const proforma = generateInvoiceFromOrder(order, 'proforma', customerMap, productMap);
      if (proforma) {
        generatedInvoices.push(proforma);
      }

      // Generate tax invoice (only for paid+ orders)
      const tax = generateInvoiceFromOrder(order, 'tax', customerMap, productMap);
      if (tax) {
        generatedInvoices.push(tax);
      }
    });

    // Sort by date descending (newest first)
    return generatedInvoices.sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [orders, customerMap, productMap]);

  // Filter invoices based on search and filters
  const filteredInvoices = useMemo(() => {
    return invoices.filter((invoice) => {
      // Search filter
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm ||
          invoice.invoiceNumber.toLowerCase().includes(searchLower) ||
          invoice.buyer.companyName.toLowerCase().includes(searchLower) ||
          invoice.buyer.customerName.toLowerCase().includes(searchLower) ||
          invoice.orderNumber.toLowerCase().includes(searchLower);

      // Type filter
      const matchesType = typeFilter === 'all' || invoice.type === typeFilter;

      // Status filter
      const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [invoices, searchTerm, typeFilter, statusFilter]);

  // Calculate statistics
  const stats = useMemo(() => ({
    total: invoices.length,
    proforma: invoices.filter((i) => i.type === 'proforma').length,
    tax: invoices.filter((i) => i.type === 'tax').length,
    totalValue: invoices.reduce((sum, i) => sum + i.grandTotal, 0),
  }), [invoices]);

  // Loading state
  const isLoading = ordersLoading || customersLoading || productsLoading;

  // =============================================================================
  // UTILITY FUNCTIONS
  // =============================================================================

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="secondary">Draft</Badge>;
      case 'sent':
        return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">Sent</Badge>;
      case 'paid':
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Paid</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    return type === 'proforma' ? (
        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
          Proforma
        </Badge>
    ) : (
        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
          Tax Invoice
        </Badge>
    );
  };

  // =============================================================================
  // ACTION HANDLERS
  // =============================================================================

  const handleView = (invoice: GeneratedInvoice, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedInvoice(invoice);
    setViewDialogOpen(true);
  };

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: selectedInvoice ? `Invoice-${selectedInvoice.invoiceNumber}` : 'Invoice',
  });

  const handleDownloadPDF = (invoice: GeneratedInvoice, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    // If dialog is open and printRef is available, use that
    if (printRef.current && viewDialogOpen) {
      const element = printRef.current;
      const opt = {
        margin: 10,
        filename: `${invoice.invoiceNumber}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      };
      html2pdf().set(opt).from(element).save();
    } else {
      // Open dialog first, then download
      setSelectedInvoice(invoice);
      setViewDialogOpen(true);
      // Delay to allow dialog to render
      setTimeout(() => {
        if (printRef.current) {
          const element = printRef.current;
          const opt = {
            margin: 10,
            filename: `${invoice.invoiceNumber}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
          };
          html2pdf().set(opt).from(element).save();
        }
      }, 500);
    }
  };

  const handleDirectPrint = (invoice: GeneratedInvoice, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedInvoice(invoice);
    setViewDialogOpen(true);
    // Delay to allow dialog to render
    setTimeout(() => {
      handlePrint();
    }, 500);
  };

  const handleSendToCustomer = (invoice: GeneratedInvoice, e: React.MouseEvent) => {
    e.stopPropagation();
    toast({
      title: 'Invoice Sent',
      description: `Invoice ${invoice.invoiceNumber} has been sent to ${invoice.buyer.customerName}`,
    });
  };

  const handleDialogPrint = () => {
    handlePrint();
  };

  const handleDialogDownload = () => {
    if (selectedInvoice) {
      handleDownloadPDF(selectedInvoice);
    }
  };

  const handleDialogSend = () => {
    if (selectedInvoice) {
      toast({
        title: 'Invoice Sent',
        description: `Invoice ${selectedInvoice.invoiceNumber} has been sent to ${selectedInvoice.buyer.customerName}`,
      });
    }
  };

  const handleRefresh = () => {
    refetchOrders();
  };

  // =============================================================================
  // RENDER: LOADING STATE
  // =============================================================================

  if (isLoading) {
    return (
        <DashboardLayout>
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">Loading invoices...</span>
          </div>
        </DashboardLayout>
    );
  }

  // =============================================================================
  // RENDER: ERROR STATE
  // =============================================================================

  if (ordersError) {
    return (
        <DashboardLayout>
          <div className="flex flex-col items-center justify-center h-64 text-destructive">
            <FileText className="h-12 w-12 mb-4 opacity-50" />
            <p className="text-lg font-medium">Failed to load invoices</p>
            <p className="text-sm text-muted-foreground mb-4">
              {ordersError instanceof Error ? ordersError.message : 'Unknown error'}
            </p>
            <Button onClick={handleRefresh}>Try Again</Button>
          </div>
        </DashboardLayout>
    );
  }

  // =============================================================================
  // RENDER: MAIN UI
  // =============================================================================

  return (
      <DashboardLayout>
        <div className="space-y-6 animate-fade-in">
          {/* Header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Invoices</h1>
              <p className="text-muted-foreground">Manage all your proforma and tax invoices</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleRefresh}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Invoices
                </CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Proforma Invoices
                </CardTitle>
                <FilePlus className="h-4 w-4 text-amber-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.proforma}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Tax Invoices
                </CardTitle>
                <FileCheck className="h-4 w-4 text-emerald-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.tax}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Value
                </CardTitle>
                <IndianRupee className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(stats.totalValue)}</div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                      placeholder="Search invoices, customers, orders..."
                      className="pl-10"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="proforma">Proforma</SelectItem>
                    <SelectItem value="tax">Tax Invoice</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="icon">
                  <Calendar className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice No</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="h-24 text-center">
                          <div className="flex flex-col items-center gap-2">
                            <FileText className="h-8 w-8 text-muted-foreground" />
                            <p className="text-muted-foreground">
                              {invoices.length === 0
                                  ? 'No invoices yet. Invoices will appear here when orders are processed.'
                                  : 'No invoices match your filters'}
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                  ) : (
                      filteredInvoices.map((invoice) => (
                          <TableRow
                              key={invoice.id}
                              className="cursor-pointer hover:bg-muted/50"
                              onClick={() => handleView(invoice)}
                          >
                            <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                            <TableCell>{getTypeBadge(invoice.type)}</TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">{invoice.buyer.companyName || 'N/A'}</p>
                                <p className="text-xs text-muted-foreground">{invoice.buyer.customerName}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Button
                                  variant="link"
                                  className="p-0 h-auto text-primary"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/orders/${invoice.orderId}`);
                                  }}
                              >
                                {invoice.orderNumber}
                              </Button>
                            </TableCell>
                            <TableCell>{format(new Date(invoice.invoiceDate), 'PP')}</TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(invoice.grandTotal)}
                            </TableCell>
                            <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={(e) => handleView(invoice, e)}>
                                    <Eye className="mr-2 h-4 w-4" />
                                    View
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={(e) => handleDownloadPDF(invoice, e)}>
                                    <Download className="mr-2 h-4 w-4" />
                                    Download PDF
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={(e) => handleDirectPrint(invoice, e)}>
                                    <Printer className="mr-2 h-4 w-4" />
                                    Print
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={(e) => handleSendToCustomer(invoice, e)}>
                                    <Send className="mr-2 h-4 w-4" />
                                    Send to Customer
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                      ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Results count */}
          <div className="text-sm text-muted-foreground">
            Showing {filteredInvoices.length} of {invoices.length} invoices
          </div>

          {/* Invoice View Dialog */}
          <InvoiceViewDialog
              open={viewDialogOpen}
              onOpenChange={setViewDialogOpen}
              invoice={selectedInvoice}
              onPrint={handleDialogPrint}
              onDownload={handleDialogDownload}
              onSend={handleDialogSend}
              printRef={printRef}
          />
        </div>
      </DashboardLayout>
  );
}
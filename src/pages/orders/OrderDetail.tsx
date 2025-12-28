// =============================================================================
// Admin OrderDetail.tsx - Order/Quotation Detail Page with Send Quote
// =============================================================================

import { useState, useMemo, useRef, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { OrderStatusBadge } from '@/components/orders/OrderStatusBadge';
import { OrderProgressStepper } from '@/components/orders/OrderProgressStepper';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  ArrowLeft,
  Edit,
  MapPin,
  Phone,
  Mail,
  Building2,
  CreditCard,
  User,
  FileText,
  Loader2,
  ExternalLink,
  Save,
  X,
  Send,
  Clock,
  MessageSquare,
  AlertCircle,
  Download,
  Printer,
  Plus,
  Eye,
} from 'lucide-react';

// Invoice Components
import { InvoiceGeneratorDialog } from '@/components/orders/InvoiceGeneratorDialog';
import { InvoiceViewDialog } from '@/components/invoices/InvoiceViewDialog';
import { GeneratedInvoice, InvoiceType } from '@/types/invoice';
import { useReactToPrint } from 'react-to-print';
import html2pdf from 'html2pdf.js';
import { format } from 'date-fns';
import { ORDER_STATUS_CONFIG, OrderStatus, Order } from '@/types/order';
import { cn } from '@/lib/utils';
import { usePermissions } from '@/hooks/usePermissions';
import { useToast } from '@/hooks/use-toast';

// Hooks
import { useOrders, useUpdateOrder, useUpdateQuotation, useProducts, useCustomers, useSendQuote } from '@/hooks/useApi';
import type { ApiCustomer } from '@/api/customers.api';
import type { ApiOrder } from '@/api/orders.api';

// =============================================================================
// STATUS MAPPING
// =============================================================================

const mapApiStatusToFrontend = (apiStatus: string): OrderStatus => {
  const statusMap: Record<string, OrderStatus> = {
    'quote_requested': 'quote_requested',
    'quote_sent': 'quote_sent',
    'negotiation': 'negotiation',
    'order_booked': 'order_booked',
    'confirmed': 'confirmed',
    'payment_pending': 'payment_pending',
    'paid': 'paid',
    'processing': 'processing',
    'packed': 'packed',
    'shipped': 'shipped',
    'delivered': 'delivered',
    'completed': 'completed',
    'cancelled': 'cancelled',
    'rejected': 'rejected',
    'returned': 'returned',
    'refunded': 'refunded',
    'on_hold': 'on_hold',
    // Backend quotation statuses (4 enum values)
    'PENDING': 'quote_requested',
    'NEGOTIATING': 'quote_sent',      // Admin sent quote
    'ACCEPTED': 'order_booked',
    'REJECTED': 'rejected',
    // Uppercase mappings (legacy)
    'QUOTE_REQUESTED': 'quote_requested',
    'QUOTE_SENT': 'quote_sent',
    'NEGOTIATION': 'negotiation',
    'ORDER_BOOKED': 'order_booked',
    'CONFIRMED': 'confirmed',
    'PROCESSING': 'processing',
    'SHIPPED': 'shipped',
    'DELIVERED': 'delivered',
    'CANCELLED': 'cancelled',
  };
  return statusMap[apiStatus] || 'processing';
};

// =============================================================================
// COMPONENT
// =============================================================================

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { canEdit } = usePermissions();
  const { toast } = useToast();

  // Data fetching
  const { data: apiOrders, isLoading: ordersLoading, error, refetch } = useOrders();
  const { data: apiProducts, isLoading: productsLoading } = useProducts();
  const { data: customers, isLoading: customersLoading } = useCustomers();
  const updateOrderMutation = useUpdateOrder();
  const updateQuotationMutation = useUpdateQuotation();
  const sendQuoteMutation = useSendQuote();

  // State
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showSendQuoteDialog, setShowSendQuoteDialog] = useState(false);
  const [quotedPrices, setQuotedPrices] = useState<Record<string, number>>({});
  const [quoteNotes, setQuoteNotes] = useState('');

  // Edit form state
  const [editFormData, setEditFormData] = useState({
    status: '',
    notes: '',
    shippingCost: 0,
    discount: 0,
  });

  // Invoice state
  const [invoices, setInvoices] = useState<GeneratedInvoice[]>([]);
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);
  const [invoiceType, setInvoiceType] = useState<InvoiceType>('proforma');
  const [selectedInvoice, setSelectedInvoice] = useState<GeneratedInvoice | null>(null);
  const [viewInvoiceDialogOpen, setViewInvoiceDialogOpen] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  // Print handler
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: selectedInvoice ? `Invoice-${selectedInvoice.invoiceNumber}` : 'Invoice',
  });

  // Track if invoices have been auto-generated (to prevent re-generation)
  const [invoicesGenerated, setInvoicesGenerated] = useState<{ proforma: boolean; tax: boolean }>({
    proforma: false,
    tax: false,
  });

  // Product lookup - includes tax rate from inventory
  const productLookup = useMemo(() => {
    if (!apiProducts) return {};
    const lookup: Record<string, { name: string; sku: string; price: number; taxRate: number }> = {};
    (apiProducts as Array<{ _id: string; name: string; sku?: string; minPrice?: number; price?: number; taxRate?: number; gstRate?: number; tax?: number }>).forEach((product) => {
      lookup[product._id] = {
        name: product.name,
        sku: product.sku || '',
        price: product.minPrice || product.price || 0,
        taxRate: product.taxRate || product.gstRate || product.tax || 18, // Get tax rate from product, default 18%
      };
    });
    return lookup;
  }, [apiProducts]);

  // Customer lookup
  const customerMap = useMemo(() => {
    if (!customers) return new Map<string, ApiCustomer>();
    const map = new Map<string, ApiCustomer>();
    (customers as ApiCustomer[]).forEach(c => {
      if (c._id) map.set(c._id, c);
      if (c.id && c.id !== c._id) map.set(c.id, c);
    });
    return map;
  }, [customers]);

  // Get order
  const apiOrder = useMemo(() => {
    if (!apiOrders || !id) return null;
    return (apiOrders as ApiOrder[]).find((o) => o._id === id || o.orderId === id);
  }, [apiOrders, id]);

  // Get linked customer
  const linkedCustomer = useMemo(() => {
    if (!apiOrder?.customerId) return null;
    return customerMap.get(apiOrder.customerId) || null;
  }, [apiOrder, customerMap]);

  // =============================================================================
  // AUTO-GENERATE INVOICES BASED ON STATUS
  // =============================================================================

  // Function to create an invoice object
  const createInvoiceObject = (type: InvoiceType): GeneratedInvoice | null => {
    if (!apiOrder || !linkedCustomer) return null;
    if (!apiOrder.items || apiOrder.items.length === 0) return null;

    try {
      const now = new Date();
      const dueDate = new Date(now);
      dueDate.setDate(dueDate.getDate() + 30); // 30 days payment term

      const orderIdShort = apiOrder._id?.slice(-8)?.toUpperCase() || 'UNKNOWN';
      const invoicePrefix = type === 'proforma' ? 'PI' : 'TI';
      const invoiceNumber = `${invoicePrefix}-${apiOrder.orderNumber || orderIdShort}`;

      // Calculate totals
      const subtotal = (apiOrder.items || []).reduce((sum, item) => {
        const price = item.quotedPrice || item.targetPrice || item.price || 0;
        return sum + ((item.quantity || 0) * price);
      }, 0);

      // Calculate tax based on individual product tax rates from inventory
      const taxAmount = (apiOrder.items || []).reduce((sum, item) => {
        const product = productLookup[item.productId];
        const price = item.quotedPrice || item.targetPrice || item.price || 0;
        const lineSubtotal = (item.quantity || 0) * price;
        // Get tax rate from product in inventory, default 18%
        const taxPercent = product?.taxRate || 18;
        return sum + (lineSubtotal * (taxPercent / 100));
      }, 0);

      const shippingCost = apiOrder.shippingCost || 0;
      const discount = apiOrder.discount || 0;
      const grandTotal = subtotal + taxAmount + shippingCost - discount;

      // Determine if IGST or CGST/SGST based on state
      const sellerState = 'Maharashtra';
      const buyerState = linkedCustomer.billingAddress?.state || 'Maharashtra';
      const isInterState = sellerState !== buyerState;

      const invoice: GeneratedInvoice = {
        id: `inv-${Date.now()}-${type}`,
        orderId: apiOrder._id,
        orderNumber: apiOrder.orderNumber || orderIdShort,
        type: type,
        invoiceNumber: invoiceNumber,
        invoiceDate: now.toISOString(),
        dueDate: dueDate.toISOString(),
        placeOfSupply: buyerState,
        seller: {
          companyName: 'Your Company Name',
          address: 'Your Company Address',
          city: 'Mumbai',
          state: sellerState,
          pin: '400001',
          gstin: '27XXXXXXXXXXXXX',
          pan: 'XXXXXXXXXX',
          stateCode: '27',
        },
        buyer: {
          customerName: linkedCustomer.contactPerson || linkedCustomer.businessName || 'Customer',
          companyName: linkedCustomer.businessName || '',
          gstin: linkedCustomer.gstNumber || '',
          stateCode: linkedCustomer.billingAddress?.state ? '33' : '27',
        },
        billingAddress: {
          street: linkedCustomer.billingAddress?.street || linkedCustomer.billingAddress?.streetAddress || '',
          city: linkedCustomer.billingAddress?.city || '',
          state: linkedCustomer.billingAddress?.state || '',
          pin: linkedCustomer.billingAddress?.pinCode || '',
        },
        shippingAddress: {
          street: apiOrder.shippingAddress?.streetAddress || linkedCustomer.deliveryAddresses?.[0]?.street || '',
          city: apiOrder.shippingAddress?.city || linkedCustomer.deliveryAddresses?.[0]?.city || '',
          state: apiOrder.shippingAddress?.state || linkedCustomer.deliveryAddresses?.[0]?.state || '',
          pin: apiOrder.shippingAddress?.pinCode || linkedCustomer.deliveryAddresses?.[0]?.pinCode || '',
        },
        items: (apiOrder.items || []).map((item, index) => {
          const product = productLookup[item.productId || ''];
          const price = item.quotedPrice || item.targetPrice || item.price || 0;
          const qty = item.quantity || 1;
          const taxableValue = qty * price;
          const productId = item.productId || '';
          // Get tax rate from product in inventory, default 18%
          const itemTaxRate = product?.taxRate || 18;
          return {
            id: `item-${index}`,
            hsnCode: '8483',
            description: productLookup[productId]?.name || `Product ${productId.slice(-6) || index + 1}`,
            qty: qty,
            unit: 'PCS',
            rate: price,
            taxableValue: taxableValue,
            taxPercentage: itemTaxRate,
            taxAmount: taxableValue * (itemTaxRate / 100),
          };
        }),
        subtotal: subtotal,
        cgst: isInterState ? 0 : taxAmount / 2,
        sgst: isInterState ? 0 : taxAmount / 2,
        igst: isInterState ? taxAmount : 0,
        shippingCost: shippingCost,
        discount: discount,
        roundOff: 0,
        grandTotal: Math.round(grandTotal),
        bankDetails: {
          accountName: 'Your Company Name',
          accountNumber: 'XXXXXXXXXXXX',
          ifsc: 'XXXX0000XXX',
          bankName: 'Your Bank Name',
        },
        terms: [
          'Payment due within 30 days',
          'Goods once sold will not be taken back',
          'Subject to jurisdiction of local courts',
        ],
        status: 'sent',
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      };

      return invoice;
    } catch (error) {
      console.error('Error creating invoice object:', error);
      return null;
    }
  };

  // Get frontend status for auto-generation check
  const frontendStatusForInvoice = apiOrder ? mapApiStatusToFrontend(apiOrder.status) : null;

  // Auto-generate invoices based on order status
  useEffect(() => {
    // Safety checks
    if (!apiOrder || !linkedCustomer || !frontendStatusForInvoice) return;
    if (Object.keys(productLookup).length === 0) return; // Wait for products to load

    try {
      // Auto-generate Proforma Invoice when status is order_booked
      if (frontendStatusForInvoice === 'order_booked' && !invoicesGenerated.proforma) {
        const proformaInvoice = createInvoiceObject('proforma');
        if (proformaInvoice) {
          setInvoices(prev => [...prev, proformaInvoice]);
          setInvoicesGenerated(prev => ({ ...prev, proforma: true }));
        }
      }

      // Auto-generate Tax Invoice when status is shipped or delivered
      if (['shipped', 'delivered', 'completed'].includes(frontendStatusForInvoice) && !invoicesGenerated.tax) {
        // Also generate proforma if not already generated
        if (!invoicesGenerated.proforma) {
          const proformaInvoice = createInvoiceObject('proforma');
          if (proformaInvoice) {
            setInvoices(prev => [...prev, proformaInvoice]);
            setInvoicesGenerated(prev => ({ ...prev, proforma: true }));
          }
        }

        const taxInvoice = createInvoiceObject('tax');
        if (taxInvoice) {
          setInvoices(prev => [...prev, taxInvoice]);
          setInvoicesGenerated(prev => ({ ...prev, tax: true }));
        }
      }
    } catch (error) {
      console.error('Error auto-generating invoices:', error);
    }
  }, [apiOrder?._id, linkedCustomer?._id, frontendStatusForInvoice, Object.keys(productLookup).length]);

  // Initialize quoted prices when dialog opens
  const initializeQuotedPrices = () => {
    if (!apiOrder) return;
    const prices: Record<string, number> = {};
    apiOrder.items.forEach(item => {
      // Use existing quotedPrice, or targetPrice, or current price
      prices[item.productId] = item.quotedPrice || item.targetPrice || item.price || 0;
    });
    setQuotedPrices(prices);
  };

  // Handle Send Quote
  const handleSendQuote = async () => {
    if (!apiOrder) return;

    try {
      const products = apiOrder.items.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        targetPrice: item.targetPrice || item.price,
        quotedPrice: quotedPrices[item.productId] || item.price,
      }));

      await sendQuoteMutation.mutateAsync({
        quotationId: apiOrder._id,
        products,
        notes: quoteNotes || undefined,
      });

      setShowSendQuoteDialog(false);
      setQuotedPrices({});
      setQuoteNotes('');
      refetch();
    } catch (error) {
      console.error('Failed to send quote:', error);
    }
  };

  // Initialize edit form when dialog opens
  const initializeEditForm = () => {
    if (!apiOrder) return;
    setEditFormData({
      status: apiOrder.status,
      notes: apiOrder.notes || '',
      shippingCost: apiOrder.shippingCost || 0,
      discount: apiOrder.discount || 0,
    });
  };

  // Handle edit order save
  const handleEditSave = async () => {
    if (!apiOrder) return;

    try {
      if (apiOrder.isQuotation) {
        // For Quotations: use updateQuotation endpoint with quotationId
        await updateQuotationMutation.mutateAsync({
          quotationId: apiOrder._id,
          data: {
            notes: editFormData.notes,
            shippingCost: editFormData.shippingCost,
            discount: editFormData.discount,
          },
        });
      } else {
        // For Orders: use updateOrder endpoint with orderId
        await updateOrderMutation.mutateAsync({
          id: apiOrder._id,
          data: {
            orderId: apiOrder.orderId || apiOrder.orderNumber,
            notes: editFormData.notes,
            shippingCost: editFormData.shippingCost,
            discount: editFormData.discount,
          },
        });
      }

      setIsEditMode(false);
      refetch();
      toast({
        title: apiOrder.isQuotation ? 'Quotation Updated' : 'Order Updated',
        description: 'Details have been saved successfully.',
      });
    } catch (error) {
      console.error('Failed to update:', error);
      toast({
        title: 'Error',
        description: 'Failed to update. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Open invoice generator dialog
  const handleGenerateInvoice = (type: InvoiceType) => {
    setInvoiceType(type);
    setShowInvoiceDialog(true);
  };

  // Save generated invoice
  const handleInvoiceSaved = (invoice: GeneratedInvoice) => {
    setInvoices(prev => [...prev, invoice]);
    setShowInvoiceDialog(false);
    toast({
      title: 'Invoice Created',
      description: `${invoice.type === 'proforma' ? 'Proforma Invoice' : 'Tax Invoice'} ${invoice.invoiceNumber} has been generated.`,
    });
  };

  // View invoice
  const handleViewInvoice = (invoice: GeneratedInvoice) => {
    setSelectedInvoice(invoice);
    setViewInvoiceDialogOpen(true);
  };

  // Download invoice as PDF
  const handleDownloadInvoicePDF = (invoice: GeneratedInvoice) => {
    setSelectedInvoice(invoice);
    setViewInvoiceDialogOpen(true);
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
  };

  // Print invoice
  const handlePrintInvoice = (invoice: GeneratedInvoice) => {
    setSelectedInvoice(invoice);
    setViewInvoiceDialogOpen(true);
    setTimeout(() => {
      handlePrint();
    }, 500);
  };

  // Send invoice to customer
  const handleSendInvoice = (invoice: GeneratedInvoice) => {
    toast({
      title: 'Invoice Sent',
      description: `Invoice ${invoice.invoiceNumber} has been sent to customer`,
    });
  };

  // Dialog handlers for InvoiceViewDialog
  const handleDialogPrint = () => {
    handlePrint();
  };

  const handleDialogDownload = () => {
    if (selectedInvoice && printRef.current) {
      const element = printRef.current;
      const opt = {
        margin: 10,
        filename: `${selectedInvoice.invoiceNumber}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      };
      html2pdf().set(opt).from(element).save();
    }
  };

  const handleDialogSend = () => {
    if (selectedInvoice) {
      toast({
        title: 'Invoice Sent',
        description: `Invoice ${selectedInvoice.invoiceNumber} has been sent to customer`,
      });
    }
  };

  // Format currency helper
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Calculate totals
  const calculateTotals = () => {
    if (!apiOrder) return { subtotal: 0, quotedTotal: 0 };

    const subtotal = apiOrder.items.reduce((sum, item) => {
      const price = item.targetPrice || item.price || 0;
      return sum + (item.quantity * price);
    }, 0);

    const quotedTotal = apiOrder.items.reduce((sum, item) => {
      const price = quotedPrices[item.productId] || item.quotedPrice || item.targetPrice || item.price || 0;
      return sum + (item.quantity * price);
    }, 0);

    return { subtotal, quotedTotal };
  };

  // Loading state
  if (ordersLoading || productsLoading) {
    return (
        <DashboardLayout>
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </DashboardLayout>
    );
  }

  // Not found
  if (!apiOrder) {
    return (
        <DashboardLayout>
          <div className="space-y-6">
            <Button variant="ghost" onClick={() => navigate('/orders')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Orders
            </Button>
            <div className="text-center py-16">
              <h1 className="text-2xl font-bold">Order Not Found</h1>
              <p className="text-muted-foreground">This order does not exist.</p>
            </div>
          </div>
        </DashboardLayout>
    );
  }

  // Map status
  const frontendStatus = mapApiStatusToFrontend(apiOrder.status);
  const statusConfig = ORDER_STATUS_CONFIG[frontendStatus] || ORDER_STATUS_CONFIG['processing'];
  const { subtotal, quotedTotal } = calculateTotals();

  // Check if this needs admin to send quote
  const needsQuoteResponse = apiOrder.isQuotation &&
      ['quote_requested', 'negotiation'].includes(frontendStatus);

  // Get shipping address with fallback to customer's delivery address
  const getShippingAddress = () => {
    // 1. First try order's shipping address
    if (apiOrder.shippingAddress?.streetAddress || apiOrder.shippingAddress?.city) {
      return {
        street: apiOrder.shippingAddress.streetAddress || '',
        city: apiOrder.shippingAddress.city || '',
        state: apiOrder.shippingAddress.state || '',
        pincode: apiOrder.shippingAddress.pinCode || '',
        country: 'India',
      };
    }

    // 2. Fallback to customer's first delivery address
    const customerDeliveryAddr = linkedCustomer?.deliveryAddresses?.[0];
    if (customerDeliveryAddr && (customerDeliveryAddr.street || customerDeliveryAddr.streetAddress || customerDeliveryAddr.city)) {
      return {
        street: customerDeliveryAddr.street || customerDeliveryAddr.streetAddress || '',
        city: customerDeliveryAddr.city || '',
        state: customerDeliveryAddr.state || '',
        pincode: customerDeliveryAddr.pinCode || '',
        country: 'India',
      };
    }

    // 3. Fallback to customer's billing address
    const customerBillingAddr = linkedCustomer?.billingAddress;
    if (customerBillingAddr && (customerBillingAddr.street || customerBillingAddr.streetAddress || customerBillingAddr.city)) {
      return {
        street: customerBillingAddr.street || customerBillingAddr.streetAddress || '',
        city: customerBillingAddr.city || '',
        state: customerBillingAddr.state || '',
        pincode: customerBillingAddr.pinCode || '',
        country: 'India',
      };
    }

    // 4. Return empty address
    return {
      street: '',
      city: '',
      state: '',
      pincode: '',
      country: 'India',
    };
  };

  // Get billing address from customer
  const getBillingAddress = () => {
    const customerBillingAddr = linkedCustomer?.billingAddress;
    if (customerBillingAddr && (customerBillingAddr.street || customerBillingAddr.streetAddress || customerBillingAddr.city)) {
      return {
        street: customerBillingAddr.street || customerBillingAddr.streetAddress || '',
        city: customerBillingAddr.city || '',
        state: customerBillingAddr.state || '',
        pincode: customerBillingAddr.pinCode || '',
        country: 'India',
      };
    }

    return {
      street: '',
      city: '',
      state: '',
      pincode: '',
      country: 'India',
    };
  };

  // Build order object for components
  const order: Order = {
    id: apiOrder._id,
    _id: apiOrder._id,
    orderNumber: apiOrder.orderNumber,
    orderId: apiOrder.orderId,
    customerId: apiOrder.customerId,
    customer: {
      id: linkedCustomer?._id || apiOrder.customerId || '',
      name: linkedCustomer?.contactPerson || linkedCustomer?.businessName || 'Unknown',
      email: linkedCustomer?.email || '',
      phone: linkedCustomer?.primaryPhone || '',
      type: 'wholesaler',
      company: linkedCustomer?.businessName,
    },
    billingAddress: getBillingAddress(),
    shippingAddress: getShippingAddress(),
    items: apiOrder.items.map((item, idx) => ({
      id: `item-${idx}`,
      productId: item.productId,
      productName: productLookup[item.productId]?.name || `Product ${item.productId.slice(-6)}`,
      sku: productLookup[item.productId]?.sku || '',
      quantity: item.quantity,
      unit: 'pieces',
      unitPrice: item.quotedPrice || item.targetPrice || item.price,
      totalPrice: item.quantity * (item.quotedPrice || item.targetPrice || item.price),
    })),
    subtotal: subtotal,
    tax: 0,
    shippingCost: apiOrder.shippingCost || 0,
    discount: apiOrder.discount || 0,
    totalAmount: apiOrder.totalAmount,
    currency: apiOrder.currency || 'INR',
    status: frontendStatus,
    paymentStatus: 'pending',
    createdAt: apiOrder.createdAt,
    updatedAt: apiOrder.updatedAt,
    timeline: [
      { status: frontendStatus, timestamp: apiOrder.createdAt },
    ],
    notes: apiOrder.notes,
    priority: apiOrder.priority || 'medium',
  };

  return (
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => navigate('/orders')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold">{order.orderNumber}</h1>
                  {apiOrder.isQuotation && (
                      <Badge variant="outline" className="text-purple-600 border-purple-300">
                        Quotation
                      </Badge>
                  )}
                  <Badge className={`${statusConfig.bgColor} ${statusConfig.color}`}>
                    {statusConfig.label}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Created {format(new Date(order.createdAt), 'PPpp')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Send Quote Button - Only for quotations needing response */}
              {needsQuoteResponse && (
                  <Button
                      onClick={() => {
                        initializeQuotedPrices();
                        setShowSendQuoteDialog(true);
                      }}
                      className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Send Quote
                  </Button>
              )}

              {/* Edit Order Button - Toggle inline edit mode */}
              {canEdit && !isEditMode && (
                  <Button
                      variant="outline"
                      onClick={() => {
                        initializeEditForm();
                        setIsEditMode(true);
                      }}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Order
                  </Button>
              )}

              {/* Save/Cancel buttons when in edit mode */}
              {isEditMode && (
                  <>
                    <Button
                        variant="outline"
                        onClick={() => setIsEditMode(false)}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                    <Button
                        onClick={handleEditSave}
                        disabled={updateOrderMutation.isPending || updateQuotationMutation.isPending}
                        className="bg-green-600 hover:bg-green-700"
                    >
                      {(updateOrderMutation.isPending || updateQuotationMutation.isPending) && (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      )}
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </Button>
                  </>
              )}
            </div>
          </div>

          {/* Alert for Quotation Action Required */}
          {needsQuoteResponse && (
              <Card className="border-amber-200 bg-amber-50">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                    <div>
                      <h3 className="font-semibold text-amber-800">
                        {frontendStatus === 'quote_requested'
                            ? 'Quote Request - Action Required'
                            : 'Counter-offer Received - Action Required'
                        }
                      </h3>
                      <p className="text-sm text-amber-700 mt-1">
                        {frontendStatus === 'quote_requested'
                            ? 'Customer is waiting for your quote. Review their target prices and send your quoted prices.'
                            : 'Customer has submitted a counter-offer. Review and send an updated quote.'
                        }
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
          )}

          {/* Progress Stepper */}
          <OrderProgressStepper
              currentStatus={frontendStatus}
              timeline={order.timeline}
          />

          {/* Main Content */}
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Left Column - Order Items */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Order Items ({apiOrder.items?.length || 0})</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead className="text-center">Qty</TableHead>
                        <TableHead className="text-right">Unit Price</TableHead>
                        <TableHead className="text-center">Tax</TableHead>
                        <TableHead className="text-right">Tax Amt</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {apiOrder.items.map((item, index) => {
                        const product = productLookup[item.productId];
                        const unitPrice = item.quotedPrice || item.targetPrice || item.price || 0;
                        const quantity = item.quantity || 1;
                        const lineSubtotal = quantity * unitPrice;
                        // Get tax rate from product in inventory, default 18%
                        const taxPercentage = product?.taxRate || 18;
                        const taxAmount = lineSubtotal * (taxPercentage / 100);
                        const lineTotal = lineSubtotal + taxAmount;

                        return (
                            <TableRow key={index}>
                              <TableCell>
                                <div>
                                  <p className="font-medium">
                                    {product?.name || `Product ${item.productId?.slice(-6) || index + 1}`}
                                  </p>
                                  {product?.sku && (
                                      <p className="text-xs text-muted-foreground">
                                        SKU: {product.sku}
                                      </p>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-center">
                                {quantity} pieces
                              </TableCell>
                              <TableCell className="text-right">
                                ₹{unitPrice.toLocaleString()}
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-amber-200">
                                  {taxPercentage}%
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right text-muted-foreground">
                                ₹{Math.round(taxAmount).toLocaleString()}
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                ₹{Math.round(lineTotal).toLocaleString()}
                              </TableCell>
                            </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>

                  <Separator className="my-4" />

                  {/* Summary Section - With inline editing */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>₹{(() => {
                        const sub = apiOrder.items.reduce((sum, item) => {
                          const price = item.quotedPrice || item.targetPrice || item.price || 0;
                          return sum + ((item.quantity || 1) * price);
                        }, 0);
                        return sub.toLocaleString();
                      })()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total Tax</span>
                      <span>₹{(() => {
                        const tax = apiOrder.items.reduce((sum, item) => {
                          const product = productLookup[item.productId];
                          const price = item.quotedPrice || item.targetPrice || item.price || 0;
                          const lineSubtotal = (item.quantity || 1) * price;
                          // Get tax rate from product in inventory, default 18%
                          const taxPercent = product?.taxRate || 18;
                          return sum + (lineSubtotal * (taxPercent / 100));
                        }, 0);
                        return Math.round(tax).toLocaleString();
                      })()}</span>
                    </div>

                    {/* Shipping - Editable in edit mode */}
                    <div className="flex justify-between text-sm items-center">
                      <span className="text-muted-foreground">Shipping</span>
                      {isEditMode ? (
                          <div className="flex items-center gap-1">
                            <span className="text-muted-foreground">₹</span>
                            <Input
                                type="number"
                                min={0}
                                value={editFormData.shippingCost}
                                onChange={(e) => setEditFormData(prev => ({ ...prev, shippingCost: Number(e.target.value) || 0 }))}
                                className="w-24 h-8 text-right"
                            />
                          </div>
                      ) : (
                          <span>{(apiOrder.shippingCost || 0) > 0 ? `₹${apiOrder.shippingCost.toLocaleString()}` : 'Free'}</span>
                      )}
                    </div>

                    {/* Discount - Editable in edit mode */}
                    <div className="flex justify-between text-sm items-center">
                      <span className="text-green-600">Discount</span>
                      {isEditMode ? (
                          <div className="flex items-center gap-1">
                            <span className="text-green-600">-₹</span>
                            <Input
                                type="number"
                                min={0}
                                value={editFormData.discount}
                                onChange={(e) => setEditFormData(prev => ({ ...prev, discount: Number(e.target.value) || 0 }))}
                                className="w-24 h-8 text-right"
                            />
                          </div>
                      ) : (
                          <span className={apiOrder.discount > 0 ? 'text-green-600' : ''}>
                            {apiOrder.discount > 0 ? `-₹${apiOrder.discount.toLocaleString()}` : '₹0'}
                          </span>
                      )}
                    </div>

                    <Separator className="my-2" />
                    <div className="flex justify-between font-semibold text-lg">
                      <span>Grand Total</span>
                      <span>₹{(() => {
                        const sub = apiOrder.items.reduce((sum, item) => {
                          const price = item.quotedPrice || item.targetPrice || item.price || 0;
                          return sum + ((item.quantity || 1) * price);
                        }, 0);
                        const tax = apiOrder.items.reduce((sum, item) => {
                          const product = productLookup[item.productId];
                          const price = item.quotedPrice || item.targetPrice || item.price || 0;
                          const lineSubtotal = (item.quantity || 1) * price;
                          // Get tax rate from product in inventory, default 18%
                          const taxPercent = product?.taxRate || 18;
                          return sum + (lineSubtotal * (taxPercent / 100));
                        }, 0);
                        // Use editFormData values if in edit mode, otherwise use apiOrder values
                        const shipping = isEditMode ? editFormData.shippingCost : (apiOrder.shippingCost || 0);
                        const discount = isEditMode ? editFormData.discount : (apiOrder.discount || 0);
                        const total = sub + tax + shipping - discount;
                        return Math.round(total).toLocaleString();
                      })()}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Notes - Editable in edit mode */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  {isEditMode ? (
                      <Textarea
                          value={editFormData.notes}
                          onChange={(e) => setEditFormData(prev => ({ ...prev, notes: e.target.value }))}
                          placeholder="Add notes about this order..."
                          rows={3}
                          className="w-full"
                      />
                  ) : order.notes ? (
                      <p className="text-sm bg-muted p-3 rounded">{order.notes}</p>
                  ) : (
                      <p className="text-sm text-muted-foreground">No notes added</p>
                  )}
                </CardContent>
              </Card>

              {/* Invoice Section - Single Card matching screenshot layout */}
              {['order_booked', 'confirmed', 'processing', 'shipped', 'delivered', 'completed'].includes(frontendStatus) ? (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        <FileText className="h-4 w-4" />
                        Invoices for this Order
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {invoices.length > 0 ? (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Invoice No</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {invoices.map((invoice) => (
                                  <TableRow key={invoice.id}>
                                    <TableCell>
                                      <Button
                                          variant="link"
                                          className="p-0 h-auto font-medium text-primary"
                                          onClick={() => handleViewInvoice(invoice)}
                                      >
                                        {invoice.invoiceNumber}
                                      </Button>
                                    </TableCell>
                                    <TableCell>
                                      {invoice.type === 'proforma' ? (
                                          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                                            Proforma
                                          </Badge>
                                      ) : (
                                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                            Tax Invoice
                                          </Badge>
                                      )}
                                    </TableCell>
                                    <TableCell>{format(new Date(invoice.invoiceDate), 'PP')}</TableCell>
                                    <TableCell className="text-right font-medium">
                                      {formatCurrency(invoice.grandTotal)}
                                    </TableCell>
                                    <TableCell>
                                      {invoice.status === 'draft' && <Badge variant="secondary">Draft</Badge>}
                                      {invoice.status === 'sent' && <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">Sent</Badge>}
                                      {invoice.status === 'paid' && <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Paid</Badge>}
                                      {invoice.status === 'cancelled' && <Badge variant="destructive">Cancelled</Badge>}
                                    </TableCell>
                                    <TableCell className="text-right">
                                      <div className="flex justify-end gap-1">
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8"
                                                onClick={() => handleViewInvoice(invoice)}
                                            >
                                              <Eye className="h-4 w-4" />
                                            </Button>
                                          </TooltipTrigger>
                                          <TooltipContent>View Invoice</TooltipContent>
                                        </Tooltip>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8"
                                                onClick={() => handleDownloadInvoicePDF(invoice)}
                                            >
                                              <Download className="h-4 w-4" />
                                            </Button>
                                          </TooltipTrigger>
                                          <TooltipContent>Download PDF</TooltipContent>
                                        </Tooltip>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8"
                                                onClick={() => handlePrintInvoice(invoice)}
                                            >
                                              <Printer className="h-4 w-4" />
                                            </Button>
                                          </TooltipTrigger>
                                          <TooltipContent>Print</TooltipContent>
                                        </Tooltip>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8"
                                                onClick={() => handleSendInvoice(invoice)}
                                            >
                                              <Send className="h-4 w-4" />
                                            </Button>
                                          </TooltipTrigger>
                                          <TooltipContent>Send to Customer</TooltipContent>
                                        </Tooltip>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                      ) : (
                          <div className="text-center py-8">
                            <FileText className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                            <p className="text-sm text-muted-foreground mb-2">
                              No invoices generated yet.
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Invoices will be auto-generated based on order status.
                            </p>
                          </div>
                      )}
                    </CardContent>
                  </Card>
              ) : (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        <FileText className="h-4 w-4" />
                        Invoices for this Order
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center py-6">
                        <FileText className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                        <p className="text-sm text-muted-foreground">
                          Invoices will be available once the order is confirmed.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
              )}
            </div>

            {/* Right Column - Customer & Address */}
            <div className="space-y-6">
              {/* Customer Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center justify-between">
                                    <span className="flex items-center gap-2">
                                        <User className="h-4 w-4" />
                                        Customer
                                    </span>
                    {linkedCustomer && (
                        <Link
                            to={`/customers/${linkedCustomer._id}`}
                            className="text-xs text-primary hover:underline flex items-center gap-1"
                        >
                          View Profile
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {customersLoading ? (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Loading...</span>
                      </div>
                  ) : (
                      <>
                        <div>
                          <p className="font-medium">{order.customer.name}</p>
                          {order.customer.company && (
                              <p className="text-sm text-muted-foreground">{order.customer.company}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span>{order.customer.email || 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span>{order.customer.phone || 'N/A'}</span>
                        </div>
                        {linkedCustomer?.gstNumber && (
                            <div className="flex items-center gap-2 text-sm">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                              <span>GST: {linkedCustomer.gstNumber}</span>
                            </div>
                        )}
                      </>
                  )}
                </CardContent>
              </Card>

              {/* Shipping Address */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Shipping Address
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {order.shippingAddress.street || order.shippingAddress.city ? (
                      <div className="text-sm space-y-0.5">
                        {order.shippingAddress.street && <p>{order.shippingAddress.street}</p>}
                        <p>
                          {order.shippingAddress.city}
                          {order.shippingAddress.state && `, ${order.shippingAddress.state}`}
                        </p>
                        {order.shippingAddress.pincode && <p>{order.shippingAddress.pincode}</p>}
                        <p>{order.shippingAddress.country}</p>
                      </div>
                  ) : (
                      <p className="text-sm text-muted-foreground">No shipping address provided</p>
                  )}
                </CardContent>
              </Card>

              {/* Billing Address */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Billing Address
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {order.billingAddress.street || order.billingAddress.city ? (
                      <div className="text-sm space-y-0.5">
                        {order.billingAddress.street && <p>{order.billingAddress.street}</p>}
                        <p>
                          {order.billingAddress.city}
                          {order.billingAddress.state && `, ${order.billingAddress.state}`}
                        </p>
                        {order.billingAddress.pincode && <p>{order.billingAddress.pincode}</p>}
                        <p>{order.billingAddress.country}</p>
                      </div>
                  ) : (
                      <p className="text-sm text-muted-foreground">No billing address provided</p>
                  )}
                </CardContent>
              </Card>

              {/* Order Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Order Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Order ID</span>
                    <span className="font-medium">{order.orderNumber}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Type</span>
                    <Badge variant="outline">
                      {apiOrder.isQuotation ? 'Quotation' : 'Order'}
                    </Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Status</span>
                    <Badge className={`${statusConfig.bgColor} ${statusConfig.color}`}>
                      {statusConfig.label}
                    </Badge>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Created</span>
                    <span>{format(new Date(order.createdAt), 'PP')}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Updated</span>
                    <span>{format(new Date(order.updatedAt), 'PP')}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Send Quote Dialog */}
        <Dialog open={showSendQuoteDialog} onOpenChange={setShowSendQuoteDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Send Quote to Customer</DialogTitle>
              <DialogDescription>
                Review customer's target prices and enter your quoted prices for each product.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Products */}
              {apiOrder.items.map((item, index) => {
                const product = productLookup[item.productId];
                const targetPrice = item.targetPrice || item.price || 0;

                return (
                    <div key={index} className="flex items-center gap-4 p-4 border rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium">
                          {product?.name || `Product ${item.productId.slice(-6)}`}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Qty: {item.quantity} • Customer Target: ₹{targetPrice.toLocaleString()}
                        </p>
                      </div>
                      <div className="w-40">
                        <Label className="text-xs">Your Quote (₹)</Label>
                        <Input
                            type="number"
                            min={0}
                            value={quotedPrices[item.productId] || ''}
                            onChange={(e) => setQuotedPrices(prev => ({
                              ...prev,
                              [item.productId]: Number(e.target.value) || 0
                            }))}
                            placeholder="Enter price"
                        />
                      </div>
                    </div>
                );
              })}

              <Separator />

              {/* Totals comparison */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Customer Target Total</p>
                  <p className="text-xl font-semibold">₹{subtotal.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Your Quoted Total</p>
                  <p className="text-xl font-semibold text-primary">
                    ₹{Object.entries(quotedPrices).reduce((sum, [productId, price]) => {
                    const item = apiOrder.items.find(i => i.productId === productId);
                    return sum + (item?.quantity || 0) * price;
                  }, 0).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Notes */}
              <div>
                <Label>Notes to Customer (Optional)</Label>
                <Textarea
                    value={quoteNotes}
                    onChange={(e) => setQuoteNotes(e.target.value)}
                    placeholder="Add any notes about the quote..."
                    rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowSendQuoteDialog(false)}>
                Cancel
              </Button>
              <Button
                  onClick={handleSendQuote}
                  disabled={sendQuoteMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700"
              >
                {sendQuoteMutation.isPending && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                <Send className="h-4 w-4 mr-2" />
                Send Quote
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Invoice Generator Dialog */}
        {apiOrder && (
            <InvoiceGeneratorDialog
                open={showInvoiceDialog}
                onOpenChange={setShowInvoiceDialog}
                order={{
                  id: apiOrder._id,
                  _id: apiOrder._id,
                  orderNumber: apiOrder.orderNumber,
                  orderId: apiOrder.orderId,
                  customerId: apiOrder.customerId,
                  customer: {
                    id: linkedCustomer?._id || apiOrder.customerId || '',
                    name: linkedCustomer?.contactPerson || linkedCustomer?.businessName || 'Customer',
                    email: linkedCustomer?.email || '',
                    phone: linkedCustomer?.primaryPhone || '',
                    type: 'wholesaler',
                    company: linkedCustomer?.businessName,
                  },
                  items: apiOrder.items.map(item => ({
                    productId: item.productId,
                    productName: productLookup[item.productId]?.name || 'Product',
                    quantity: item.quantity,
                    price: item.quotedPrice || item.price || 0,
                    total: item.quantity * (item.quotedPrice || item.price || 0),
                  })),
                  subtotal: apiOrder.quotedTotal || apiOrder.totalAmount,
                  total: (apiOrder.quotedTotal || apiOrder.totalAmount) + (apiOrder.shippingCost || 0) - (apiOrder.discount || 0),
                  status: frontendStatus,
                  createdAt: apiOrder.createdAt,
                  updatedAt: apiOrder.updatedAt,
                  billingAddress: {
                    street: linkedCustomer?.billingAddress?.streetAddress || '',
                    city: linkedCustomer?.billingAddress?.city || '',
                    state: linkedCustomer?.billingAddress?.state || 'Maharashtra',
                    pincode: linkedCustomer?.billingAddress?.pinCode || '',
                    country: 'India',
                  },
                  shippingAddress: {
                    street: apiOrder.shippingAddress?.streetAddress || '',
                    city: apiOrder.shippingAddress?.city || '',
                    state: apiOrder.shippingAddress?.state || 'Maharashtra',
                    pincode: apiOrder.shippingAddress?.pinCode || '',
                    country: 'India',
                  },
                  shippingCost: apiOrder.shippingCost || 0,
                  discount: apiOrder.discount || 0,
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                } as any}
                invoiceType={invoiceType}
                onInvoiceSaved={handleInvoiceSaved}
            />
        )}

        {/* Invoice View Dialog */}
        <InvoiceViewDialog
            open={viewInvoiceDialogOpen}
            onOpenChange={setViewInvoiceDialogOpen}
            invoice={selectedInvoice}
            onPrint={handleDialogPrint}
            onDownload={handleDialogDownload}
            onSend={handleDialogSend}
            printRef={printRef}
        />
      </DashboardLayout>
  );
}
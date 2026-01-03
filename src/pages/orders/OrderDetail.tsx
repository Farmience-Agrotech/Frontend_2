// =============================================================================
// Admin OrderDetail.tsx - Order/Quotation Detail Page with Full Negotiation
// =============================================================================

import { useState, useMemo, useRef, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
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
  Eye,
  Check,
  XCircle,
  ArrowRightLeft,
} from 'lucide-react';

// Invoice Components
import { InvoiceViewDialog } from '@/components/invoices/InvoiceViewDialog';
import { ProductionSourcingDialog } from '@/components/orders/ProductionSourcingDialog';
import { GeneratedInvoice, InvoiceType } from '@/types/invoice';
import { useReactToPrint } from 'react-to-print';
import html2pdf from 'html2pdf.js';
import { format } from 'date-fns';
import { ORDER_STATUS_CONFIG, OrderStatus, Order } from '@/types/order';
import { cn } from '@/lib/utils';
import { usePermissions } from '@/hooks/usePermissions';
import { useToast } from '@/hooks/use-toast';

// Hooks
import {
  useOrders,
  useUpdateOrder,
  useUpdateQuotation,
  useProducts,
  useCustomers,
  useSendQuote,
  useAcceptCounter,
  useRejectCounter,
  useAcceptQuoteRequest,
  useRejectQuoteRequest,
  useUpdateOrderStatus,
} from '@/hooks/useApi';
import type { ApiCustomer } from '@/api/customers.api';
import type { ApiOrder } from '@/api/orders.api';

// =============================================================================
// NOTE HELPERS - Format and Parse Notes with Timestamps
// =============================================================================

interface ParsedNote {
  timestamp: string;
  status: string;
  text: string;
}

// Format a new note with timestamp and status
const formatNoteWithTimestamp = (note: string, status: string, existingNotes?: string): string => {
  if (!note.trim()) return existingNotes || '';

  const timestamp = format(new Date(), 'MMM dd, yyyy hh:mm a');
  const statusLabel = status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const newNote = `[${timestamp} | ${statusLabel}]\n${note.trim()}`;

  if (existingNotes && existingNotes.trim()) {
    return `${existingNotes}\n\n${newNote}`;
  }
  return newNote;
};

// Parse notes string into array of structured notes
const parseNotes = (notesString?: string): ParsedNote[] => {
  if (!notesString) return [];

  const noteBlocks = notesString.split(/\n\n+/);
  const parsedNotes: ParsedNote[] = [];

  for (const block of noteBlocks) {
    const match = block.match(/^\[(.+?)\s*\|\s*(.+?)\]\n?([\s\S]*)/);
    if (match) {
      parsedNotes.push({
        timestamp: match[1].trim(),
        status: match[2].trim(),
        text: match[3].trim(),
      });
    } else if (block.trim()) {
      // Legacy note without timestamp
      parsedNotes.push({
        timestamp: 'Unknown date',
        status: 'Note',
        text: block.trim(),
      });
    }
  }

  return parsedNotes;
};

// Get status color for note badge
const getNoteStatusColor = (status: string): string => {
  const statusLower = status.toLowerCase().replace(/\s/g, '_');
  const colors: Record<string, string> = {
    'quote_requested': 'bg-orange-100 text-orange-800 border-orange-200',
    'quote_sent': 'bg-cyan-100 text-cyan-800 border-cyan-200',
    'negotiation': 'bg-purple-100 text-purple-800 border-purple-200',
    'order_booked': 'bg-emerald-100 text-emerald-800 border-emerald-200',
    'processing': 'bg-blue-100 text-blue-800 border-blue-200',
    'shipped': 'bg-indigo-100 text-indigo-800 border-indigo-200',
    'delivered': 'bg-green-100 text-green-800 border-green-200',
    'cancelled': 'bg-red-100 text-red-800 border-red-200',
    'rejected': 'bg-red-100 text-red-800 border-red-200',
  };
  return colors[statusLower] || 'bg-gray-100 text-gray-800 border-gray-200';
};

// =============================================================================
// TAX CALCULATION HELPERS - Reverse calculate tax from price with tax included
// =============================================================================

const calculateTaxBreakdown = (priceWithTax: number, taxRate: number) => {
  if (!taxRate || taxRate === 0) {
    return { basePrice: priceWithTax, taxAmount: 0, taxRate: 0 };
  }
  const basePrice = priceWithTax / (1 + taxRate / 100);
  const taxAmount = priceWithTax - basePrice;
  return {
    basePrice: Math.round(basePrice * 100) / 100,
    taxAmount: Math.round(taxAmount * 100) / 100,
    taxRate: taxRate,
  };
};

// =============================================================================
// STATUS MAPPING - FIXED!
// =============================================================================

const mapApiStatusToFrontend = (apiStatus: string): OrderStatus => {
  const statusMap: Record<string, OrderStatus> = {
    // Frontend lowercase statuses
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
    // Backend quotation statuses (FIXED MAPPING!)
    'PENDING': 'quote_requested',      // Admin needs to respond
    'QUOTE_SENT': 'quote_sent',        // Customer needs to respond
    'NEGOTIATING': 'negotiation',      // Admin needs to respond to counter
    'ACCEPTED': 'order_booked',        // Deal done!
    'REJECTED': 'rejected',            // No deal
    // Uppercase variants
    'QUOTE_REQUESTED': 'quote_requested',
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
  const queryClient = useQueryClient();

  // Data fetching
  const { data: apiOrders, isLoading: ordersLoading, error, refetch } = useOrders();
  const { data: apiProducts, isLoading: productsLoading } = useProducts();
  const { data: customers, isLoading: customersLoading } = useCustomers();
  const updateOrderMutation = useUpdateOrder();
  const updateQuotationMutation = useUpdateQuotation();
  const sendQuoteMutation = useSendQuote();
  const acceptCounterMutation = useAcceptCounter();
  const rejectCounterMutation = useRejectCounter();
  const acceptQuoteRequestMutation = useAcceptQuoteRequest();
  const rejectQuoteRequestMutation = useRejectQuoteRequest();
  const updateStatusMutation = useUpdateOrderStatus();

  // State
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showSendQuoteDialog, setShowSendQuoteDialog] = useState(false);
  const [quotedPrices, setQuotedPrices] = useState<Record<string, number>>({});
  const [quoteNotes, setQuoteNotes] = useState('');
  const [showProcessingDialog, setShowProcessingDialog] = useState(false);
  const [showProductionSourcingDialog, setShowProductionSourcingDialog] = useState(false);
  const [showShippedDialog, setShowShippedDialog] = useState(false);
  const [showDeliveredDialog, setShowDeliveredDialog] = useState(false);
  const [transitionNote, setTransitionNote] = useState('');
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  // Confirmation dialogs
  const [showAcceptDialog, setShowAcceptDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  // Edit form state
  const [editFormData, setEditFormData] = useState({
    status: '',
    notes: '',
    shippingCost: 0,
    discount: 0,
  });

  // Invoice state - Auto-generated based on timeline
  const [invoices, setInvoices] = useState<GeneratedInvoice[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<GeneratedInvoice | null>(null);
  const [viewInvoiceDialogOpen, setViewInvoiceDialogOpen] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  // Print handler
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: selectedInvoice ? `Invoice-${selectedInvoice.invoiceNumber}` : 'Invoice',
  });

  // Track if invoices have been auto-generated
  const [invoicesGenerated, setInvoicesGenerated] = useState<{ proforma: boolean; tax: boolean }>({
    proforma: false,
    tax: false,
  });

  // Product lookup
  const productLookup = useMemo(() => {
    if (!apiProducts) return {};
    const lookup: Record<string, { name: string; sku: string; price: number; taxRate: number; hsnCode: string; unit: string }> = {};
    (apiProducts as Array<{ _id: string; name: string; sku?: string; minPrice?: number; price?: number; taxRate?: number; gstRate?: number; tax?: number; hsnCode?: string; unit?: string }>).forEach((product) => {
      lookup[product._id] = {
        name: product.name,
        sku: product.sku || '',
        price: product.minPrice || product.price || 0,
        taxRate: product.taxRate || product.gstRate || product.tax || 18,
        hsnCode: product.hsnCode || '8483',
        unit: product.unit || 'PCS',
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
  // AUTO-GENERATE INVOICES
  // =============================================================================

  const createInvoiceObject = (type: InvoiceType): GeneratedInvoice | null => {
    if (!apiOrder || !linkedCustomer) return null;
    if (!apiOrder.items || apiOrder.items.length === 0) return null;

    try {
      const now = new Date();
      const dueDate = new Date(now);
      dueDate.setDate(dueDate.getDate() + 30);

      const orderIdShort = apiOrder._id?.slice(-8)?.toUpperCase() || 'UNKNOWN';
      const invoicePrefix = type === 'proforma' ? 'PI' : 'TI';
      const invoiceNumber = `${invoicePrefix}-${apiOrder.orderNumber || orderIdShort}`;

      const invoiceItems = (apiOrder.items || []).map((item, index) => {
        const product = productLookup[item.productId || ''];
        const itemTaxRate = product?.taxRate || 18;

        // Get the total price (includes tax)
        const priceWithTax = item.quotedPrice || item.targetPrice || item.price || 0;

        // Reverse calculate base price and tax (same as Order Items table)
        const { basePrice, taxAmount: itemTax } = calculateTaxBreakdown(priceWithTax, itemTaxRate);

        const qty = item.quantity || 1;
        const taxableValue = Math.round(basePrice * qty * 100) / 100;
        const taxAmountTotal = Math.round(itemTax * qty * 100) / 100;

        return {
          id: `item-${index}`,
          hsnCode: product?.hsnCode || '8483',
          description: product?.name || item.name || `Product ${(item.productId || '').slice(-6) || index + 1}`,
          qty: qty,
          unit: product?.unit || 'PCS',
          rate: Math.round(basePrice * 100) / 100,
          taxableValue: taxableValue,
          taxPercentage: itemTaxRate,
          taxAmount: taxAmountTotal,
        };
      });

      // Calculate totals from invoice items
      const subtotal = invoiceItems.reduce((sum, item) => sum + item.taxableValue, 0);
      const taxAmount = invoiceItems.reduce((sum, item) => sum + (item.taxAmount || 0), 0);

      const shippingCost = apiOrder.shippingCost || 0;
      const discount = apiOrder.discount || 0;
      const grandTotal = subtotal + taxAmount + shippingCost - discount;

      const sellerState = 'Karnataka';
      const buyerState = linkedCustomer?.billingAddress?.state || apiOrder.shippingAddress?.state || 'Karnataka';
      const isInterState = sellerState !== buyerState;

      // State code lookup
      const stateCodes: Record<string, string> = {
        'Karnataka': '29',
        'Tamil Nadu': '33',
        'Maharashtra': '27',
        'Delhi': '07',
        'Gujarat': '24',
        'Telangana': '36',
        'Andhra Pradesh': '37',
        'Kerala': '32',
        'Uttar Pradesh': '09',
        'West Bengal': '19',
        'Rajasthan': '08',
        'Punjab': '03',
      };
      const buyerStateCode = stateCodes[buyerState] || '29';

      const invoice: GeneratedInvoice = {
        id: `inv-${Date.now()}-${type}`,
        orderId: apiOrder._id,
        orderNumber: apiOrder.orderNumber || orderIdShort,
        type: type,
        invoiceNumber: invoiceNumber,
        invoiceDate: now.toISOString(),
        dueDate: dueDate.toISOString(),
        placeOfSupply: `${buyerState} (${buyerStateCode})`,
        seller: {
          companyName: 'ARIHANT UNIFORM',
          address: '1ST FLOOR, 147/8, MYSORE ROAD A.R COMPOUND, Chamarajpet',
          city: 'Bengaluru',
          state: sellerState,
          pin: '560018',
          gstin: '29GOTPK6376A1ZC',
          pan: 'GOTPK6376A',
          stateCode: '29',
        },
        buyer: {
          customerName: linkedCustomer?.contactPerson || linkedCustomer?.businessName || 'Customer',
          companyName: linkedCustomer?.businessName || '',
          gstin: linkedCustomer?.gstNumber || '',
          stateCode: buyerStateCode,
        },
        billingAddress: {
          street: linkedCustomer?.billingAddress?.street || linkedCustomer?.billingAddress?.streetAddress || '',
          city: linkedCustomer?.billingAddress?.city || '',
          state: linkedCustomer?.billingAddress?.state || '',
          pin: linkedCustomer?.billingAddress?.pinCode || '',
        },
        shippingAddress: {
          street: apiOrder.shippingAddress?.streetAddress || linkedCustomer?.deliveryAddresses?.[0]?.street || '',
          city: apiOrder.shippingAddress?.city || linkedCustomer?.deliveryAddresses?.[0]?.city || '',
          state: apiOrder.shippingAddress?.state || linkedCustomer?.deliveryAddresses?.[0]?.state || '',
          pin: apiOrder.shippingAddress?.pinCode || linkedCustomer?.deliveryAddresses?.[0]?.pinCode || '',
        },
        items: invoiceItems,
        subtotal: Math.round(subtotal * 100) / 100,
        cgst: isInterState ? 0 : Math.round(taxAmount / 2 * 100) / 100,
        sgst: isInterState ? 0 : Math.round(taxAmount / 2 * 100) / 100,
        igst: isInterState ? Math.round(taxAmount * 100) / 100 : 0,
        shippingCost: shippingCost,
        discount: discount,
        discountPercent: subtotal > 0 ? Math.round((discount / subtotal) * 100) : 0,
        roundOff: Math.round(grandTotal) - grandTotal,
        grandTotal: Math.round(grandTotal),
        bankDetails: {
          accountName: 'KIRAN N JAIN',
          accountNumber: '',
          ifsc: '',
          bankName: '',
        },
        terms: [
          'Payment due within 30 days',
          'Goods once sold will not be taken back',
          'Subject to Bengaluru jurisdiction',
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

  const frontendStatusForInvoice = apiOrder ? mapApiStatusToFrontend(apiOrder.status) : null;

  useEffect(() => {
    if (!apiOrder || !linkedCustomer || !frontendStatusForInvoice) return;
    if (Object.keys(productLookup).length === 0) return;

    try {
      if (frontendStatusForInvoice === 'order_booked' && !invoicesGenerated.proforma) {
        const proformaInvoice = createInvoiceObject('proforma');
        if (proformaInvoice) {
          setInvoices(prev => [...prev, proformaInvoice]);
          setInvoicesGenerated(prev => ({ ...prev, proforma: true }));
        }
      }

      if (['shipped', 'delivered', 'completed'].includes(frontendStatusForInvoice) && !invoicesGenerated.tax) {
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

  // Initialize quoted prices
  const initializeQuotedPrices = () => {
    if (!apiOrder) return;
    const prices: Record<string, number> = {};
    apiOrder.items.forEach(item => {
      prices[item.productId] = item.quotedPrice || item.targetPrice || item.price || 0;
    });
    setQuotedPrices(prices);
  };

  // =============================================================================
  // ACTION HANDLERS
  // =============================================================================

  // Send Quote (sets status to QUOTE_SENT)
  const handleSendQuote = async () => {
    if (!apiOrder) return;

    try {
      const products = apiOrder.items.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        targetPrice: item.targetPrice || item.price,
        quotedPrice: quotedPrices[item.productId] || item.price,
      }));

      // Append note with timestamp
      const updatedNotes = quoteNotes
          ? formatNoteWithTimestamp(quoteNotes, 'Quote Sent', apiOrder.notes)
          : apiOrder.notes;

      await sendQuoteMutation.mutateAsync({
        quotationId: apiOrder._id,
        products,
        notes: updatedNotes || undefined,
      });

      setShowSendQuoteDialog(false);
      setQuotedPrices({});
      setQuoteNotes('');
      refetch();
    } catch (error) {
      console.error('Failed to send quote:', error);
    }
  };

  // Accept (customer's price or counter-offer)
  const handleAccept = async () => {
    if (!apiOrder) return;

    try {
      const products = apiOrder.items.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        targetPrice: item.targetPrice || item.price,
        quotedPrice: item.quotedPrice || item.targetPrice || item.price,
      }));

      if (frontendStatus === 'quote_requested') {
        // Accept initial quote request
        await acceptQuoteRequestMutation.mutateAsync({
          quotationId: apiOrder._id,
          products: products.map(p => ({
            productId: p.productId,
            quantity: p.quantity,
            targetPrice: p.targetPrice,
          })),
        });
      } else {
        // Accept counter-offer
        await acceptCounterMutation.mutateAsync({
          quotationId: apiOrder._id,
          products,
        });
      }

      setShowAcceptDialog(false);
      refetch();
    } catch (error) {
      console.error('Failed to accept:', error);
    }
  };

  // Reject (customer's price or counter-offer)
  const handleReject = async () => {
    if (!apiOrder) return;

    try {
      if (frontendStatus === 'quote_requested') {
        await rejectQuoteRequestMutation.mutateAsync({
          quotationId: apiOrder._id,
          reason: rejectReason || undefined,
        });
      } else {
        await rejectCounterMutation.mutateAsync({
          quotationId: apiOrder._id,
          reason: rejectReason || undefined,
        });
      }

      setShowRejectDialog(false);
      setRejectReason('');
      refetch();
    } catch (error) {
      console.error('Failed to reject:', error);
    }
  };

  // =============================================================================
  // STATUS TRANSITION HANDLERS (Post-booking stages)
  // =============================================================================

  // Handle transition to Processing
  const handleConfirmProcessing = async () => {
    if (!apiOrder) return;

    try {
      // Append note with timestamp
      const updatedNotes = transitionNote
          ? formatNoteWithTimestamp(transitionNote, 'Processing', apiOrder.notes)
          : apiOrder.notes;

      await updateStatusMutation.mutateAsync({
        orderId: apiOrder.orderId || apiOrder._id,
        newStatus: 'processing',
        note: updatedNotes || undefined,
      });

      toast({
        title: 'Order Processing Started',
        description: 'Order has been moved to processing stage.',
      });

      setShowProcessingDialog(false);
      setTransitionNote('');
      refetch();
    } catch (error) {
      console.error('Failed to update status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update order status.',
        variant: 'destructive',
      });
    }
  };

  // Handle transition to Shipped
  const handleConfirmShipped = async () => {
    if (!apiOrder) return;

    try {
      // Append note with timestamp
      const updatedNotes = transitionNote
          ? formatNoteWithTimestamp(transitionNote, 'Shipped', apiOrder.notes)
          : apiOrder.notes;

      await updateStatusMutation.mutateAsync({
        orderId: apiOrder.orderId || apiOrder._id,
        newStatus: 'shipped',
        note: updatedNotes || undefined,
      });

      toast({
        title: 'Shipment Booked',
        description: 'Order has been marked as shipped.',
      });

      setShowShippedDialog(false);
      setTransitionNote('');
      refetch();
    } catch (error) {
      console.error('Failed to update status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update order status.',
        variant: 'destructive',
      });
    }
  };

  // Handle transition to Delivered
  const handleConfirmDelivered = async () => {
    if (!apiOrder) return;

    try {
      // Append note with timestamp
      const updatedNotes = transitionNote
          ? formatNoteWithTimestamp(transitionNote, 'Delivered', apiOrder.notes)
          : apiOrder.notes;

      await updateStatusMutation.mutateAsync({
        orderId: apiOrder.orderId || apiOrder._id,
        newStatus: 'delivered',
        note: updatedNotes || undefined,
      });

      toast({
        title: 'Order Delivered',
        description: 'Order has been marked as delivered.',
      });

      setShowDeliveredDialog(false);
      setTransitionNote('');
      refetch();
    } catch (error) {
      console.error('Failed to update status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update order status.',
        variant: 'destructive',
      });
    }
  };

  const handleConfirmCancel = async () => {
    if (!apiOrder) return;

    try {
      // Check if it's a quotation
      const isQuotation = apiOrder.isQuotation ||
          apiOrder.orderNumber?.startsWith('QUO') ||
          apiOrder.orderId?.startsWith('QUO');

      if (isQuotation) {
        // Use updateQuotation for quotations
        await updateQuotationMutation.mutateAsync({
          quotationId: apiOrder._id,
          data: { status: 'REJECTED' },
        });
      } else {
        // Use updateOrderStatus for regular orders
        await updateStatusMutation.mutateAsync({
          orderId: apiOrder.orderId || apiOrder._id,
          newStatus: 'cancelled',
        });
      }

      // Invalidate queries to refresh data on Orders page
      await queryClient.invalidateQueries({ queryKey: ['orders'] });
      await queryClient.invalidateQueries({ queryKey: ['quotations'] });

      toast({
        title: 'Order Cancelled',
        description: `Order ${apiOrder.orderNumber || apiOrder.orderId} has been cancelled.`,
      });

      setShowCancelDialog(false);
      navigate('/orders');
    } catch (error) {
      console.error('Failed to cancel order:', error);
      toast({
        title: 'Error',
        description: 'Failed to cancel order. Please try again.',
        variant: 'destructive',
      });
    }
  };


  // Initialize edit form
  const initializeEditForm = () => {
    if (!apiOrder) return;
    setEditFormData({
      status: apiOrder.status,
      notes: apiOrder.notes || '',
      shippingCost: apiOrder.shippingCost || 0,
      discount: apiOrder.discount || 0,
    });
  };

  // Handle edit save
  const handleEditSave = async () => {
    if (!apiOrder) return;

    try {
      // Calculate updated totalAmount
      let totalBasePrice = 0;
      let totalTax = 0;

      apiOrder.items.forEach(item => {
        const product = productLookup[item.productId];
        const quotedPrice = item.quotedPrice || item.targetPrice || item.price || 0;
        const taxRate = product?.taxRate || 0;
        const { basePrice, taxAmount } = calculateTaxBreakdown(quotedPrice, taxRate);
        totalBasePrice += basePrice * item.quantity;
        totalTax += taxAmount * item.quantity;
      });

      const newTotalAmount = Math.round(
          (totalBasePrice + totalTax + editFormData.shippingCost - editFormData.discount) * 100
      ) / 100;

      if (apiOrder.isQuotation) {
        await updateQuotationMutation.mutateAsync({
          quotationId: apiOrder._id,
          data: {
            notes: editFormData.notes,
            shippingCost: editFormData.shippingCost,
            discount: editFormData.discount,
            totalAmount: newTotalAmount,
          },
        });
      } else {
        await updateOrderMutation.mutateAsync({
          id: apiOrder._id,
          data: {
            orderId: apiOrder.orderId || apiOrder.orderNumber,
            orderNumber: apiOrder.orderNumber,
            notes: editFormData.notes,
            shippingCost: editFormData.shippingCost,
            discount: editFormData.discount,
            totalAmount: newTotalAmount,
          },
        });
      }

      toast({
        title: 'Changes Saved',
        description: 'Order has been updated successfully.',
      });

      setIsEditMode(false);
      refetch();
    } catch (error) {
      console.error('Failed to save:', error);
      toast({
        title: 'Error',
        description: 'Failed to save changes. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Invoice handlers
  const handleViewInvoice = (invoice: GeneratedInvoice) => {
    setSelectedInvoice(invoice);
    setViewInvoiceDialogOpen(true);
  };

  const handleDialogPrint = () => {
    handlePrint();
  };

  const handleDialogDownload = () => {
    if (printRef.current && selectedInvoice) {
      const element = printRef.current;
      const opt = {
        margin: 0,
        filename: `${selectedInvoice.invoiceNumber}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
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

  // Format currency
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

  // Determine what actions are available
  const isQuotation = apiOrder.isQuotation;
  const needsQuoteResponse = isQuotation && frontendStatus === 'quote_requested';
  const needsCounterResponse = isQuotation && frontendStatus === 'negotiation';
  const needsAdminAction = needsQuoteResponse || needsCounterResponse;
  const awaitingCustomer = isQuotation && frontendStatus === 'quote_sent';
  const isFinal = ['order_booked', 'rejected', 'cancelled'].includes(frontendStatus);

  // Get addresses
  const getShippingAddress = () => {
    if (apiOrder.shippingAddress?.streetAddress || apiOrder.shippingAddress?.city) {
      return {
        street: apiOrder.shippingAddress.streetAddress || '',
        city: apiOrder.shippingAddress.city || '',
        state: apiOrder.shippingAddress.state || '',
        pincode: apiOrder.shippingAddress.pinCode || '',
        country: 'India',
      };
    }

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

    return { street: '', city: '', state: '', pincode: '', country: 'India' };
  };

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

    return { street: '', city: '', state: '', pincode: '', country: 'India' };
  };

  // Build order object
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

  // Calculate customer target vs quoted
  const customerTargetTotal = apiOrder.items.reduce((sum, item) => {
    return sum + (item.quantity * (item.targetPrice || item.price || 0));
  }, 0);

  const companyQuotedTotal = apiOrder.items.reduce((sum, item) => {
    return sum + (item.quantity * (item.quotedPrice || item.targetPrice || item.price || 0));
  }, 0);

  const priceDifference = customerTargetTotal - companyQuotedTotal;
  const priceDifferencePercent = companyQuotedTotal > 0
      ? ((priceDifference / companyQuotedTotal) * 100).toFixed(1)
      : 0;

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
                  {isQuotation && (
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
              {/* Edit Order Button */}
              {canEdit('orders') && !isEditMode && !needsAdminAction && (
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

              {frontendStatus !== 'cancelled' && (
                  <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setShowCancelDialog(true)}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Cancel Order
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

          {/* =================================================================== */}
          {/* ACTION REQUIRED ALERTS */}
          {/* =================================================================== */}

          {/* New Quote Request - Admin can Accept, Reject, or Send Quote */}
          {needsQuoteResponse && (
              <Card className="border-amber-200 bg-amber-50">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <Clock className="h-8 w-8 text-amber-600 mt-1" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg text-amber-800">
                        New Quote Request - Action Required
                      </h3>
                      <p className="text-amber-700 mt-1">
                        Customer is requesting a quote. Review their target prices and choose how to respond:
                      </p>

                      {/* Price Summary */}
                      <div className="mt-4 p-4 bg-white rounded-lg border border-amber-200">
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Customer's Target Total:</span>
                          <span className="text-xl font-bold">₹{customerTargetTotal.toLocaleString()}</span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-wrap gap-3 mt-4">
                        <Button
                            onClick={() => setShowAcceptDialog(true)}
                            className="bg-green-600 hover:bg-green-700"
                        >
                          <Check className="h-4 w-4 mr-2" />
                          Accept Price (₹{customerTargetTotal.toLocaleString()})
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => {
                              initializeQuotedPrices();
                              setShowSendQuoteDialog(true);
                            }}
                        >
                          <Send className="h-4 w-4 mr-2" />
                          Send Different Quote
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => setShowRejectDialog(true)}
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Reject Request
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
          )}

          {/* Counter-Offer Received - Admin can Accept, Reject, or Counter */}
          {needsCounterResponse && (
              <Card className="border-purple-200 bg-purple-50">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <ArrowRightLeft className="h-8 w-8 text-purple-600 mt-1" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg text-purple-800">
                        Customer Counter-Offer Received - Action Required
                      </h3>
                      <p className="text-purple-700 mt-1">
                        Customer has submitted a counter-offer. Review the comparison below and respond:
                      </p>

                      {/* Price Comparison Table */}
                      <div className="mt-4 bg-white rounded-lg border border-purple-200 overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-purple-100">
                              <TableHead>Product</TableHead>
                              <TableHead className="text-center">Qty</TableHead>
                              <TableHead className="text-right">Your Quote</TableHead>
                              <TableHead className="text-right">Customer Wants</TableHead>
                              <TableHead className="text-right">Difference</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {apiOrder.items.map((item, index) => {
                              const product = productLookup[item.productId];
                              const yourPrice = item.quotedPrice || 0;
                              const customerPrice = item.targetPrice || 0;
                              const diff = yourPrice - customerPrice;
                              const diffPercent = yourPrice > 0 ? ((diff / yourPrice) * 100).toFixed(1) : 0;

                              return (
                                  <TableRow key={index}>
                                    <TableCell className="font-medium">
                                      {product?.name || `Product ${item.productId.slice(-6)}`}
                                    </TableCell>
                                    <TableCell className="text-center">{item.quantity}</TableCell>
                                    <TableCell className="text-right">₹{yourPrice.toLocaleString()}</TableCell>
                                    <TableCell className="text-right">₹{customerPrice.toLocaleString()}</TableCell>
                                    <TableCell className="text-right">
                                <span className={diff > 0 ? 'text-red-600' : 'text-green-600'}>
                                  {diff > 0 ? '-' : '+'}₹{Math.abs(diff).toLocaleString()}
                                  <span className="text-xs ml-1">({diffPercent}%)</span>
                                </span>
                                    </TableCell>
                                  </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>

                        {/* Totals Row */}
                        <div className="p-4 bg-purple-50 border-t border-purple-200">
                          <div className="grid grid-cols-3 gap-4 text-center">
                            <div>
                              <p className="text-xs text-muted-foreground">Your Quoted Total</p>
                              <p className="text-lg font-bold">₹{companyQuotedTotal.toLocaleString()}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Customer Wants</p>
                              <p className="text-lg font-bold">₹{customerTargetTotal.toLocaleString()}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Difference</p>
                              <p className={`text-lg font-bold ${priceDifference < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                {priceDifference < 0 ? '-' : '+'}₹{Math.abs(priceDifference).toLocaleString()}
                                <span className="text-sm ml-1">({priceDifferencePercent}%)</span>
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-wrap gap-3 mt-4">
                        <Button
                            onClick={() => setShowAcceptDialog(true)}
                            className="bg-green-600 hover:bg-green-700"
                        >
                          <Check className="h-4 w-4 mr-2" />
                          Accept Counter (₹{customerTargetTotal.toLocaleString()})
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => {
                              initializeQuotedPrices();
                              setShowSendQuoteDialog(true);
                            }}
                        >
                          <Send className="h-4 w-4 mr-2" />
                          Send New Quote
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => setShowRejectDialog(true)}
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Reject & End Negotiation
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
          )}

          {/* Awaiting Customer Response */}
          {awaitingCustomer && (
              <Card className="border-blue-200 bg-blue-50">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <Clock className="h-8 w-8 text-blue-600 mt-1" />
                    <div>
                      <h3 className="font-semibold text-lg text-blue-800">
                        Awaiting Customer Response
                      </h3>
                      <p className="text-blue-700 mt-1">
                        Your quote of ₹{companyQuotedTotal.toLocaleString()} has been sent.
                        Waiting for customer to accept, reject, or counter-offer.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
          )}

          {/* Order Confirmed */}
          {frontendStatus === 'order_booked' && (
              <Card className="border-green-200 bg-green-50">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <Check className="h-8 w-8 text-green-600 mt-1" />
                    <div>
                      <h3 className="font-semibold text-lg text-green-800">
                        Order Confirmed! 🎉
                      </h3>
                      <p className="text-green-700 mt-1">
                        The negotiation is complete. Final order value: ₹{companyQuotedTotal.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
          )}

          {/* Order Rejected */}
          {frontendStatus === 'rejected' && (
              <Card className="border-red-200 bg-red-50">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <XCircle className="h-8 w-8 text-red-600 mt-1" />
                    <div>
                      <h3 className="font-semibold text-lg text-red-800">
                        Quotation Rejected
                      </h3>
                      <p className="text-red-700 mt-1">
                        This quotation has been rejected and the negotiation has ended.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
          )}

          {/* ➕ ADD THIS - Next Stage Actions (Post-booking) */}
          {['order_booked', 'payment_pending', 'paid', 'processing', 'shipped'].includes(frontendStatus) && (
              <Card className="border-blue-200 bg-blue-50">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <Clock className="h-8 w-8 text-blue-600 mt-1" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg text-blue-800">
                        Next Action Required
                      </h3>
                      <p className="text-blue-700 mt-1">
                        {frontendStatus === 'order_booked' && 'Order is confirmed. Ready to start processing?'}
                        {frontendStatus === 'payment_pending' && 'Payment received?. Start processing the order.'}
                        {frontendStatus === 'paid' && 'Ready to ship the order?'}
                        {frontendStatus === 'processing' && 'Order is being processed. Ready to book shipment?'}
                        {frontendStatus === 'shipped' && 'Order has been shipped. Confirm delivery when complete.'}
                      </p>

                      {/* Action Buttons */}
                      <div className="flex flex-wrap gap-3 mt-4">
                        {(frontendStatus === 'order_booked' || frontendStatus === 'payment_pending') && (
                            <Button
                                onClick={() => setShowProductionSourcingDialog(true)}
                                className="bg-blue-600 hover:bg-blue-700"
                            >
                              <Check className="h-4 w-4 mr-2" />
                              Start Processing
                            </Button>
                        )}

                        {frontendStatus === 'paid' && (
                            <Button
                                onClick={() => setShowShippedDialog(true)}
                                className="bg-cyan-600 hover:bg-cyan-700"
                            >
                              <Check className="h-4 w-4 mr-2" />
                              Mark as Shipped
                            </Button>
                        )}

                        {frontendStatus === 'processing' && (
                            <Button
                                onClick={() => setShowShippedDialog(true)}
                                className="bg-cyan-600 hover:bg-cyan-700"
                            >
                              <Check className="h-4 w-4 mr-2" />
                              Mark as Shipped
                            </Button>
                        )}

                        {frontendStatus === 'shipped' && (
                            <Button
                                onClick={() => setShowDeliveredDialog(true)}
                                className="bg-emerald-600 hover:bg-emerald-700"
                            >
                              <Check className="h-4 w-4 mr-2" />
                              Mark as Delivered
                            </Button>
                        )}
                      </div>
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
                        {isQuotation && <TableHead className="text-right">Target Price</TableHead>}
                        <TableHead className="text-right">{isQuotation ? 'Quoted Price' : 'Unit Price'}</TableHead>
                        {!isQuotation && <TableHead className="text-right">Tax</TableHead>}
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {apiOrder.items.map((item, index) => {
                        const product = productLookup[item.productId];
                        const targetPrice = item.targetPrice || item.price || 0;
                        const quotedPrice = item.quotedPrice || item.targetPrice || item.price || 0;
                        const lineTotal = item.quantity * quotedPrice;

                        // Get tax rate from product and calculate breakdown
                        const taxRate = product?.taxRate || 0;
                        const { basePrice, taxAmount } = calculateTaxBreakdown(quotedPrice, taxRate);
                        const lineTax = taxAmount * item.quantity;

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
                                {item.quantity} pcs
                              </TableCell>
                              {isQuotation && (
                                  <TableCell className="text-right">
                                    ₹{targetPrice.toLocaleString()}
                                  </TableCell>
                              )}
                              <TableCell className="text-right">
                                {isQuotation && item.quotedPrice ? (
                                    <span className={item.quotedPrice > targetPrice ? 'text-red-600' : 'text-green-600'}>
                                      ₹{quotedPrice.toLocaleString()}
                                    </span>
                                ) : (
                                    <>
                                      ₹{basePrice.toLocaleString()}
                                      {taxRate > 0 && (
                                          <p className="text-xs text-muted-foreground">
                                            +{taxRate}% GST
                                          </p>
                                      )}
                                    </>
                                )}
                              </TableCell>
                              {!isQuotation && (
                                  <TableCell className="text-right text-muted-foreground">
                                    ₹{lineTax.toLocaleString()}
                                  </TableCell>
                              )}
                              <TableCell className="text-right font-medium">
                                ₹{lineTotal.toLocaleString()}
                              </TableCell>
                            </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>

                  <Separator className="my-4" />

                  {/* Summary Section */}
                  <div className="space-y-2">
                    {isQuotation && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Customer's Target Total</span>
                          <span>₹{customerTargetTotal.toLocaleString()}</span>
                        </div>
                    )}

                    {/* Calculate subtotal and tax breakdown */}
                    {(() => {
                      let totalBasePrice = 0;
                      let totalTax = 0;

                      apiOrder.items.forEach(item => {
                        const product = productLookup[item.productId];
                        const quotedPrice = item.quotedPrice || item.targetPrice || item.price || 0;
                        const taxRate = product?.taxRate || 0;
                        const { basePrice, taxAmount } = calculateTaxBreakdown(quotedPrice, taxRate);
                        totalBasePrice += basePrice * item.quantity;
                        totalTax += taxAmount * item.quantity;
                      });

                      totalBasePrice = Math.round(totalBasePrice * 100) / 100;
                      totalTax = Math.round(totalTax * 100) / 100;

                      const shippingCost = apiOrder.shippingCost || 0;
                      const discount = apiOrder.discount || 0;
                      const grandTotal = totalBasePrice + totalTax + shippingCost - discount;

                      return (
                          <>
                            {/* Subtotal (Base Price) */}
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">{isQuotation ? 'Quoted Total' : 'Subtotal'}</span>
                              <span>₹{totalBasePrice.toLocaleString()}</span>
                            </div>

                            {/* Tax */}
                            {!isQuotation && totalTax > 0 && (
                                <div className="flex justify-between text-sm">
                                  <span className="text-muted-foreground">Tax (GST)</span>
                                  <span>₹{totalTax.toLocaleString()}</span>
                                </div>
                            )}

                            {/* Shipping & Discount */}
                            {isEditMode ? (
                                <>
                                  <div className="flex justify-between text-sm items-center">
                                    <span className="text-muted-foreground">Shipping</span>
                                    <Input
                                        type="number"
                                        className="w-32 text-right"
                                        value={editFormData.shippingCost}
                                        onChange={(e) => setEditFormData(prev => ({
                                          ...prev,
                                          shippingCost: Number(e.target.value) || 0
                                        }))}
                                    />
                                  </div>
                                  <div className="flex justify-between text-sm items-center">
                                    <span className="text-muted-foreground">Discount</span>
                                    <Input
                                        type="number"
                                        className="w-32 text-right"
                                        value={editFormData.discount}
                                        onChange={(e) => setEditFormData(prev => ({
                                          ...prev,
                                          discount: Number(e.target.value) || 0
                                        }))}
                                    />
                                  </div>
                                </>
                            ) : (
                                <>
                                  <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Shipping</span>
                                    <span>₹{shippingCost.toLocaleString()}</span>
                                  </div>
                                  <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Discount</span>
                                    <span className="text-green-600">-₹{discount.toLocaleString()}</span>
                                  </div>
                                </>
                            )}

                            <Separator />

                            {/* Grand Total */}
                            <div className="flex justify-between font-semibold text-lg">
                              <span>Total</span>
                              <span>₹{grandTotal.toLocaleString()}</span>
                            </div>
                          </>
                      );
                    })()}
                  </div>
                </CardContent>
              </Card>

              {/* Notes Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Notes History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isEditMode ? (
                      <Textarea
                          value={editFormData.notes}
                          onChange={(e) => setEditFormData(prev => ({ ...prev, notes: e.target.value }))}
                          placeholder="Add notes..."
                          rows={4}
                      />
                  ) : (
                      <div className="space-y-4">
                        {parseNotes(apiOrder.notes).length > 0 ? (
                            parseNotes(apiOrder.notes).map((note, index) => (
                                <div key={index} className="border rounded-lg p-3 bg-muted/30">
                                  <div className="flex items-center justify-between mb-2">
                      <span className={cn(
                          'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border',
                          getNoteStatusColor(note.status)
                      )}>
                        {note.status}
                      </span>
                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                                      {note.timestamp}
                      </span>
                                  </div>
                                  <p className="text-sm text-foreground">{note.text}</p>
                                </div>
                            ))
                        ) : (
                            <p className="text-muted-foreground text-sm">No notes yet</p>
                        )}
                      </div>
                  )}
                </CardContent>
              </Card>

              {/* Invoices Section - Auto-generated based on status */}
              {invoices.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Invoices</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Invoice #</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {invoices.map((invoice) => (
                              <TableRow key={invoice.id}>
                                <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                                <TableCell>
                                  <Badge variant={invoice.type === 'proforma' ? 'outline' : 'default'}>
                                    {invoice.type === 'proforma' ? 'Proforma' : 'Tax Invoice'}
                                  </Badge>
                                </TableCell>
                                <TableCell>{format(new Date(invoice.invoiceDate), 'PP')}</TableCell>
                                <TableCell className="text-right">₹{invoice.grandTotal.toLocaleString()}</TableCell>
                                <TableCell className="text-right">
                                  <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleViewInvoice(invoice)}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
              )}
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Customer Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Customer
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="font-medium">{linkedCustomer?.contactPerson || linkedCustomer?.businessName || 'Unknown'}</p>
                    {linkedCustomer?.businessName && linkedCustomer?.contactPerson && (
                        <p className="text-sm text-muted-foreground">{linkedCustomer.businessName}</p>
                    )}
                  </div>
                  {linkedCustomer?.email && (
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span>{linkedCustomer.email}</span>
                      </div>
                  )}
                  {linkedCustomer?.primaryPhone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{linkedCustomer.primaryPhone}</span>
                      </div>
                  )}
                  {linkedCustomer && (
                      <Button variant="link" className="p-0 h-auto" asChild>
                        <Link to={`/customers/${linkedCustomer._id}`}>
                          View Customer Profile
                          <ExternalLink className="h-3 w-3 ml-1" />
                        </Link>
                      </Button>
                  )}
                </CardContent>
              </Card>

              {/* Shipping Address */}
              {(order.shippingAddress.street || order.shippingAddress.city) && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <MapPin className="h-5 w-5" />
                        Shipping Address
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm">
                        {order.shippingAddress.street}<br />
                        {order.shippingAddress.city}, {order.shippingAddress.state}<br />
                        {order.shippingAddress.pincode}
                      </p>
                    </CardContent>
                  </Card>
              )}

              {/* Billing Address */}
              {(order.billingAddress.street || order.billingAddress.city) && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <CreditCard className="h-5 w-5" />
                        Billing Address
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm">
                        {order.billingAddress.street}<br />
                        {order.billingAddress.city}, {order.billingAddress.state}<br />
                        {order.billingAddress.pincode}
                      </p>
                      {linkedCustomer?.gstNumber && (
                          <p className="text-sm mt-2">
                            <span className="text-muted-foreground">GSTIN:</span> {linkedCustomer.gstNumber}
                          </p>
                      )}
                    </CardContent>
                  </Card>
              )}

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

        {/* =================================================================== */}
        {/* DIALOGS */}
        {/* =================================================================== */}

        {/* Send Quote Dialog */}
        <Dialog open={showSendQuoteDialog} onOpenChange={setShowSendQuoteDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Send Quote to Customer</DialogTitle>
              <DialogDescription>
                Enter your quoted price for each product. This will be sent to the customer for review.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
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

        {/* Accept Confirmation Dialog */}
        <Dialog open={showAcceptDialog} onOpenChange={setShowAcceptDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {needsQuoteResponse ? 'Accept Quote Request' : 'Accept Counter-Offer'}
              </DialogTitle>
              <DialogDescription>
                {needsQuoteResponse
                    ? "Accept the customer's target price and confirm the order?"
                    : "Accept the customer's counter-offer and confirm the order?"
                }
              </DialogDescription>
            </DialogHeader>

            <div className="py-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                <p className="text-sm text-green-700">Order will be confirmed at</p>
                <p className="text-3xl font-bold text-green-800">
                  ₹{customerTargetTotal.toLocaleString()}
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAcceptDialog(false)}>
                Cancel
              </Button>
              <Button
                  onClick={handleAccept}
                  disabled={acceptCounterMutation.isPending || acceptQuoteRequestMutation.isPending}
                  className="bg-green-600 hover:bg-green-700"
              >
                {(acceptCounterMutation.isPending || acceptQuoteRequestMutation.isPending) && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                <Check className="h-4 w-4 mr-2" />
                Confirm & Accept
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reject Confirmation Dialog */}
        <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {needsQuoteResponse ? 'Reject Quote Request' : 'Reject Counter-Offer'}
              </DialogTitle>
              <DialogDescription>
                This will end the negotiation. This action cannot be undone.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4">
              <Label>Reason (Optional)</Label>
              <Textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Provide a reason for rejection..."
                  rows={3}
              />
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
                Cancel
              </Button>
              <Button
                  variant="destructive"
                  onClick={handleReject}
                  disabled={rejectCounterMutation.isPending || rejectQuoteRequestMutation.isPending}
              >
                {(rejectCounterMutation.isPending || rejectQuoteRequestMutation.isPending) && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                <XCircle className="h-4 w-4 mr-2" />
                Reject
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Invoice View Dialog - For viewing auto-generated invoices */}
        <InvoiceViewDialog
            open={viewInvoiceDialogOpen}
            onOpenChange={setViewInvoiceDialogOpen}
            invoice={selectedInvoice}
            onPrint={handleDialogPrint}
            onDownload={handleDialogDownload}
            onSend={handleDialogSend}
            printRef={printRef}
        />
        {/* Production Sourcing Dialog */}
        <ProductionSourcingDialog
            open={showProductionSourcingDialog}
            onOpenChange={setShowProductionSourcingDialog}
            orderId={id || ''}
            orderNumber={order.orderNumber}
            itemsCount={apiOrder?.items?.length || 0}
            totalAmount={companyQuotedTotal}
        />
        {/* Processing Confirmation Dialog */}
        <Dialog open={showProcessingDialog} onOpenChange={setShowProcessingDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Start Processing Order</DialogTitle>
              <DialogDescription>
                This will move the order to the processing stage. The customer will be notified.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-700">
                  <strong>Order:</strong> {order.orderNumber}
                </p>
                <p className="text-sm text-blue-700">
                  <strong>Items:</strong> {apiOrder?.items?.length || 0} products
                </p>
                <p className="text-sm text-blue-700">
                  <strong>Total:</strong> ₹{companyQuotedTotal.toLocaleString()}
                </p>
              </div>

              <div>
                <Label>Note (Optional)</Label>
                <Textarea
                    value={transitionNote}
                    onChange={(e) => setTransitionNote(e.target.value)}
                    placeholder="Add a note about this status change..."
                    rows={2}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setShowProcessingDialog(false);
                setTransitionNote('');
              }}>
                Cancel
              </Button>
              <Button
                  onClick={handleConfirmProcessing}
                  disabled={updateStatusMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700"
              >
                {updateStatusMutation.isPending && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                <Check className="h-4 w-4 mr-2" />
                Confirm Processing
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Shipped Confirmation Dialog */}
        <Dialog open={showShippedDialog} onOpenChange={setShowShippedDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Mark as Shipped</DialogTitle>
              <DialogDescription>
                This will mark the order as shipped. The customer will be notified with tracking information.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-4">
              <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4">
                <p className="text-sm text-cyan-700">
                  <strong>Order:</strong> {order.orderNumber}
                </p>
                <p className="text-sm text-cyan-700">
                  <strong>Shipping To:</strong> {order.shippingAddress?.city}, {order.shippingAddress?.state}
                </p>
              </div>

              <div>
                <Label>Shipping Note / Tracking Info (Optional)</Label>
                <Textarea
                    value={transitionNote}
                    onChange={(e) => setTransitionNote(e.target.value)}
                    placeholder="Add tracking number or shipping details..."
                    rows={2}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setShowShippedDialog(false);
                setTransitionNote('');
              }}>
                Cancel
              </Button>
              <Button
                  onClick={handleConfirmShipped}
                  disabled={updateStatusMutation.isPending}
                  className="bg-cyan-600 hover:bg-cyan-700"
              >
                {updateStatusMutation.isPending && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                <Check className="h-4 w-4 mr-2" />
                Confirm Shipment
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delivered Confirmation Dialog */}
        <Dialog open={showDeliveredDialog} onOpenChange={setShowDeliveredDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Delivery</DialogTitle>
              <DialogDescription>
                This will mark the order as delivered. This action completes the order fulfillment.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                <p className="text-sm text-emerald-700">
                  <strong>Order:</strong> {order.orderNumber}
                </p>
                <p className="text-sm text-emerald-700">
                  <strong>Customer:</strong> {order.customer?.name}
                </p>
                <p className="text-sm text-emerald-700">
                  <strong>Total Value:</strong> ₹{companyQuotedTotal.toLocaleString()}
                </p>
              </div>

              <div>
                <Label>Delivery Note (Optional)</Label>
                <Textarea
                    value={transitionNote}
                    onChange={(e) => setTransitionNote(e.target.value)}
                    placeholder="Add delivery confirmation details..."
                    rows={2}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setShowDeliveredDialog(false);
                setTransitionNote('');
              }}>
                Cancel
              </Button>
              <Button
                  onClick={handleConfirmDelivered}
                  disabled={updateStatusMutation.isPending}
                  className="bg-emerald-600 hover:bg-emerald-700"
              >
                {updateStatusMutation.isPending && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                <Check className="h-4 w-4 mr-2" />
                Confirm Delivery
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Cancel Order Confirmation Dialog */}
        <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-destructive" />
                Cancel Order
              </DialogTitle>
              <DialogDescription>
                Are you sure you want to cancel this order? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-700">
                  <strong>Order:</strong> {order.orderNumber}
                </p>
                <p className="text-sm text-red-700">
                  <strong>Customer:</strong> {order.customer?.name}
                </p>
                <p className="text-sm text-red-700">
                  <strong>Total Value:</strong> ₹{order.totalAmount?.toLocaleString()}
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCancelDialog(false)}>
                Keep Order
              </Button>
              <Button
                  variant="destructive"
                  onClick={handleConfirmCancel}
                  disabled={updateStatusMutation.isPending}
              >
                {updateStatusMutation.isPending && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                <XCircle className="h-4 w-4 mr-2" />
                Cancel Order
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DashboardLayout>

  );
}
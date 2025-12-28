export type OrderStatus =
    | 'quote_requested'
    | 'quote_sent'
    | 'negotiation'      // NEW: Negotiation status
    | 'order_booked'     // NEW: Renamed from confirmed for clarity
    | 'confirmed'
    | 'payment_pending'
    | 'paid'
    | 'processing'
    | 'packed'
    | 'shipped'
    | 'delivered'
    | 'completed'
    | 'cancelled'
    | 'rejected'         // NEW: Order rejected status
    | 'returned'
    | 'refunded'
    | 'on_hold';

export interface OrderItem {
  id: string;
  productId?: string;
  productName: string;
  sku: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  type: 'restaurant' | 'retailer' | 'wholesaler' | 'distributor';
  company?: string;
}

export interface Address {
  street: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
}

export interface OrderTimeline {
  status: OrderStatus;
  timestamp: string;
  note?: string;
  updatedBy?: string;
}

export interface Order {
  id: string;
  _id?: string;  // ✅ Added: MongoDB ID
  orderNumber: string;
  orderId?: string;  // ✅ Added: Backend order ID
  customerId?: string;  // ✅ Added: Link to customer
  customer: Customer;
  billingAddress: Address;
  shippingAddress: Address;
  items: OrderItem[];
  products?: any[];  // ✅ Added: Raw products from backend
  subtotal: number;
  tax: number;
  shippingCost: number;
  discount: number;
  totalAmount: number;
  currency?: string;  // ✅ Added: Currency code
  status: OrderStatus;
  paymentStatus: 'pending' | 'partial' | 'paid' | 'refunded';
  paymentMethod?: string;
  createdAt: string;
  updatedAt: string;
  expectedDelivery?: string;
  timeline: OrderTimeline[];
  notes?: string;
  assignedTo?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

export const ORDER_STATUS_CONFIG: Record<OrderStatus, { label: string; color: string; bgColor: string }> = {
  quote_requested: { label: 'Quote Requested', color: 'text-amber-700', bgColor: 'bg-amber-100' },
  quote_sent: { label: 'Quote Sent', color: 'text-orange-700', bgColor: 'bg-orange-100' },
  negotiation: { label: 'Negotiation', color: 'text-purple-700', bgColor: 'bg-purple-100' },
  order_booked: { label: 'Order Booked', color: 'text-emerald-700', bgColor: 'bg-emerald-100' },
  confirmed: { label: 'Confirmed', color: 'text-emerald-700', bgColor: 'bg-emerald-100' },
  payment_pending: { label: 'Payment Pending', color: 'text-orange-700', bgColor: 'bg-orange-100' },
  paid: { label: 'Paid', color: 'text-green-700', bgColor: 'bg-green-100' },
  processing: { label: 'Processing', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  packed: { label: 'Packed', color: 'text-purple-700', bgColor: 'bg-purple-100' },
  shipped: { label: 'Shipment Booked', color: 'text-cyan-700', bgColor: 'bg-cyan-100' },
  delivered: { label: 'Delivered', color: 'text-emerald-700', bgColor: 'bg-emerald-100' },
  completed: { label: 'Completed', color: 'text-green-700', bgColor: 'bg-green-100' },
  cancelled: { label: 'Cancelled', color: 'text-red-700', bgColor: 'bg-red-100' },
  rejected: { label: 'Rejected', color: 'text-red-700', bgColor: 'bg-red-100' },
  returned: { label: 'Returned', color: 'text-red-700', bgColor: 'bg-red-100' },
  refunded: { label: 'Refunded', color: 'text-purple-700', bgColor: 'bg-purple-100' },
  on_hold: { label: 'On Hold', color: 'text-gray-700', bgColor: 'bg-gray-100' },
};

// NEW: Progress stepper configuration
export const ORDER_PROGRESS_STEPS: OrderStatus[] = [
  'quote_requested',
  'quote_sent',
  'negotiation',
  'order_booked',
  'processing',
  'shipped',
  'delivered',
];

// NEW: Labels for progress stepper (shorter versions)
export const ORDER_PROGRESS_LABELS: Record<string, string> = {
  quote_requested: 'Quote Requested',
  quote_sent: 'Quote Sent',
  negotiation: 'Negotiation',
  order_booked: 'Order Booked',
  processing: 'Processing',
  shipped: 'Shipment Booked',
  delivered: 'Delivered',
};
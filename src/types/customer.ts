export type CustomerStatus = 'active' | 'inactive' | 'blocked' | 'pending_verification';

export type BusinessType = 'retailer' | 'wholesaler' | 'distributor' | 'restaurant' | 'hotel' | 'institution' | 'other';

export type PaymentTerms = 'advance' | 'cod' | 'net_15' | 'net_30' | 'net_45' | 'net_60';

export type PaymentMethod = 'bank_transfer' | 'upi' | 'cheque' | 'cash';

// ✅ Updated Address interface with all backend fields
export interface Address {
  _id?: string;
  label: string;
  street: string;
  streetAddress?: string;  // Backend uses this field name
  city: string;
  state: string;
  pinCode: string;
  contactPerson?: string;
  contactPhone?: string;
  isDefault?: boolean;
}

// ✅ Bank Details interface
export interface BankDetails {
  _id?: string;
  accountHolderName: string;
  accountNumber: string;
  ifscCode: string;
  bankName: string;
  upiId?: string;
}

// ✅ Company Contact Details interface
export interface CompanyContactDetails {
  _id?: string;
  phoneNumber: string;
  email: string;
  website?: string;
}

export interface CustomerDocument {
  id: string;
  name: string;
  type: 'gst_certificate' | 'pan_card' | 'business_registration';
  fileName: string;
  uploadedAt: string;
  status: 'pending' | 'verified' | 'rejected';
}

export interface CustomerOrder {
  id: string;
  date: string;
  amount: number;
  status: string;
  itemCount: number;
}

export interface CustomerActivity {
  id: string;
  type: 'quote_requested' | 'order_placed' | 'status_change' | 'note_added' | 'payment_received' | 'delivery_completed';
  description: string;
  date: string;
  user?: string;
}

export interface Customer {
  id: string;
  businessName: string;
  businessType: BusinessType;
  gstNumber: string;
  panNumber: string;
  establishedYear?: number;
  contactPerson: string;
  designation?: string;
  primaryPhone: string;
  secondaryPhone?: string;
  email: string;
  website?: string;
  billingAddress: Address;
  deliveryAddresses: Address[];
  // ✅ Added bank details
  bankDetails?: BankDetails;
  // ✅ Added company contact details
  companyContactDetails?: CompanyContactDetails;
  creditLimit: number;
  paymentTerms: PaymentTerms;
  preferredPaymentMethod: PaymentMethod;
  documents: CustomerDocument[];
  totalOrders: number;
  totalBusinessValue: number;
  outstandingAmount: number;
  lastOrderDate?: string;
  status: CustomerStatus;
  blocked?: boolean;
  blockedReason?: string;
  notes?: string;
  registeredAt: string;
  orders?: CustomerOrder[];
  activities?: CustomerActivity[];
}

export const CUSTOMER_STATUS_CONFIG: Record<CustomerStatus, { label: string; color: string }> = {
  active: { label: 'Active', color: 'bg-success text-success-foreground' },
  inactive: { label: 'Inactive', color: 'bg-muted text-muted-foreground' },
  blocked: { label: 'Blocked', color: 'bg-destructive text-destructive-foreground' },
  pending_verification: { label: 'Pending Verification', color: 'bg-warning text-warning-foreground' },
};

export const BUSINESS_TYPES: Record<BusinessType, string> = {
  retailer: 'Retailer',
  wholesaler: 'Wholesaler',
  distributor: 'Distributor',
  restaurant: 'Restaurant',
  hotel: 'Hotel',
  institution: 'Institution',
  other: 'Other',
};

export const PAYMENT_TERMS: Record<PaymentTerms, string> = {
  advance: 'Advance Payment',
  cod: 'Cash on Delivery',
  net_15: 'Net 15 Days',
  net_30: 'Net 30 Days',
  net_45: 'Net 45 Days',
  net_60: 'Net 60 Days',
};

export const PAYMENT_METHODS: Record<PaymentMethod, string> = {
  bank_transfer: 'Bank Transfer',
  upi: 'UPI',
  cheque: 'Cheque',
  cash: 'Cash',
};

export const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Delhi', 'Chandigarh', 'Puducherry'
];
export type SupplierStatus = 'pending_approval' | 'active' | 'inactive' | 'blacklisted';

export interface Address {
  street: string;
  city: string;
  state: string;
  pinCode: string;
}

export interface BankDetails {
  accountName: string;
  accountNumber: string;
  ifscCode: string;
  bankName: string;
}

export interface SupplierDocument {
  id: string;
  type: 'gst_certificate' | 'pan_card' | 'cancelled_cheque' | 'other';
  name: string;
  uploadedAt: string;
  url?: string;
}

export interface SupplierActivity {
  id: string;
  type: 'created' | 'status_change' | 'updated' | 'order_placed' | 'payment_made' | 'note_added';
  description: string;
  timestamp: string;
  user?: string;
}

export interface SupplierOrder {
  id: string;
  date: string;
  items: number;
  amount: number;
  status: string;
}

export interface Supplier {
  id: string;
  companyName: string;
  gstNumber: string;
  panNumber: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: Address;
  productCategories: string[];
  paymentTerms: 'advance' | 'net_15' | 'net_30' | 'net_45' | 'net_60';
  bankDetails: BankDetails;
  documents: SupplierDocument[];
  status: SupplierStatus;
  registrationDate: string;
  notes?: string;
  blacklistReason?: string;
  activities: SupplierActivity[];
  orders: SupplierOrder[];
}

export const SUPPLIER_STATUS_CONFIG: Record<SupplierStatus, { label: string; color: string }> = {
  pending_approval: { label: 'Pending Approval', color: 'bg-warning/10 text-warning border-warning/20' },
  active: { label: 'Active', color: 'bg-success/10 text-success border-success/20' },
  inactive: { label: 'Inactive', color: 'bg-muted text-muted-foreground border-border' },
  blacklisted: { label: 'Blacklisted', color: 'bg-destructive/10 text-destructive border-destructive/20' },
};

export const PRODUCT_CATEGORIES = [
  'Raw Materials',
  'Packaging',
  'Electronics',
  'Food & Beverages',
  'Chemicals',
  'Textiles',
  'Machinery',
  'Office Supplies',
  'Construction Materials',
  'Automotive Parts',
];

export const PAYMENT_TERMS_CONFIG: Record<string, string> = {
  advance: 'Advance Payment',
  net_15: 'Net 15 Days',
  net_30: 'Net 30 Days',
  net_45: 'Net 45 Days',
  net_60: 'Net 60 Days',
};

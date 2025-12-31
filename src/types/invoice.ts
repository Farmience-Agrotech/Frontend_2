export type InvoiceType = 'proforma' | 'tax';

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'cancelled';

export interface InvoiceItem {
  id: string;
  hsnCode: string;
  description: string;
  qty: number;
  unit: string;
  rate: number;
  taxableValue: number;
  taxPercentage?: number;  // ✅ Per-item tax rate
  taxAmount?: number;      // ✅ Calculated tax for this item
}

export interface InvoiceSeller {
  companyName: string;
  address: string;
  city: string;
  state: string;
  pin: string;
  gstin: string;
  pan: string;
  stateCode: string;
  email?: string;
}

export interface InvoiceBuyer {
  customerName: string;
  companyName: string;
  gstin?: string;
  stateCode: string;
}

export interface InvoiceAddress {
  street: string;
  city: string;
  state: string;
  pin: string;
}

export interface InvoiceBankDetails {
  accountName: string;
  accountNumber: string;
  ifsc: string;
  bankName: string;
}

export interface GeneratedInvoice {
  id: string;
  orderId: string;
  orderNumber: string;
  type: InvoiceType;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  placeOfSupply: string;
  seller: InvoiceSeller;
  buyer: InvoiceBuyer;
  billingAddress: InvoiceAddress;
  shippingAddress: InvoiceAddress;
  items: InvoiceItem[];
  subtotal: number;
  cgst: number;
  sgst: number;
  igst: number;
  shippingCost?: number;      // ✅ NEW: Shipping cost
  discount?: number;          // ✅ NEW: Discount amount
  discountPercent?: number;   // ✅ NEW: Discount percentage
  roundOff: number;
  grandTotal: number;
  bankDetails: InvoiceBankDetails;
  terms: string[];
  status: InvoiceStatus;
  createdAt: string;
  updatedAt: string;
}

// Common HSN codes for industrial supplies
export const COMMON_HSN_CODES = [
  { code: '8483', description: 'Transmission shafts, gears, bearings' },
  { code: '7318', description: 'Screws, bolts, nuts, washers' },
  { code: '4016', description: 'Rubber articles, O-rings, gaskets' },
  { code: '8481', description: 'Taps, cocks, valves' },
  { code: '8412', description: 'Engines, motors, pumps' },
  { code: '8414', description: 'Air/vacuum pumps, compressors' },
  { code: '8421', description: 'Filters, purifying machinery' },
  { code: '8484', description: 'Gaskets, mechanical seals' },
  { code: '3926', description: 'Plastic articles' },
  { code: '7326', description: 'Iron/steel articles' },
  { code: '8482', description: 'Ball/roller bearings' },
  { code: '8501', description: 'Electric motors, generators' },
  { code: '8536', description: 'Electrical switches, connectors' },
  { code: '8544', description: 'Insulated wire, cables' },
  { code: '9032', description: 'Automatic regulating instruments' },
];

// State codes for GST
export const STATE_CODES: Record<string, string> = {
  'Andhra Pradesh': '37',
  'Arunachal Pradesh': '12',
  'Assam': '18',
  'Bihar': '10',
  'Chhattisgarh': '22',
  'Goa': '30',
  'Gujarat': '24',
  'Haryana': '06',
  'Himachal Pradesh': '02',
  'Jharkhand': '20',
  'Karnataka': '29',
  'Kerala': '32',
  'Madhya Pradesh': '23',
  'Maharashtra': '27',
  'Manipur': '14',
  'Meghalaya': '17',
  'Mizoram': '15',
  'Nagaland': '13',
  'Odisha': '21',
  'Punjab': '03',
  'Rajasthan': '08',
  'Sikkim': '11',
  'Tamil Nadu': '33',
  'Telangana': '36',
  'Tripura': '16',
  'Uttar Pradesh': '09',
  'Uttarakhand': '05',
  'West Bengal': '19',
  'Delhi': '07',
  'Jammu and Kashmir': '01',
  'Ladakh': '38',
  'Puducherry': '34',
  'Chandigarh': '04',
};

export const getStateCode = (state: string): string => {
  return STATE_CODES[state] || '27'; // Default to Maharashtra
};
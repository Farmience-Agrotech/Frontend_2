import { useEffect, useState, useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import {
  FileText,
  Download,
  Printer,
  Send,
  Save,
  Eye,
  Edit,
} from 'lucide-react';
import { Order } from '@/types/order';
import {
  GeneratedInvoice,
  InvoiceItem,
  InvoiceType,
  COMMON_HSN_CODES,
  getStateCode,
} from '@/types/invoice';
import { InvoiceTemplate } from '@/components/invoice/InvoiceTemplate';
import { useToast } from '@/hooks/use-toast';
import { format, addDays } from 'date-fns';

interface InvoiceGeneratorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: Order;
  invoiceType: InvoiceType;
  onInvoiceSaved: (invoice: GeneratedInvoice) => void;
}

const numberToWords = (num: number): string => {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  if (num === 0) return 'Zero';

  const convertLessThanThousand = (n: number): string => {
    if (n === 0) return '';
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ones[n % 10] : '');
    return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' ' + convertLessThanThousand(n % 100) : '');
  };

  const convertToIndianSystem = (n: number): string => {
    if (n === 0) return '';

    const crore = Math.floor(n / 10000000);
    const lakh = Math.floor((n % 10000000) / 100000);
    const thousand = Math.floor((n % 100000) / 1000);
    const remaining = n % 1000;

    let result = '';
    if (crore > 0) result += convertLessThanThousand(crore) + ' Crore ';
    if (lakh > 0) result += convertLessThanThousand(lakh) + ' Lakh ';
    if (thousand > 0) result += convertLessThanThousand(thousand) + ' Thousand ';
    if (remaining > 0) result += convertLessThanThousand(remaining);

    return result.trim();
  };

  const rupees = Math.floor(num);
  const paise = Math.round((num - rupees) * 100);

  let words = 'Rupees ' + convertToIndianSystem(rupees);
  if (paise > 0) {
    words += ' and ' + convertToIndianSystem(paise) + ' Paise';
  }
  words += ' Only';

  return words;
};

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

// Default seller info from Settings
const defaultSeller = {
  companyName: 'ARIHANT UNIFORM',
  address: '1ST FLOOR, 147/8, MYSORE ROAD A.R COMPOUND, Chamarajpet',
  city: 'Bengaluru',
  state: 'Karnataka',
  pin: '560018',
  gstin: '29GOTPK6376A1ZC',
  pan: 'GOTPK6376A',
  stateCode: '29',
  email: 'info@arihantuniform.com',
};

const defaultBankDetails = {
  accountName: 'KIRAN N JAIN',
  accountNumber: '',
  ifsc: '',
  bankName: '',
};
const defaultTerms = [
  'Goods once sold will not be taken back or exchanged.',
  'Payment is due within 30 days from the invoice date.',
  'Interest @ 18% p.a. will be charged on delayed payments.',
  'Subject to local jurisdiction only.',
];

export function InvoiceGeneratorDialog({
                                         open,
                                         onOpenChange,
                                         order,
                                         invoiceType,
                                         onInvoiceSaved,
                                       }: InvoiceGeneratorDialogProps) {
  const { toast } = useToast();
  const printRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const [sameAsShipping, setSameAsShipping] = useState(false);

  // Generate invoice number
  const generateInvoiceNumber = () => {
    const prefix = invoiceType === 'proforma' ? 'PI' : 'INV';
    const randomPart = Math.random().toString(36).substring(2, 10).toUpperCase();
    return `${prefix}-${order.orderNumber || 'ORD'}-${randomPart}`;
  };

  // Initialize invoice data from order
  const [invoiceData, setInvoiceData] = useState({
    invoiceNumber: generateInvoiceNumber(),
    invoiceDate: format(new Date(), 'yyyy-MM-dd'),
    dueDate: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
    placeOfSupply: `${order.shippingAddress.state} (${getStateCode(order.shippingAddress.state)})`,
  });

  // ✅ State for shipping and discount (editable in the form)
  const [shippingCost, setShippingCost] = useState(order.shippingCost || 0);
  const [discountAmount, setDiscountAmount] = useState(order.discount || 0);
  const [discountPercent, setDiscountPercent] = useState(
      order.discount && order.subtotal ? Math.round((order.discount / order.subtotal) * 100) : 0
  );

  // Ensure invoice number prefix matches the selected invoice type when opening the dialog
  useEffect(() => {
    if (!open) return;
    setInvoiceData((prev) => ({
      ...prev,
      invoiceNumber: generateInvoiceNumber(),
    }));
    // Reset shipping and discount from order when dialog opens
    setShippingCost(order.shippingCost || 0);
    setDiscountAmount(order.discount || 0);
    setDiscountPercent(
        order.discount && order.subtotal ? Math.round((order.discount / order.subtotal) * 100) : 0
    );
  }, [open, invoiceType]);

  const [seller, setSeller] = useState(defaultSeller);

  const [buyer, setBuyer] = useState({
    customerName: order.customer.name,
    companyName: order.customer.company || '',
    gstin: '',
    stateCode: getStateCode(order.shippingAddress.state),
  });

  const [billingAddress, setBillingAddress] = useState({
    street: order.billingAddress.street,
    city: order.billingAddress.city,
    state: order.billingAddress.state,
    pin: order.billingAddress.pincode,
  });

  const [shippingAddress, setShippingAddress] = useState({
    street: order.shippingAddress.street,
    city: order.shippingAddress.city,
    state: order.shippingAddress.state,
    pin: order.shippingAddress.pincode,
  });

  const [items, setItems] = useState<InvoiceItem[]>(
      order.items.map((item, index) => ({
        id: item.id,
        hsnCode: '8483', // Default HSN
        description: item.productName,
        qty: item.quantity,
        unit: item.unit,
        rate: item.unitPrice,
        taxableValue: item.totalPrice,
      }))
  );

  const [bankDetails, setBankDetails] = useState(defaultBankDetails);
  const [terms, setTerms] = useState(defaultTerms.join('\n'));

  // ✅ Calculate totals including shipping and discount
  const subtotal = items.reduce((sum, item) => sum + item.taxableValue, 0);
  const isSameState = seller.stateCode === buyer.stateCode;
  const cgst = isSameState ? subtotal * 0.09 : 0;
  const sgst = isSameState ? subtotal * 0.09 : 0;
  const igst = !isSameState ? subtotal * 0.18 : 0;
  const totalBeforeRound = subtotal + cgst + sgst + igst + shippingCost - discountAmount;
  const roundOff = Math.round(totalBeforeRound) - totalBeforeRound;
  const grandTotal = Math.round(totalBeforeRound);

  const updateItem = (index: number, field: keyof InvoiceItem, value: string | number) => {
    const newItems = [...items];
    newItems[index] = {
      ...newItems[index],
      [field]: value,
      taxableValue: field === 'qty' || field === 'rate'
          ? (field === 'qty' ? Number(value) : newItems[index].qty) * (field === 'rate' ? Number(value) : newItems[index].rate)
          : newItems[index].taxableValue,
    };
    setItems(newItems);
  };

  // ✅ Update discount percent when amount changes
  const handleDiscountAmountChange = (value: number) => {
    setDiscountAmount(value);
    if (subtotal > 0) {
      setDiscountPercent(Math.round((value / subtotal) * 100));
    }
  };

  // ✅ Update discount amount when percent changes
  const handleDiscountPercentChange = (value: number) => {
    setDiscountPercent(value);
    setDiscountAmount(Math.round((value / 100) * subtotal));
  };

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `${invoiceType === 'proforma' ? 'Proforma' : 'Tax'}_Invoice_${invoiceData.invoiceNumber}`,
  });

  const handleSaveAsDraft = () => {
    const invoice: GeneratedInvoice = {
      id: `inv_${Date.now()}`,
      orderId: order.id,
      orderNumber: order.orderNumber,
      type: invoiceType,
      invoiceNumber: invoiceData.invoiceNumber,
      invoiceDate: invoiceData.invoiceDate,
      dueDate: invoiceData.dueDate,
      placeOfSupply: invoiceData.placeOfSupply,
      seller,
      buyer,
      billingAddress,
      shippingAddress: sameAsShipping ? billingAddress : shippingAddress,
      items,
      subtotal,
      cgst,
      sgst,
      igst,
      roundOff,
      grandTotal,
      bankDetails,
      terms: terms.split('\n').filter(t => t.trim()),
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onInvoiceSaved(invoice);
    toast({
      title: 'Invoice saved',
      description: `${invoiceType === 'proforma' ? 'Proforma' : 'Tax'} Invoice saved as draft.`,
    });
    onOpenChange(false);
  };

  const handleSendToCustomer = () => {
    toast({
      title: 'Send Invoice',
      description: 'This feature will be available soon.',
    });
  };

  // ✅ FIXED: Create invoice template data WITH shippingCost, discount, and discountPercent
  const templateData = {
    type: invoiceType === 'proforma' ? 'proforma' as const : 'tax' as const,
    invoiceNumber: invoiceData.invoiceNumber,
    invoiceDate: invoiceData.invoiceDate,
    dueDate: format(new Date(invoiceData.dueDate), 'dd MMM yyyy'),
    placeOfSupply: invoiceData.placeOfSupply,
    seller,
    buyer,
    billingAddress,
    shippingAddress: sameAsShipping ? billingAddress : shippingAddress,
    items: items.map((item, i) => ({ ...item, sNo: i + 1 })),
    bankDetails,
    terms: terms.split('\n').filter(t => t.trim()),
    // ✅ ADDED: Pass shipping and discount to template
    shippingCost: shippingCost,
    discount: discountAmount,
    discountPercent: discountPercent,
  };

  return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Generate {invoiceType === 'proforma' ? 'Proforma' : 'Tax'} Invoice
            </DialogTitle>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'edit' | 'preview')} className="flex-1 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between">
              <TabsList>
                <TabsTrigger value="edit" className="gap-2">
                  <Edit className="h-4 w-4" />
                  Edit
                </TabsTrigger>
                <TabsTrigger value="preview" className="gap-2">
                  <Eye className="h-4 w-4" />
                  Preview
                </TabsTrigger>
              </TabsList>

              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleSaveAsDraft}>
                  <Save className="mr-2 h-4 w-4" />
                  Save Draft
                </Button>
                <Button variant="outline" size="sm" onClick={() => handlePrint()}>
                  <Printer className="mr-2 h-4 w-4" />
                  Print
                </Button>
                <Button variant="outline" size="sm" onClick={handleSendToCustomer}>
                  <Send className="mr-2 h-4 w-4" />
                  Send
                </Button>
              </div>
            </div>

            <TabsContent value="edit" className="flex-1 overflow-auto mt-4 space-y-4">
              {/* Invoice Details */}
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm">Invoice Details</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs">Invoice Number</Label>
                    <Input
                        value={invoiceData.invoiceNumber}
                        onChange={(e) => setInvoiceData({ ...invoiceData, invoiceNumber: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Invoice Date</Label>
                    <Input
                        type="date"
                        value={invoiceData.invoiceDate}
                        onChange={(e) => setInvoiceData({ ...invoiceData, invoiceDate: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Due Date</Label>
                    <Input
                        type="date"
                        value={invoiceData.dueDate}
                        onChange={(e) => setInvoiceData({ ...invoiceData, dueDate: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Place of Supply</Label>
                    <Input
                        value={invoiceData.placeOfSupply}
                        onChange={(e) => setInvoiceData({ ...invoiceData, placeOfSupply: e.target.value })}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Seller & Buyer */}
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm">Seller Details</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-3">
                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs">Company Name</Label>
                      <Input value={seller.companyName} onChange={(e) => setSeller({ ...seller, companyName: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">GSTIN</Label>
                      <Input value={seller.gstin} onChange={(e) => setSeller({ ...seller, gstin: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">State Code</Label>
                      <Input value={seller.stateCode} onChange={(e) => setSeller({ ...seller, stateCode: e.target.value })} />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm">Buyer Details</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Customer Name</Label>
                      <Input value={buyer.customerName} onChange={(e) => setBuyer({ ...buyer, customerName: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Company</Label>
                      <Input value={buyer.companyName} onChange={(e) => setBuyer({ ...buyer, companyName: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">GSTIN</Label>
                      <Input value={buyer.gstin} onChange={(e) => setBuyer({ ...buyer, gstin: e.target.value })} placeholder="Optional" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">State Code</Label>
                      <Input value={buyer.stateCode} onChange={(e) => setBuyer({ ...buyer, stateCode: e.target.value })} />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Addresses */}
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm">Billing Address</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-3">
                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs">Street</Label>
                      <Input value={billingAddress.street} onChange={(e) => setBillingAddress({ ...billingAddress, street: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">City</Label>
                      <Input value={billingAddress.city} onChange={(e) => setBillingAddress({ ...billingAddress, city: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">State</Label>
                      <Input value={billingAddress.state} onChange={(e) => setBillingAddress({ ...billingAddress, state: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">PIN</Label>
                      <Input value={billingAddress.pin} onChange={(e) => setBillingAddress({ ...billingAddress, pin: e.target.value })} />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="py-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">Shipping Address</CardTitle>
                      <label className="flex items-center gap-2 text-xs">
                        <Checkbox checked={sameAsShipping} onCheckedChange={(c) => setSameAsShipping(c as boolean)} />
                        Same as Billing
                      </label>
                    </div>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-3">
                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs">Street</Label>
                      <Input
                          value={sameAsShipping ? billingAddress.street : shippingAddress.street}
                          onChange={(e) => setShippingAddress({ ...shippingAddress, street: e.target.value })}
                          disabled={sameAsShipping}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">City</Label>
                      <Input
                          value={sameAsShipping ? billingAddress.city : shippingAddress.city}
                          onChange={(e) => setShippingAddress({ ...shippingAddress, city: e.target.value })}
                          disabled={sameAsShipping}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">State</Label>
                      <Input
                          value={sameAsShipping ? billingAddress.state : shippingAddress.state}
                          onChange={(e) => setShippingAddress({ ...shippingAddress, state: e.target.value })}
                          disabled={sameAsShipping}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">PIN</Label>
                      <Input
                          value={sameAsShipping ? billingAddress.pin : shippingAddress.pin}
                          onChange={(e) => setShippingAddress({ ...shippingAddress, pin: e.target.value })}
                          disabled={sameAsShipping}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Items Table */}
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm">Line Items</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-28">HSN/SAC</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="w-20">Qty</TableHead>
                        <TableHead className="w-20">Unit</TableHead>
                        <TableHead className="w-24">Rate (₹)</TableHead>
                        <TableHead className="w-28 text-right">Taxable (₹)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item, index) => (
                          <TableRow key={item.id}>
                            <TableCell>
                              <Select
                                  value={item.hsnCode}
                                  onValueChange={(v) => updateItem(index, 'hsnCode', v)}
                              >
                                <SelectTrigger className="h-8">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {COMMON_HSN_CODES.map((hsn) => (
                                      <SelectItem key={hsn.code} value={hsn.code}>
                                        {hsn.code}
                                      </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <Input
                                  className="h-8"
                                  value={item.description}
                                  onChange={(e) => updateItem(index, 'description', e.target.value)}
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                  className="h-8"
                                  type="number"
                                  value={item.qty}
                                  onChange={(e) => updateItem(index, 'qty', Number(e.target.value))}
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                  className="h-8"
                                  value={item.unit}
                                  onChange={(e) => updateItem(index, 'unit', e.target.value)}
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                  className="h-8"
                                  type="number"
                                  value={item.rate}
                                  onChange={(e) => updateItem(index, 'rate', Number(e.target.value))}
                              />
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(item.taxableValue)}
                            </TableCell>
                          </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  <Separator className="my-4" />

                  {/* Totals */}
                  <div className="flex justify-end">
                    <div className="w-80 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span>₹ {formatCurrency(subtotal)}</span>
                      </div>
                      {isSameState ? (
                          <>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">CGST @ 9%</span>
                              <span>₹ {formatCurrency(cgst)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">SGST @ 9%</span>
                              <span>₹ {formatCurrency(sgst)}</span>
                            </div>
                          </>
                      ) : (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">IGST @ 18%</span>
                            <span>₹ {formatCurrency(igst)}</span>
                          </div>
                      )}

                      {/* ✅ ADDED: Shipping Cost Input */}
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Shipping & Handling</span>
                        <div className="flex items-center gap-1">
                          <span>₹</span>
                          <Input
                              className="h-7 w-24 text-right"
                              type="number"
                              value={shippingCost}
                              onChange={(e) => setShippingCost(Number(e.target.value))}
                              min={0}
                          />
                        </div>
                      </div>

                      {/* ✅ ADDED: Discount Input */}
                      <div className="flex justify-between items-center">
                      <span className="text-muted-foreground text-green-600">
                        Discount {discountPercent > 0 ? `(${discountPercent}%)` : ''}
                      </span>
                        <div className="flex items-center gap-1">
                          <span className="text-green-600">-₹</span>
                          <Input
                              className="h-7 w-24 text-right text-green-600"
                              type="number"
                              value={discountAmount}
                              onChange={(e) => handleDiscountAmountChange(Number(e.target.value))}
                              min={0}
                          />
                        </div>
                      </div>

                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Round Off</span>
                        <span>{roundOff >= 0 ? '+' : ''}₹ {formatCurrency(roundOff)}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between font-semibold text-base">
                        <span>Grand Total</span>
                        <span>₹ {formatCurrency(grandTotal)}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{numberToWords(grandTotal)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Bank & Terms */}
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm">Bank Details</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-3">
                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs">Account Name</Label>
                      <Input value={bankDetails.accountName} onChange={(e) => setBankDetails({ ...bankDetails, accountName: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Account Number</Label>
                      <Input value={bankDetails.accountNumber} onChange={(e) => setBankDetails({ ...bankDetails, accountNumber: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">IFSC Code</Label>
                      <Input value={bankDetails.ifsc} onChange={(e) => setBankDetails({ ...bankDetails, ifsc: e.target.value })} />
                    </div>
                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs">Bank Name</Label>
                      <Input value={bankDetails.bankName} onChange={(e) => setBankDetails({ ...bankDetails, bankName: e.target.value })} />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm">Terms & Conditions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                        className="min-h-[100px] text-xs"
                        value={terms}
                        onChange={(e) => setTerms(e.target.value)}
                        placeholder="Enter terms (one per line)"
                    />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="preview" className="flex-1 overflow-auto mt-4">
              <div className="flex justify-center bg-gray-100 p-4 rounded-lg min-h-full">
                <div ref={printRef}>
                  <InvoiceTemplate data={templateData} />
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
  );
}
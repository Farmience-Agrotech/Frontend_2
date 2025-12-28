interface InvoiceItem {
  sNo: number;
  hsnCode: string;
  description: string;
  qty: number;
  unit: string;
  rate: number;
  discount?: number;
  taxableValue: number;
  taxPercentage?: number;
  taxAmount?: number;
}

interface InvoiceData {
  type: "tax" | "proforma";
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  placeOfSupply: string;
  deliveryNote?: string;
  paymentTerms?: string;
  supplierRef?: string;
  otherRef?: string;
  buyerOrderNo?: string;
  buyerOrderDate?: string;
  dispatchDocNo?: string;
  deliveryNoteDate?: string;
  dispatchThrough?: string;
  destination?: string;
  termsOfDelivery?: string;
  seller: {
    companyName: string;
    address: string;
    city: string;
    state: string;
    pin: string;
    gstin: string;
    pan: string;
    stateCode: string;
    email?: string;
  };
  buyer: {
    customerName: string;
    companyName: string;
    gstin?: string;
    stateCode: string;
    email?: string;
  };
  billingAddress: {
    street: string;
    city: string;
    state: string;
    pin: string;
  };
  shippingAddress: {
    street: string;
    city: string;
    state: string;
    pin: string;
  };
  items: InvoiceItem[];
  bankDetails: {
    accountName: string;
    accountNumber: string;
    ifsc: string;
    bankName: string;
    micr?: string;
  };
  terms?: string[];
  shippingCost?: number;
  discount?: number;
  discountPercent?: number;
}

interface InvoiceTemplateProps {
  data: InvoiceData;
  companyLogo?: string;
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

export function InvoiceTemplate({ data }: InvoiceTemplateProps) {
  const subtotal = data.items.reduce((sum, item) => sum + item.taxableValue, 0);
  const isSameState = data.seller.stateCode === data.buyer.stateCode;

  // Calculate tax per item if taxPercentage is provided, otherwise use flat 18%
  const hasPerItemTax = data.items.some(item => item.taxPercentage !== undefined);

  let totalTax = 0;
  if (hasPerItemTax) {
    // Sum up individual item taxes
    totalTax = data.items.reduce((sum, item) => {
      const itemTax = item.taxAmount ?? (item.taxableValue * ((item.taxPercentage ?? 18) / 100));
      return sum + itemTax;
    }, 0);
  } else {
    // Flat 18% tax
    totalTax = subtotal * 0.18;
  }

  const cgst = isSameState ? totalTax / 2 : 0;
  const sgst = isSameState ? totalTax / 2 : 0;
  const igst = !isSameState ? totalTax : 0;

  // Get shipping and discount
  const shippingCost = data.shippingCost || 0;
  const discountAmount = data.discount || 0;
  const discountPercent = data.discountPercent || 0;

  const totalBeforeRound = subtotal + cgst + sgst + igst + shippingCost - discountAmount;
  const roundOff = Math.round(totalBeforeRound) - totalBeforeRound;
  const grandTotal = Math.round(totalBeforeRound);

  // Group items by HSN for tax breakdown
  const hsnBreakdown = data.items.reduce((acc, item) => {
    const taxRate = item.taxPercentage ?? 18;
    const key = `${item.hsnCode}-${taxRate}`;
    if (!acc[key]) {
      acc[key] = { hsnCode: item.hsnCode, taxableValue: 0, taxRate };
    }
    acc[key].taxableValue += item.taxableValue;
    return acc;
  }, {} as Record<string, { hsnCode: string; taxableValue: number; taxRate: number }>);

  const styles = {
    container: {
      width: '100%',
      maxWidth: '800px',
      margin: '0 auto',
      backgroundColor: '#fff',
      fontFamily: 'Arial, sans-serif',
      fontSize: '11px',
      color: '#000',
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse' as const,
      border: '1px solid #000',
    },
    cell: {
      border: '1px solid #000',
      padding: '4px 6px',
      verticalAlign: 'top' as const,
    },
    cellNoBorder: {
      padding: '4px 6px',
      verticalAlign: 'top' as const,
    },
    headerCell: {
      border: '1px solid #000',
      padding: '4px 6px',
      fontWeight: 'bold' as const,
      backgroundColor: '#f5f5f5',
      whiteSpace: 'nowrap' as const,
    },
    centerBold: {
      textAlign: 'center' as const,
      fontWeight: 'bold' as const,
      fontSize: '14px',
      padding: '8px',
      border: '1px solid #000',
    },
    right: {
      textAlign: 'right' as const,
    },
    center: {
      textAlign: 'center' as const,
    },
    bold: {
      fontWeight: 'bold' as const,
    },
    small: {
      fontSize: '9px',
    },
  };

  return (
      <div style={styles.container}>
        <table style={styles.table}>
          <tbody>
          {/* Header Row */}
          <tr>
            <td colSpan={8} style={styles.centerBold}>
              {data.type === "tax" ? "Tax Invoice" : "Proforma Invoice"}
            </td>
          </tr>

          {/* Seller + Invoice Info Row */}
          <tr>
            {/* Seller Details */}
            <td colSpan={4} style={{ ...styles.cell, width: '60%' }}>
              <div style={styles.bold}>{data.seller.companyName}</div>
              <div>{data.seller.address}</div>
              <div>{data.seller.city}, {data.seller.state} - {data.seller.pin}</div>
              <div>GSTIN/UIN: {data.seller.gstin}</div>
              <div>State Name: {data.seller.state}, Code: {data.seller.stateCode}</div>
              {data.seller.email && <div>E-Mail: {data.seller.email}</div>}
            </td>
            {/* Invoice Details */}
            <td colSpan={4} style={{ ...styles.cell, width: '40%', padding: 0 }}>
              <table style={{ ...styles.table, border: 'none' }}>
                <tbody>
                <tr>
                  <td style={{ ...styles.cellNoBorder, borderBottom: '1px solid #000', borderRight: '1px solid #000' }}>
                    <div style={styles.small}>Invoice No.</div>
                    <div style={styles.bold}>{data.invoiceNumber}</div>
                  </td>
                  <td style={{ ...styles.cellNoBorder, borderBottom: '1px solid #000' }}>
                    <div style={styles.small}>Dated</div>
                    <div style={styles.bold}>{data.invoiceDate}</div>
                  </td>
                </tr>
                <tr>
                  <td style={{ ...styles.cellNoBorder, borderBottom: '1px solid #000', borderRight: '1px solid #000' }}>
                    <div style={styles.small}>Delivery Note</div>
                    <div>{data.deliveryNote || '-'}</div>
                  </td>
                  <td style={{ ...styles.cellNoBorder, borderBottom: '1px solid #000' }}>
                    <div style={styles.small}>Mode/Terms of Payment</div>
                    <div>{data.paymentTerms || '-'}</div>
                  </td>
                </tr>
                <tr>
                  <td style={{ ...styles.cellNoBorder, borderBottom: '1px solid #000', borderRight: '1px solid #000' }}>
                    <div style={styles.small}>Supplier's Ref.</div>
                    <div>{data.supplierRef || '-'}</div>
                  </td>
                  <td style={{ ...styles.cellNoBorder, borderBottom: '1px solid #000' }}>
                    <div style={styles.small}>Other Reference(s)</div>
                    <div>{data.otherRef || '-'}</div>
                  </td>
                </tr>
                <tr>
                  <td style={{ ...styles.cellNoBorder, borderRight: '1px solid #000' }}>
                    <div style={styles.small}>Buyer's Order No.</div>
                    <div>{data.buyerOrderNo || '-'}</div>
                  </td>
                  <td style={styles.cellNoBorder}>
                    <div style={styles.small}>Dated</div>
                    <div>{data.buyerOrderDate || '-'}</div>
                  </td>
                </tr>
                </tbody>
              </table>
            </td>
          </tr>

          {/* Buyer + Dispatch Info Row */}
          <tr>
            {/* Buyer Details */}
            <td colSpan={4} style={{ ...styles.cell, padding: 0 }}>
              <div style={{ borderBottom: '1px solid #000', padding: '4px 6px' }}>
                <div style={styles.small}>Buyer (Bill to)</div>
                <div style={styles.bold}>{data.buyer.companyName}</div>
                <div>{data.buyer.customerName}</div>
                <div>{data.billingAddress.street}</div>
                <div>{data.billingAddress.city}, {data.billingAddress.state} - {data.billingAddress.pin}</div>
                {data.buyer.gstin && <div>GSTIN/UIN: {data.buyer.gstin}</div>}
                <div>State Name: {data.billingAddress.state}, Code: {data.buyer.stateCode}</div>
              </div>
              <div style={{ padding: '4px 6px' }}>
                <div style={styles.small}>Consignee (Ship to)</div>
                <div style={styles.bold}>{data.buyer.companyName}</div>
                <div>{data.shippingAddress.street}</div>
                <div>{data.shippingAddress.city}, {data.shippingAddress.state} - {data.shippingAddress.pin}</div>
              </div>
            </td>
            {/* Dispatch Info */}
            <td colSpan={4} style={{ ...styles.cell, padding: 0 }}>
              <table style={{ ...styles.table, border: 'none' }}>
                <tbody>
                <tr>
                  <td style={{ ...styles.cellNoBorder, borderBottom: '1px solid #000', borderRight: '1px solid #000' }}>
                    <div style={styles.small}>Dispatch Doc No.</div>
                    <div>{data.dispatchDocNo || '-'}</div>
                  </td>
                  <td style={{ ...styles.cellNoBorder, borderBottom: '1px solid #000' }}>
                    <div style={styles.small}>Delivery Note Date</div>
                    <div>{data.deliveryNoteDate || '-'}</div>
                  </td>
                </tr>
                <tr>
                  <td style={{ ...styles.cellNoBorder, borderBottom: '1px solid #000', borderRight: '1px solid #000' }}>
                    <div style={styles.small}>Dispatched through</div>
                    <div>{data.dispatchThrough || '-'}</div>
                  </td>
                  <td style={{ ...styles.cellNoBorder, borderBottom: '1px solid #000' }}>
                    <div style={styles.small}>Destination</div>
                    <div>{data.destination || '-'}</div>
                  </td>
                </tr>
                <tr>
                  <td colSpan={2} style={{ ...styles.cellNoBorder, borderBottom: '1px solid #000' }}>
                    <div style={styles.small}>Terms of Delivery</div>
                    <div>{data.termsOfDelivery || '-'}</div>
                  </td>
                </tr>
                <tr>
                  <td colSpan={2} style={styles.cellNoBorder}>
                    <div style={styles.small}>Place of Supply</div>
                    <div style={styles.bold}>{data.placeOfSupply}</div>
                  </td>
                </tr>
                </tbody>
              </table>
            </td>
          </tr>

          {/* Items Header */}
          <tr>
            <td style={{ ...styles.headerCell, ...styles.center, width: '5%' }}>S.No</td>
            <td style={{ ...styles.headerCell, width: '35%' }}>Description of Goods</td>
            <td style={{ ...styles.headerCell, ...styles.center, width: '10%' }}>HSN/SAC</td>
            <td style={{ ...styles.headerCell, ...styles.center, width: '8%' }}>Qty</td>
            <td style={{ ...styles.headerCell, ...styles.center, width: '8%' }}>Unit</td>
            <td style={{ ...styles.headerCell, ...styles.right, width: '12%' }}>Rate</td>
            <td style={{ ...styles.headerCell, ...styles.center, width: '7%' }}>Tax%</td>
            <td style={{ ...styles.headerCell, ...styles.right, width: '15%' }}>Amount</td>
          </tr>

          {/* Items Rows */}
          {data.items.map((item, index) => (
              <tr key={index}>
                <td style={{ ...styles.cell, ...styles.center }}>{item.sNo || index + 1}</td>
                <td style={styles.cell}>{item.description}</td>
                <td style={{ ...styles.cell, ...styles.center }}>{item.hsnCode}</td>
                <td style={{ ...styles.cell, ...styles.center }}>{item.qty}</td>
                <td style={{ ...styles.cell, ...styles.center }}>{item.unit}</td>
                <td style={{ ...styles.cell, ...styles.right }}>{formatCurrency(item.rate)}</td>
                <td style={{ ...styles.cell, ...styles.center }}>{item.taxPercentage ?? 18}%</td>
                <td style={{ ...styles.cell, ...styles.right }}>{formatCurrency(item.taxableValue)}</td>
              </tr>
          ))}

          {/* Subtotal Row */}
          <tr>
            <td style={styles.cell}></td>
            <td style={{ ...styles.cell, ...styles.right, ...styles.bold }} colSpan={6}>Subtotal</td>
            <td style={{ ...styles.cell, ...styles.right, ...styles.bold }}>{formatCurrency(subtotal)}</td>
          </tr>

          {/* Tax Rows */}
          {isSameState ? (
              <>
                <tr>
                  <td style={styles.cell}></td>
                  <td style={{ ...styles.cell, ...styles.right }} colSpan={6}>CGST</td>
                  <td style={{ ...styles.cell, ...styles.right }}>{formatCurrency(cgst)}</td>
                </tr>
                <tr>
                  <td style={styles.cell}></td>
                  <td style={{ ...styles.cell, ...styles.right }} colSpan={6}>SGST</td>
                  <td style={{ ...styles.cell, ...styles.right }}>{formatCurrency(sgst)}</td>
                </tr>
              </>
          ) : (
              <tr>
                <td style={styles.cell}></td>
                <td style={{ ...styles.cell, ...styles.right }} colSpan={6}>IGST</td>
                <td style={{ ...styles.cell, ...styles.right }}>{formatCurrency(igst)}</td>
              </tr>
          )}

          {/* Shipping Cost Row (if applicable) */}
          {shippingCost > 0 && (
              <tr>
                <td style={styles.cell}></td>
                <td style={{ ...styles.cell, ...styles.right }} colSpan={6}>Shipping & Handling</td>
                <td style={{ ...styles.cell, ...styles.right }}>{formatCurrency(shippingCost)}</td>
              </tr>
          )}

          {/* Discount Row (if applicable) */}
          {discountAmount > 0 && (
              <tr>
                <td style={styles.cell}></td>
                <td style={{ ...styles.cell, ...styles.right, color: '#16a34a' }} colSpan={6}>
                  Discount {discountPercent > 0 ? `(${discountPercent}%)` : ''}
                </td>
                <td style={{ ...styles.cell, ...styles.right, color: '#16a34a' }}>-{formatCurrency(discountAmount)}</td>
              </tr>
          )}

          {/* Round Off */}
          <tr>
            <td style={styles.cell}></td>
            <td style={{ ...styles.cell, ...styles.right }} colSpan={6}>Round Off</td>
            <td style={{ ...styles.cell, ...styles.right }}>{roundOff >= 0 ? '' : '-'}{formatCurrency(Math.abs(roundOff))}</td>
          </tr>

          {/* Total Row */}
          <tr>
            <td style={{ ...styles.cell, ...styles.bold }}></td>
            <td style={{ ...styles.cell, ...styles.right, ...styles.bold }} colSpan={6}>Total</td>
            <td style={{ ...styles.cell, ...styles.right, ...styles.bold }}>₹ {formatCurrency(grandTotal)}</td>
          </tr>

          {/* Amount in Words - ✅ FIXED: Removed "INR" */}
          <tr>
            <td colSpan={6} style={styles.cell}>
              <div style={styles.bold}>Amount Chargeable (in words)</div>
              <div style={{ ...styles.bold, fontSize: '12px' }}>{numberToWords(grandTotal)}</div>
            </td>
            <td colSpan={2} style={{ ...styles.cell, ...styles.right, fontStyle: 'italic', ...styles.small }}>
              E. & O.E
            </td>
          </tr>

          {/* HSN Breakdown Header */}
          <tr>
            <td colSpan={2} rowSpan={2} style={{ ...styles.headerCell, ...styles.center }}>HSN/SAC</td>
            <td rowSpan={2} style={{ ...styles.headerCell, ...styles.center }}>Taxable Value</td>
            <td rowSpan={2} style={{ ...styles.headerCell, ...styles.center }}>Tax Rate</td>
            <td colSpan={2} style={{ ...styles.headerCell, ...styles.center }}>Central Tax</td>
            <td colSpan={2} style={{ ...styles.headerCell, ...styles.center }}>State Tax</td>
          </tr>
          <tr>
            <td style={{ ...styles.headerCell, ...styles.center }}>Rate</td>
            <td style={{ ...styles.headerCell, ...styles.center }}>Amount</td>
          </tr>

          {/* HSN Breakdown Rows - with per-item tax rates */}
          {Object.entries(hsnBreakdown).map(([key, { hsnCode, taxableValue, taxRate }]) => {
            const halfRate = taxRate / 2;
            const cTax = isSameState ? taxableValue * (halfRate / 100) : 0;
            const sTax = isSameState ? taxableValue * (halfRate / 100) : 0;
            return (
                <tr key={key}>
                  <td colSpan={2} style={{ ...styles.cell, ...styles.center }}>{hsnCode}</td>
                  <td style={{ ...styles.cell, ...styles.right }}>{formatCurrency(taxableValue)}</td>
                  <td style={{ ...styles.cell, ...styles.center }}>{taxRate}%</td>
                  <td style={{ ...styles.cell, ...styles.center }}>{isSameState ? `${halfRate}%` : '-'}</td>
                  <td style={{ ...styles.cell, ...styles.right }}>{formatCurrency(cTax)}</td>
                  <td style={{ ...styles.cell, ...styles.center }}>{isSameState ? `${halfRate}%` : '-'}</td>
                  <td style={{ ...styles.cell, ...styles.right }}>{formatCurrency(sTax)}</td>
                </tr>
            );
          })}

          {/* HSN Total */}
          <tr>
            <td colSpan={2} style={{ ...styles.cell, ...styles.right, ...styles.bold }}>Total</td>
            <td style={{ ...styles.cell, ...styles.right, ...styles.bold }}>{formatCurrency(subtotal)}</td>
            <td style={styles.cell}></td>
            <td style={styles.cell}></td>
            <td style={{ ...styles.cell, ...styles.right, ...styles.bold }}>{formatCurrency(cgst)}</td>
            <td style={styles.cell}></td>
            <td style={{ ...styles.cell, ...styles.right, ...styles.bold }}>{formatCurrency(sgst)}</td>
          </tr>

          {/* Tax Amount in Words - ✅ FIXED: Removed "INR" */}
          <tr>
            <td colSpan={8} style={{ ...styles.cell, ...styles.small }}>
              <span style={styles.bold}>Tax Amount (in words): </span>
              {numberToWords(cgst + sgst + igst)}
            </td>
          </tr>

          {/* Footer Row */}
          <tr>
            {/* Bank Details & Declaration */}
            <td colSpan={5} style={{ ...styles.cell, ...styles.small, padding: 0 }}>
              <div style={{ borderBottom: '1px solid #000', padding: '4px 6px' }}>
                <div style={styles.bold}>Company's Bank Details</div>
                <div>Bank Name: <span style={styles.bold}>{data.bankDetails.bankName}</span></div>
                <div>A/c No.: <span style={styles.bold}>{data.bankDetails.accountNumber}</span></div>
                <div>IFSC Code: <span style={styles.bold}>{data.bankDetails.ifsc}</span></div>
                {data.bankDetails.micr && <div>MICR Code: <span style={styles.bold}>{data.bankDetails.micr}</span></div>}
              </div>
              <div style={{ borderBottom: '1px solid #000', padding: '4px 6px' }}>
                Company's PAN: <span style={styles.bold}>{data.seller.pan}</span>
              </div>
              <div style={{ padding: '4px 6px' }}>
                <div style={styles.bold}>Declaration</div>
                <div>We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.</div>
              </div>
            </td>
            {/* Signatory */}
            <td colSpan={3} style={{ ...styles.cell, verticalAlign: 'top' }}>
              <div style={{ ...styles.right, ...styles.bold, marginBottom: '40px' }}>
                for {data.seller.companyName}
              </div>
              <div style={{ ...styles.right }}>
                {data.type === "proforma" ? "Authorised Signatory" : "Authorised Signatory & Seal"}
              </div>
            </td>
          </tr>
          </tbody>
        </table>

        {/* Computer Generated Notice */}
        <div style={{ textAlign: 'center', padding: '8px', fontSize: '9px' }}>
          {data.type === "proforma"
              ? "This is a Computer Generated Proforma Invoice. Signature and Seal not required."
              : "This is a Computer Generated Invoice. Signature and Seal not required."}
        </div>

        {/* Print Styles */}
        <style>{`
        @media print {
          @page {
            size: A4;
            margin: 10mm;
          }
          body {
            margin: 0;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>
      </div>
  );
}

// Sample data for preview
export const sampleInvoiceData: InvoiceData = {
  type: "tax",
  invoiceNumber: "INV-2024-001234",
  invoiceDate: "20-Dec-2024",
  dueDate: "19-Jan-2025",
  placeOfSupply: "Maharashtra (27)",
  deliveryNote: "DN-2024-001",
  paymentTerms: "Net 30 Days",
  supplierRef: "SR-2024-001",
  otherRef: "",
  buyerOrderNo: "PO-2024-5678",
  buyerOrderDate: "18-Dec-2024",
  dispatchDocNo: "DC-2024-001",
  deliveryNoteDate: "20-Dec-2024",
  dispatchThrough: "Road Transport",
  destination: "Mumbai",
  termsOfDelivery: "Ex-Works",
  seller: {
    companyName: "ABC Industrial Supplies Pvt. Ltd.",
    address: "123, Industrial Area, Andheri East",
    city: "Mumbai",
    state: "Maharashtra",
    pin: "400069",
    gstin: "27AABCU9603R1ZM",
    pan: "AABCU9603R",
    stateCode: "27",
    email: "sales@abcindustrial.com",
  },
  buyer: {
    customerName: "Rajesh Kumar",
    companyName: "XYZ Manufacturing Co.",
    gstin: "27AADCX4521P1Z5",
    stateCode: "27",
    email: "purchase@xyzmanufacturing.com",
  },
  billingAddress: {
    street: "456, Factory Lane, Vikhroli",
    city: "Mumbai",
    state: "Maharashtra",
    pin: "400079",
  },
  shippingAddress: {
    street: "789, Warehouse Complex, Bhiwandi",
    city: "Thane",
    state: "Maharashtra",
    pin: "421302",
  },
  items: [
    { sNo: 1, hsnCode: "8483", description: "Industrial Ball Bearings - SKF 6205", qty: 50, unit: "Pcs", rate: 450, taxableValue: 22500, taxPercentage: 18 },
    { sNo: 2, hsnCode: "7318", description: "Stainless Steel Bolts M10x50mm", qty: 200, unit: "Pcs", rate: 25, taxableValue: 5000, taxPercentage: 12 },
    { sNo: 3, hsnCode: "4016", description: "Rubber O-Rings (Assorted Pack)", qty: 10, unit: "Pack", rate: 350, taxableValue: 3500, taxPercentage: 18 },
    { sNo: 4, hsnCode: "8481", description: "Ball Valve 2 inch Brass", qty: 5, unit: "Pcs", rate: 1200, taxableValue: 6000, taxPercentage: 28 },
  ],
  bankDetails: {
    accountName: "ABC Industrial Supplies Pvt. Ltd.",
    accountNumber: "1234567890123456",
    ifsc: "HDFC0001234",
    bankName: "HDFC Bank, Andheri East Branch",
    micr: "400240015",
  },
  shippingCost: 500,
  discount: 1850,
  discountPercent: 5,
  terms: [
    "Goods once sold will not be taken back or exchanged.",
    "Payment is due within 30 days from the invoice date.",
  ],
};

export type { InvoiceData, InvoiceItem };
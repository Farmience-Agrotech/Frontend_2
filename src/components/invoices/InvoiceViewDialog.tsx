import { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Printer, Send, X } from 'lucide-react';
import { GeneratedInvoice } from '@/types/invoice';
import { InvoiceTemplate, InvoiceData } from '@/components/invoice/InvoiceTemplate';
import { useToast } from '@/hooks/use-toast';

interface InvoiceViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: GeneratedInvoice | null;
  onPrint: () => void;
  onDownload: () => void;
  onSend: () => void;
  printRef: React.RefObject<HTMLDivElement>;
}

export function InvoiceViewDialog({
  open,
  onOpenChange,
  invoice,
  onPrint,
  onDownload,
  onSend,
  printRef,
}: InvoiceViewDialogProps) {
  if (!invoice) return null;

  // Convert GeneratedInvoice to InvoiceData format for InvoiceTemplate
  const invoiceData: InvoiceData = {
    type: invoice.type,
    invoiceNumber: invoice.invoiceNumber,
    invoiceDate: invoice.invoiceDate,
    dueDate: invoice.dueDate,
    placeOfSupply: invoice.placeOfSupply,
    seller: invoice.seller,
    buyer: invoice.buyer,
    billingAddress: invoice.billingAddress,
    shippingAddress: invoice.shippingAddress,
    items: invoice.items.map((item, index) => ({
      sNo: index + 1,
      hsnCode: item.hsnCode,
      description: item.description,
      qty: item.qty,
      unit: item.unit,
      rate: item.rate,
      taxableValue: item.taxableValue,
    })),
    bankDetails: invoice.bankDetails,
    terms: invoice.terms,
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[900px] max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="p-4 pb-0 flex flex-row items-center justify-between">
          <DialogTitle className="text-lg">
            {invoice.type === 'proforma' ? 'Proforma Invoice' : 'Tax Invoice'} - {invoice.invoiceNumber}
          </DialogTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onDownload}>
              <Download className="mr-2 h-4 w-4" />
              Download PDF
            </Button>
            <Button variant="outline" size="sm" onClick={onPrint}>
              <Printer className="mr-2 h-4 w-4" />
              Print
            </Button>
            <Button variant="outline" size="sm" onClick={onSend}>
              <Send className="mr-2 h-4 w-4" />
              Send
            </Button>
          </div>
        </DialogHeader>
        <div className="p-4 overflow-auto bg-muted/30">
          <div ref={printRef} className="transform scale-[0.85] origin-top">
            <InvoiceTemplate data={invoiceData} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

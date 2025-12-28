import { useRef, useState } from 'react';
import { useReactToPrint } from 'react-to-print';
import html2pdf from 'html2pdf.js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { FileText, Eye, Download, Printer, Send } from 'lucide-react';
import { GeneratedInvoice } from '@/types/invoice';
import { InvoiceViewDialog } from '@/components/invoices/InvoiceViewDialog';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/usePermissions';

interface OrderInvoicesSectionProps {
  invoices: GeneratedInvoice[];
}

export function OrderInvoicesSection({ invoices }: OrderInvoicesSectionProps) {
  const { toast } = useToast();
  const printRef = useRef<HTMLDivElement>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<GeneratedInvoice | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const { hasPermission } = usePermissions();

  const canManageInvoices = hasPermission('invoices', 'create');

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
      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
        Tax Invoice
      </Badge>
    );
  };

  const handleView = (invoice: GeneratedInvoice) => {
    setSelectedInvoice(invoice);
    setViewDialogOpen(true);
  };

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: selectedInvoice ? `Invoice-${selectedInvoice.invoiceNumber}` : 'Invoice',
  });

  const handleDownloadPDF = (invoice: GeneratedInvoice) => {
    setSelectedInvoice(invoice);
    setViewDialogOpen(true);
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

  const handleDirectPrint = (invoice: GeneratedInvoice) => {
    setSelectedInvoice(invoice);
    setViewDialogOpen(true);
    setTimeout(() => {
      handlePrint();
    }, 500);
  };

  const handleSend = (invoice: GeneratedInvoice) => {
    toast({
      title: 'Invoice Sent',
      description: `Invoice ${invoice.invoiceNumber} has been sent to customer`,
    });
  };

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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <FileText className="h-4 w-4" />
          📄 Invoices for this Order
        </CardTitle>
      </CardHeader>
      <CardContent>
        {invoices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <FileText className="h-12 w-12 text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">
              No invoices generated yet. Click 'Generate Proforma' or 'Generate Invoice' above to create one.
            </p>
          </div>
        ) : (
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
                      onClick={() => handleView(invoice)}
                    >
                      {invoice.invoiceNumber}
                    </Button>
                  </TableCell>
                  <TableCell>{getTypeBadge(invoice.type)}</TableCell>
                  <TableCell>{format(new Date(invoice.invoiceDate), 'PP')}</TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(invoice.grandTotal)}
                  </TableCell>
                  <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleView(invoice)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>View Invoice</TooltipContent>
                      </Tooltip>
                      {canManageInvoices && (
                        <>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleDownloadPDF(invoice)}
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
                                onClick={() => handleDirectPrint(invoice)}
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
                                onClick={() => handleSend(invoice)}
                              >
                                <Send className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Send to Customer</TooltipContent>
                          </Tooltip>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <InvoiceViewDialog
          open={viewDialogOpen}
          onOpenChange={setViewDialogOpen}
          invoice={selectedInvoice}
          onPrint={handleDialogPrint}
          onDownload={handleDialogDownload}
          onSend={handleDialogSend}
          printRef={printRef}
        />
      </CardContent>
    </Card>
  );
}
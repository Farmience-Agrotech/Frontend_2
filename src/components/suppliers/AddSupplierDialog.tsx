import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Supplier, PRODUCT_CATEGORIES, PAYMENT_TERMS_CONFIG } from '@/types/supplier';
import { Upload } from 'lucide-react';

interface AddSupplierDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (supplier: Partial<Supplier>) => void;
  editingSupplier?: Supplier | null;
}

const initialFormState = {
  companyName: '',
  gstNumber: '',
  panNumber: '',
  contactPerson: '',
  phone: '',
  email: '',
  street: '',
  city: '',
  state: '',
  pinCode: '',
  productCategories: [] as string[],
  paymentTerms: 'net_30' as 'advance' | 'net_15' | 'net_30' | 'net_45' | 'net_60',
  accountName: '',
  accountNumber: '',
  ifscCode: '',
  bankName: '',
  notes: '',
};

export const AddSupplierDialog = ({
  open,
  onOpenChange,
  onSave,
  editingSupplier,
}: AddSupplierDialogProps) => {
  const [formData, setFormData] = useState(initialFormState);

  useEffect(() => {
    if (editingSupplier) {
      setFormData({
        companyName: editingSupplier.companyName,
        gstNumber: editingSupplier.gstNumber,
        panNumber: editingSupplier.panNumber,
        contactPerson: editingSupplier.contactPerson,
        phone: editingSupplier.phone,
        email: editingSupplier.email,
        street: editingSupplier.address.street,
        city: editingSupplier.address.city,
        state: editingSupplier.address.state,
        pinCode: editingSupplier.address.pinCode,
        productCategories: editingSupplier.productCategories,
        paymentTerms: editingSupplier.paymentTerms,
        accountName: editingSupplier.bankDetails.accountName,
        accountNumber: editingSupplier.bankDetails.accountNumber,
        ifscCode: editingSupplier.bankDetails.ifscCode,
        bankName: editingSupplier.bankDetails.bankName,
        notes: editingSupplier.notes || '',
      });
    } else {
      setFormData(initialFormState);
    }
  }, [editingSupplier, open]);

  const handleCategoryToggle = (category: string) => {
    setFormData((prev) => ({
      ...prev,
      productCategories: prev.productCategories.includes(category)
        ? prev.productCategories.filter((c) => c !== category)
        : [...prev.productCategories, category],
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...(editingSupplier && { id: editingSupplier.id }),
      companyName: formData.companyName,
      gstNumber: formData.gstNumber,
      panNumber: formData.panNumber,
      contactPerson: formData.contactPerson,
      phone: formData.phone,
      email: formData.email,
      address: {
        street: formData.street,
        city: formData.city,
        state: formData.state,
        pinCode: formData.pinCode,
      },
      productCategories: formData.productCategories,
      paymentTerms: formData.paymentTerms,
      bankDetails: {
        accountName: formData.accountName,
        accountNumber: formData.accountNumber,
        ifscCode: formData.ifscCode,
        bankName: formData.bankName,
      },
      notes: formData.notes,
      status: editingSupplier?.status || 'pending_approval',
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>
            {editingSupplier ? 'Edit Supplier' : 'Register New Supplier'}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] pr-4">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Company Information */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                Company Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name *</Label>
                  <Input
                    id="companyName"
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gstNumber">GST Number *</Label>
                  <Input
                    id="gstNumber"
                    value={formData.gstNumber}
                    onChange={(e) => setFormData({ ...formData, gstNumber: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="panNumber">PAN Number *</Label>
                  <Input
                    id="panNumber"
                    value={formData.panNumber}
                    onChange={(e) => setFormData({ ...formData, panNumber: e.target.value })}
                    required
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Contact Information */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                Contact Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contactPerson">Contact Person *</Label>
                  <Input
                    id="contactPerson"
                    value={formData.contactPerson}
                    onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Address */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                Address
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="street">Street Address *</Label>
                  <Input
                    id="street"
                    value={formData.street}
                    onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State *</Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pinCode">PIN Code *</Label>
                  <Input
                    id="pinCode"
                    value={formData.pinCode}
                    onChange={(e) => setFormData({ ...formData, pinCode: e.target.value })}
                    required
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Product Categories */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                Product Categories *
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {PRODUCT_CATEGORIES.map((category) => (
                  <div key={category} className="flex items-center space-x-2">
                    <Checkbox
                      id={category}
                      checked={formData.productCategories.includes(category)}
                      onCheckedChange={() => handleCategoryToggle(category)}
                    />
                    <Label htmlFor={category} className="text-sm cursor-pointer">
                      {category}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Payment Terms */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                Payment Terms
              </h3>
              <div className="w-full md:w-1/2">
                <Select
                  value={formData.paymentTerms}
                  onValueChange={(val: any) => setFormData({ ...formData, paymentTerms: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PAYMENT_TERMS_CONFIG).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            {/* Bank Details */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                Bank Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="accountName">Account Name</Label>
                  <Input
                    id="accountName"
                    value={formData.accountName}
                    onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="accountNumber">Account Number</Label>
                  <Input
                    id="accountNumber"
                    value={formData.accountNumber}
                    onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ifscCode">IFSC Code</Label>
                  <Input
                    id="ifscCode"
                    value={formData.ifscCode}
                    onChange={(e) => setFormData({ ...formData, ifscCode: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bankName">Bank Name</Label>
                  <Input
                    id="bankName"
                    value={formData.bankName}
                    onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Documents */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                Documents
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:bg-muted/50 transition-colors">
                  <Upload className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">GST Certificate</p>
                </div>
                <div className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:bg-muted/50 transition-colors">
                  <Upload className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">PAN Card</p>
                </div>
                <div className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:bg-muted/50 transition-colors">
                  <Upload className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Cancelled Cheque</p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Notes */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                Notes / Remarks
              </h3>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Add any additional notes about this supplier..."
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {editingSupplier ? 'Update Supplier' : 'Register Supplier'}
              </Button>
            </div>
          </form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

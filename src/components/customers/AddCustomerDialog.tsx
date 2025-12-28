import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2 } from "lucide-react";
import {
  Customer,
  BusinessType,
  PaymentTerms,
  PaymentMethod,
  Address,
  BUSINESS_TYPES,
  PAYMENT_TERMS,
  PAYMENT_METHODS,
  INDIAN_STATES,
} from "@/types/customer";

interface AddCustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (customer: Partial<Customer>) => void;
  customer?: Customer | null;
}

const AddCustomerDialog = ({
  open,
  onOpenChange,
  onSave,
  customer,
}: AddCustomerDialogProps) => {
  const [formData, setFormData] = useState<Partial<Customer>>(
    customer || {
      businessName: "",
      businessType: "retailer",
      gstNumber: "",
      panNumber: "",
      contactPerson: "",
      designation: "",
      primaryPhone: "",
      secondaryPhone: "",
      email: "",
      website: "",
      billingAddress: {
        label: "Billing Address",
        street: "",
        city: "",
        state: "",
        pinCode: "",
      },
      deliveryAddresses: [],
      creditLimit: 100000,
      paymentTerms: "net_30",
      preferredPaymentMethod: "bank_transfer",
      notes: "",
    }
  );

  const [deliveryAddresses, setDeliveryAddresses] = useState<Address[]>(
    customer?.deliveryAddresses || []
  );

  const handleSave = () => {
    onSave({
      ...formData,
      deliveryAddresses,
    });
    onOpenChange(false);
  };

  const addDeliveryAddress = () => {
    setDeliveryAddresses([
      ...deliveryAddresses,
      {
        label: `Delivery Address ${deliveryAddresses.length + 1}`,
        street: "",
        city: "",
        state: "",
        pinCode: "",
        contactPerson: "",
        contactPhone: "",
      },
    ]);
  };

  const updateDeliveryAddress = (index: number, field: keyof Address, value: string) => {
    const updated = [...deliveryAddresses];
    updated[index] = { ...updated[index], [field]: value };
    setDeliveryAddresses(updated);
  };

  const removeDeliveryAddress = (index: number) => {
    setDeliveryAddresses(deliveryAddresses.filter((_, i) => i !== index));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>
            {customer ? "Edit Customer" : "Add New Customer"}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] pr-4">
          <div className="space-y-6">
            {/* Business Information */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Business Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="businessName">Business/Company Name *</Label>
                  <Input
                    id="businessName"
                    value={formData.businessName}
                    onChange={(e) =>
                      setFormData({ ...formData, businessName: e.target.value })
                    }
                    placeholder="Enter company name"
                  />
                </div>
                <div>
                  <Label htmlFor="businessType">Business Type *</Label>
                  <Select
                    value={formData.businessType}
                    onValueChange={(value: BusinessType) =>
                      setFormData({ ...formData, businessType: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(BUSINESS_TYPES).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="establishedYear">Established Year</Label>
                  <Input
                    id="establishedYear"
                    type="number"
                    value={formData.establishedYear || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        establishedYear: parseInt(e.target.value) || undefined,
                      })
                    }
                    placeholder="e.g., 2010"
                  />
                </div>
                <div>
                  <Label htmlFor="gstNumber">GST Number *</Label>
                  <Input
                    id="gstNumber"
                    value={formData.gstNumber}
                    onChange={(e) =>
                      setFormData({ ...formData, gstNumber: e.target.value.toUpperCase() })
                    }
                    placeholder="e.g., 27AADCS1234A1Z5"
                  />
                </div>
                <div>
                  <Label htmlFor="panNumber">PAN Number *</Label>
                  <Input
                    id="panNumber"
                    value={formData.panNumber}
                    onChange={(e) =>
                      setFormData({ ...formData, panNumber: e.target.value.toUpperCase() })
                    }
                    placeholder="e.g., AADCS1234A"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Contact Information */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Contact Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="contactPerson">Contact Person Name *</Label>
                  <Input
                    id="contactPerson"
                    value={formData.contactPerson}
                    onChange={(e) =>
                      setFormData({ ...formData, contactPerson: e.target.value })
                    }
                    placeholder="Full name"
                  />
                </div>
                <div>
                  <Label htmlFor="designation">Designation</Label>
                  <Input
                    id="designation"
                    value={formData.designation}
                    onChange={(e) =>
                      setFormData({ ...formData, designation: e.target.value })
                    }
                    placeholder="e.g., Purchase Manager"
                  />
                </div>
                <div>
                  <Label htmlFor="primaryPhone">Primary Phone *</Label>
                  <Input
                    id="primaryPhone"
                    value={formData.primaryPhone}
                    onChange={(e) =>
                      setFormData({ ...formData, primaryPhone: e.target.value })
                    }
                    placeholder="+91 98765 43210"
                  />
                </div>
                <div>
                  <Label htmlFor="secondaryPhone">Secondary Phone</Label>
                  <Input
                    id="secondaryPhone"
                    value={formData.secondaryPhone}
                    onChange={(e) =>
                      setFormData({ ...formData, secondaryPhone: e.target.value })
                    }
                    placeholder="+91 98765 43211"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    placeholder="email@company.com"
                  />
                </div>
                <div>
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    value={formData.website}
                    onChange={(e) =>
                      setFormData({ ...formData, website: e.target.value })
                    }
                    placeholder="www.company.com"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Billing Address */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Billing Address</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="billingStreet">Street Address *</Label>
                  <Input
                    id="billingStreet"
                    value={formData.billingAddress?.street}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        billingAddress: {
                          ...formData.billingAddress!,
                          street: e.target.value,
                        },
                      })
                    }
                    placeholder="Enter street address"
                  />
                </div>
                <div>
                  <Label htmlFor="billingCity">City *</Label>
                  <Input
                    id="billingCity"
                    value={formData.billingAddress?.city}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        billingAddress: {
                          ...formData.billingAddress!,
                          city: e.target.value,
                        },
                      })
                    }
                    placeholder="City"
                  />
                </div>
                <div>
                  <Label htmlFor="billingState">State *</Label>
                  <Select
                    value={formData.billingAddress?.state}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        billingAddress: {
                          ...formData.billingAddress!,
                          state: value,
                        },
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                    <SelectContent>
                      {INDIAN_STATES.map((state) => (
                        <SelectItem key={state} value={state}>
                          {state}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="billingPinCode">PIN Code *</Label>
                  <Input
                    id="billingPinCode"
                    value={formData.billingAddress?.pinCode}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        billingAddress: {
                          ...formData.billingAddress!,
                          pinCode: e.target.value,
                        },
                      })
                    }
                    placeholder="400001"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Delivery Addresses */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold">Delivery Addresses</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addDeliveryAddress}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Address
                </Button>
              </div>

              {deliveryAddresses.map((address, index) => (
                <div
                  key={index}
                  className="p-4 border rounded-lg mb-4 bg-muted/30"
                >
                  <div className="flex items-center justify-between mb-3">
                    <Input
                      value={address.label}
                      onChange={(e) =>
                        updateDeliveryAddress(index, "label", e.target.value)
                      }
                      className="max-w-[200px] font-medium"
                      placeholder="Address Label"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeDeliveryAddress(index)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <Input
                        value={address.street}
                        onChange={(e) =>
                          updateDeliveryAddress(index, "street", e.target.value)
                        }
                        placeholder="Street Address"
                      />
                    </div>
                    <Input
                      value={address.city}
                      onChange={(e) =>
                        updateDeliveryAddress(index, "city", e.target.value)
                      }
                      placeholder="City"
                    />
                    <Select
                      value={address.state}
                      onValueChange={(value) =>
                        updateDeliveryAddress(index, "state", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="State" />
                      </SelectTrigger>
                      <SelectContent>
                        {INDIAN_STATES.map((state) => (
                          <SelectItem key={state} value={state}>
                            {state}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      value={address.pinCode}
                      onChange={(e) =>
                        updateDeliveryAddress(index, "pinCode", e.target.value)
                      }
                      placeholder="PIN Code"
                    />
                    <Input
                      value={address.contactPerson || ""}
                      onChange={(e) =>
                        updateDeliveryAddress(index, "contactPerson", e.target.value)
                      }
                      placeholder="Contact Person"
                    />
                    <Input
                      value={address.contactPhone || ""}
                      onChange={(e) =>
                        updateDeliveryAddress(index, "contactPhone", e.target.value)
                      }
                      placeholder="Contact Phone"
                    />
                  </div>
                </div>
              ))}

              {deliveryAddresses.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No delivery addresses added. Click "Add Address" to add one.
                </p>
              )}
            </div>

            <Separator />

            {/* Credit & Payment */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Credit & Payment Terms</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="creditLimit">Credit Limit (₹)</Label>
                  <Input
                    id="creditLimit"
                    type="number"
                    value={formData.creditLimit}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        creditLimit: parseInt(e.target.value) || 0,
                      })
                    }
                    placeholder="100000"
                  />
                </div>
                <div>
                  <Label htmlFor="paymentTerms">Payment Terms</Label>
                  <Select
                    value={formData.paymentTerms}
                    onValueChange={(value: PaymentTerms) =>
                      setFormData({ ...formData, paymentTerms: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(PAYMENT_TERMS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="paymentMethod">Preferred Payment Method</Label>
                  <Select
                    value={formData.preferredPaymentMethod}
                    onValueChange={(value: PaymentMethod) =>
                      setFormData({ ...formData, preferredPaymentMethod: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(PAYMENT_METHODS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Separator />

            {/* Notes */}
            <div>
              <Label htmlFor="notes">Notes/Remarks</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Any additional notes about this customer..."
                rows={3}
              />
            </div>
          </div>
        </ScrollArea>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            {customer ? "Save Changes" : "Add Customer"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddCustomerDialog;

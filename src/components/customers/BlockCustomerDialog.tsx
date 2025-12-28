import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AlertTriangle } from "lucide-react";
import { Customer } from "@/types/customer";

interface BlockCustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: Customer | null;
  onConfirm: (reason: string) => void;
}

const BlockCustomerDialog = ({
  open,
  onOpenChange,
  customer,
  onConfirm,
}: BlockCustomerDialogProps) => {
  const [reason, setReason] = useState("");

  const handleConfirm = () => {
    onConfirm(reason);
    setReason("");
    onOpenChange(false);
  };

  if (!customer) return null;

  const isBlocked = customer.status === "blocked";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            {isBlocked ? "Unblock Customer" : "Block Customer"}
          </DialogTitle>
          <DialogDescription>
            {isBlocked
              ? `Are you sure you want to unblock ${customer.businessName}?`
              : `Are you sure you want to block ${customer.businessName}? This will prevent them from placing new orders.`}
          </DialogDescription>
        </DialogHeader>

        {!isBlocked && (
          <div className="space-y-2">
            <Label htmlFor="blockReason">Reason for blocking *</Label>
            <Textarea
              id="blockReason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Enter the reason for blocking this customer..."
              rows={3}
            />
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant={isBlocked ? "default" : "destructive"}
            onClick={handleConfirm}
            disabled={!isBlocked && !reason.trim()}
          >
            {isBlocked ? "Unblock Customer" : "Block Customer"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BlockCustomerDialog;

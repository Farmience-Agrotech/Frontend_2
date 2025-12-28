import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AlertTriangle } from 'lucide-react';
import { useState } from 'react';
import { Supplier } from '@/types/supplier';

interface BlacklistDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier: Supplier | null;
  onConfirm: (reason: string) => void;
}

export const BlacklistDialog = ({
  open,
  onOpenChange,
  supplier,
  onConfirm,
}: BlacklistDialogProps) => {
  const [reason, setReason] = useState('');

  const handleConfirm = () => {
    if (reason.trim()) {
      onConfirm(reason);
      setReason('');
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Blacklist Supplier
          </DialogTitle>
          <DialogDescription>
            You are about to blacklist <strong>{supplier?.companyName}</strong>. This action will
            prevent any future transactions with this supplier. Please provide a reason.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-4">
          <Label htmlFor="reason">Reason for Blacklisting *</Label>
          <Textarea
            id="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Enter the reason for blacklisting this supplier..."
            rows={4}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={!reason.trim()}>
            Confirm Blacklist
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

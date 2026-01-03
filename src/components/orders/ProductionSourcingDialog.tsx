// =============================================================================
// PRODUCTION SOURCING DIALOG
// Dialog shown when transitioning order to "Processing" stage
// =============================================================================

import { useNavigate } from 'react-router-dom';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
    Settings2,
    Package,
    IndianRupee,
    ArrowRight,
    ClipboardList,
} from 'lucide-react';

// =============================================================================
// INTERFACE
// =============================================================================

interface ProductionSourcingDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    orderId: string;
    orderNumber: string;
    itemsCount: number;
    totalAmount: number;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function ProductionSourcingDialog({
                                             open,
                                             onOpenChange,
                                             orderId,
                                             orderNumber,
                                             itemsCount,
                                             totalAmount,
                                         }: ProductionSourcingDialogProps) {
    const navigate = useNavigate();

    // Handle navigation to Production & Sourcing page
    const handleProductionSourcing = () => {
        onOpenChange(false);
        navigate(`/orders/${orderId}/production`);
    };

    // Format currency
    const formatCurrency = (amount: number): string => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0,
        }).format(amount);
    };
    // ===========================================================================
    // RENDER
    // ===========================================================================

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[480px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <ClipboardList className="h-5 w-5 text-blue-600" />
                        Start Processing Order
                    </DialogTitle>
                    <DialogDescription>
                        Configure your production workflow and select suppliers for raw materials.
                    </DialogDescription>
                </DialogHeader>

                {/* Order Summary */}
                <div className="py-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
                        <div className="flex items-center gap-2 text-sm text-blue-700">
                            <Package className="h-4 w-4" />
                            <span className="font-medium">Order:</span>
                            <span>{orderNumber}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-blue-700">
                            <ClipboardList className="h-4 w-4" />
                            <span className="font-medium">Items:</span>
                            <span>{itemsCount} product{itemsCount !== 1 ? 's' : ''}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-blue-700">
                            <IndianRupee className="h-4 w-4" />
                            <span className="font-medium">Total:</span>
                            <span>{formatCurrency(totalAmount)}</span>
                        </div>
                    </div>
                </div>

                {/* Action Description */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                        <Settings2 className="h-5 w-5 text-gray-600 mt-0.5" />
                        <div className="space-y-1">
                            <p className="font-medium text-gray-900">Production and Sourcing</p>
                            <p className="text-sm text-gray-600">
                                Set up your manufacturing workflow stages and choose suppliers for sourcing raw materials.
                            </p>
                        </div>
                    </div>
                </div>

                <DialogFooter className="mt-4">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleProductionSourcing} className="bg-blue-600 hover:bg-blue-700">
                        Production and Sourcing
                        <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
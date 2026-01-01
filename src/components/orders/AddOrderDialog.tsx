import { useState, useMemo } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Label } from '@/components/ui/label.tsx';
import { Textarea } from '@/components/ui/textarea.tsx';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select.tsx';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command.tsx';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover.tsx';
// ✅ Import useCustomers hook instead of mockCustomers
import { useCreateOrder, useProducts, useCustomers } from '@/hooks/useApi';
import type { ApiCustomer } from '@/api/customers.api';
import { Loader2, Check, ChevronsUpDown, Building2, Phone, Mail, MapPin, Plus, Trash2, Package, Percent, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils.ts';
import { useSettings } from '@/contexts/SettingsContext';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge.tsx';

interface OrderItem {
    id: string;
    productId: string;
    quantity: number;
    price: number;
    taxPercentage: number; // ✅ Added: Product-specific tax rate
    popoverOpen: boolean;
}

interface AddOrderDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function AddOrderDialog({ open, onOpenChange }: AddOrderDialogProps) {
    const createOrderMutation = useCreateOrder();
    const { data: apiProducts, isLoading: productsLoading } = useProducts();
    // ✅ Fetch real customers from backend
    const { data: apiCustomers, isLoading: customersLoading } = useCustomers();
    const { toast } = useToast();

    const { orderSettings } = useSettings();

   // Get stock for a product (assuming stock info is in products data)
    const getProductStock = (productId: string): number => {
        if (!apiProducts) return 0;
        const product = (apiProducts as any[]).find(p => p._id === productId);
        return product?.stock ?? product?.currentStock ?? product?.quantity ?? 999; // Default to 999 if no stock field
    };

    const [orderItems, setOrderItems] = useState<OrderItem[]>([
        { id: `item-${Date.now()}`, productId: '', quantity: 0, price: 0, taxPercentage: 18, popoverOpen: false }
    ]);

// Check if any selected product has zero stock (MUST be after orderItems)
    const hasZeroStockItems = useMemo(() => {
        return orderItems.some(item => {
            if (!item.productId) return false;
            return getProductStock(item.productId) === 0;
        });
    }, [orderItems, apiProducts]);

    const [customerPopoverOpen, setCustomerPopoverOpen] = useState(false);
    const [selectedCustomerId, setSelectedCustomerId] = useState('');
    const [priority, setPriority] = useState('medium');
    const [notes, setNotes] = useState('');

    // ✅ Discount (percentage) and Shipping Fee
    const [discountPercent, setDiscountPercent] = useState(0);
    const [shippingFee, setShippingFee] = useState(0);

    // ✅ Transform API customers to consistent format
    const customers = useMemo(() => {
        if (!apiCustomers) return [];
        return (apiCustomers as ApiCustomer[]).map((c) => ({
            id: c._id || c.id,
            _id: c._id,
            businessName: c.businessName || 'Unknown Company',
            contactPerson: c.contactPerson || 'Unknown',
            email: c.email || '',
            primaryPhone: c.primaryPhone || '',
            billingAddress: c.billingAddress,
            deliveryAddresses: c.deliveryAddresses || [],
            gstNumber: c.gstNumber || '',
            status: c.status || 'active',
        }));
    }, [apiCustomers]);

    // ✅ Get selected customer from real data
    const selectedCustomer = useMemo(() => {
        return customers.find((c) => c.id === selectedCustomerId || c._id === selectedCustomerId);
    }, [selectedCustomerId, customers]);

    // ✅ Get products list for dropdown WITH tax percentage and price range
    const products = useMemo(() => {
        if (!apiProducts) return [];
        return (apiProducts as any[]).map((p) => ({
            _id: p._id,
            name: p.name,
            sku: p.sku || '',
            // ✅ FIXED: Use minPrice as default price
            price: p.minPrice || p.price || 0,
            // ✅ FIXED: Include both min and max prices for display
            minPrice: p.minPrice || 0,
            maxPrice: p.maxPrice || p.minPrice || 0,
            // ✅ FIXED: Use taxRate from backend (not taxPercentage)
            taxPercentage: p.taxRate !== undefined ? Number(p.taxRate) : 18,
        }));
    }, [apiProducts]);

    // ✅ Get list of already selected product IDs
    const selectedProductIds = useMemo(() => {
        return orderItems.map(item => item.productId).filter(id => id !== '');
    }, [orderItems]);

    // ✅ Get available products for a specific row (excludes already selected products except current)
    const getAvailableProducts = (currentProductId: string) => {
        return products.filter(p =>
            p._id === currentProductId || !selectedProductIds.includes(p._id)
        );
    };

    // ✅ Get product by ID
    const getProductById = (productId: string) => {
        return products.find(p => p._id === productId);
    };

    // ✅ Add new order item row
    const addOrderItem = () => {
        setOrderItems(prev => [
            ...prev,
            { id: `item-${Date.now()}`, productId: '', quantity: 0, price: 0, taxPercentage: 18, popoverOpen: false }
        ]);
    };

    // ✅ Remove order item row
    const removeOrderItem = (itemId: string) => {
        if (orderItems.length <= 1) {
            toast({
                title: "Cannot Remove",
                description: "At least one product is required",
                variant: "destructive",
            });
            return;
        }
        setOrderItems(prev => prev.filter(item => item.id !== itemId));
    };

    // ✅ Update order item - now includes tax percentage from product
    const updateOrderItem = (itemId: string, field: keyof OrderItem, value: string | number | boolean) => {
        setOrderItems(prev => prev.map(item => {
            if (item.id !== itemId) return item;

            // If product changed, auto-fill price AND tax percentage
            if (field === 'productId') {
                const product = getProductById(value as string);
                return {
                    ...item,
                    productId: value as string,
                    price: product?.price || 0,
                    taxPercentage: product?.taxPercentage ?? 18, // ✅ Use product's tax rate
                    popoverOpen: false,
                };
            }

            return { ...item, [field]: value };
        }));
    };

    // ✅ Toggle product popover
    const toggleProductPopover = (itemId: string, isOpen: boolean) => {
        setOrderItems(prev => prev.map(item =>
            item.id === itemId ? { ...item, popoverOpen: isOpen } : item
        ));
    };

    // ✅ Calculate subtotal (before tax)
    const calculateSubtotal = () => {
        return orderItems.reduce((sum, item) => sum + (item.quantity * item.price), 0);
    };

    // ✅ Calculate tax for each item based on its tax percentage
    const calculateItemTax = (item: OrderItem) => {
        return (item.quantity * item.price) * (item.taxPercentage / 100);
    };

    // ✅ Calculate total tax (sum of all item taxes)
    const calculateTotalTax = () => {
        return orderItems.reduce((sum, item) => sum + calculateItemTax(item), 0);
    };

    // ✅ Calculate discount amount from percentage
    const calculateDiscountAmount = () => {
        return calculateSubtotal() * (discountPercent / 100);
    };

    // ✅ Calculate grand total (subtotal + tax + shipping - discount)
    const calculateTotal = () => {
        return calculateSubtotal() + calculateTotalTax() + shippingFee - calculateDiscountAmount();
    };

    // ✅ Get tax breakdown by rate
    const getTaxBreakdown = () => {
        const breakdown: Record<number, { amount: number; taxableValue: number }> = {};

        orderItems.forEach(item => {
            if (item.productId && item.taxPercentage > 0) {
                const taxableValue = item.quantity * item.price;
                const taxAmount = taxableValue * (item.taxPercentage / 100);

                if (!breakdown[item.taxPercentage]) {
                    breakdown[item.taxPercentage] = { amount: 0, taxableValue: 0 };
                }
                breakdown[item.taxPercentage].amount += taxAmount;
                breakdown[item.taxPercentage].taxableValue += taxableValue;
            }
        });

        return breakdown;
    };

    // ✅ Get valid items count (with selected product)
    const validItemsCount = orderItems.filter(item => item.productId !== '').length;

    const handleSubmit = async () => {
        if (!selectedCustomerId) {
            toast({
                title: "Customer Required",
                description: "Please select a customer",
                variant: "destructive",
            });
            return;
        }

        const validItems = orderItems.filter(item => item.productId !== '');
        if (validItems.length === 0) {
            toast({
                title: "Products Required",
                description: "Please add at least one product",
                variant: "destructive",
            });
            return;
        }

        // Check for zero stock items
        if (hasZeroStockItems && !orderSettings.allowZeroStockOrders) {
            toast({
                title: "Out of Stock",
                description: "One or more products have zero inventory. Enable 'Allow Zero Stock Orders' in Settings → Preferences to proceed.",
                variant: "destructive",
            });
            return;
        }

        // Build order payload for backend
        const orderPayload = {
            customerId: selectedCustomerId,
            products: validItems.map(item => {
                // Include tax in the unit price
                const priceWithTax = item.price * (1 + item.taxPercentage / 100);
                return {
                    productId: item.productId,
                    quantity: item.quantity,
                    price: Math.round(priceWithTax * 100) / 100,
                };
            }),
            shippingCost: shippingFee,
            discount: calculateDiscountAmount(),
            totalAmount: calculateTotal(),
            currency: 'INR',
            status: 'PENDING',
            notes: notes || undefined,
            priority: priority,  // ✅ KEEP THIS
        };

        try {
            await createOrderMutation.mutateAsync(orderPayload as any);
            toast({
                title: "Order Created",
                description: "Order has been created successfully",
            });
            // Reset form
            setSelectedCustomerId('');
            setOrderItems([{ id: `item-${Date.now()}`, productId: '', quantity: 0, price: 0, taxPercentage: 18, popoverOpen: false }]);
            setNotes('');
            setPriority('medium');
            setDiscountPercent(0);   // ✅ Reset discount percentage
            setShippingFee(0);       // ✅ Reset shipping fee
            onOpenChange(false);
        } catch (error: any) {
            toast({
                title: "Error",
                description: error?.message || "Failed to create order",
                variant: "destructive",
            });
        }
    };

    const formatCurrency = (amount: number, showDecimals: boolean = false) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: showDecimals ? 2 : 0,
            maximumFractionDigits: showDecimals ? 2 : 0,
        }).format(amount);
    };

    // Get shipping address display
    const getShippingAddressDisplay = () => {
        if (!selectedCustomer) return null;
        const addr = selectedCustomer.deliveryAddresses?.[0] || selectedCustomer.billingAddress;
        if (!addr) return null;
        return `${addr.city || ''}${addr.state ? `, ${addr.state}` : ''}`;
    };

    // Get tax badge color
    const getTaxBadgeColor = (taxPercentage: number) => {
        switch (taxPercentage) {
            case 0: return 'bg-gray-100 text-gray-700';
            case 5: return 'bg-green-100 text-green-700';
            case 12: return 'bg-blue-100 text-blue-700';
            case 18: return 'bg-amber-100 text-amber-700';
            case 28: return 'bg-red-100 text-red-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Create New Order</DialogTitle>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Customer Selection */}
                    <div className="space-y-4">
                        <Label className="text-base font-medium text-muted-foreground">Customer</Label>

                        <div className="space-y-2">
                            <Label>Select Customer *</Label>
                            <Popover open={customerPopoverOpen} onOpenChange={setCustomerPopoverOpen}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        role="combobox"
                                        aria-expanded={customerPopoverOpen}
                                        className="w-full justify-between font-normal"
                                    >
                                        {selectedCustomer
                                            ? `${selectedCustomer.businessName} - ${selectedCustomer.contactPerson}`
                                            : customersLoading
                                                ? "Loading customers..."
                                                : "Search customer..."}
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[500px] p-0" align="start">
                                    <Command>
                                        <CommandInput placeholder="Search by business name, contact person..." />
                                        <CommandList>
                                            <CommandEmpty>
                                                {customersLoading ? "Loading..." : "No customer found."}
                                            </CommandEmpty>
                                            <CommandGroup heading="Customers">
                                                {customers
                                                    .filter(c => c.status === 'active')
                                                    .map((customer) => {
                                                        const addr = customer.deliveryAddresses?.[0] || customer.billingAddress;
                                                        const city = addr?.city || '';

                                                        return (
                                                            <CommandItem
                                                                key={customer.id}
                                                                value={`${customer.businessName} ${customer.contactPerson} ${city}`}
                                                                onSelect={() => {
                                                                    setSelectedCustomerId(customer.id);
                                                                    setCustomerPopoverOpen(false);
                                                                }}
                                                            >
                                                                <Check
                                                                    className={cn(
                                                                        "mr-2 h-4 w-4",
                                                                        selectedCustomerId === customer.id
                                                                            ? "opacity-100"
                                                                            : "opacity-0"
                                                                    )}
                                                                />
                                                                <div className="flex flex-col">
                                                                    <span className="font-medium">{customer.businessName}</span>
                                                                    <span className="text-xs text-muted-foreground">
                                                                        {customer.contactPerson}{city && ` • ${city}`}
                                                                    </span>
                                                                </div>
                                                            </CommandItem>
                                                        );
                                                    })}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                        </div>

                        {/* Customer Details Card */}
                        {selectedCustomer && (
                            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                                <div className="flex items-center gap-2">
                                    <Building2 className="h-4 w-4 text-muted-foreground" />
                                    <span className="font-medium">{selectedCustomer.businessName}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div className="flex items-center gap-2">
                                        <Mail className="h-3 w-3 text-muted-foreground" />
                                        <span>{selectedCustomer.email || 'N/A'}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Phone className="h-3 w-3 text-muted-foreground" />
                                        <span>{selectedCustomer.primaryPhone || 'N/A'}</span>
                                    </div>
                                </div>
                                {getShippingAddressDisplay() && (
                                    <div className="flex items-center gap-2 text-sm">
                                        <MapPin className="h-3 w-3 text-muted-foreground" />
                                        <span>{getShippingAddressDisplay()}</span>
                                    </div>
                                )}
                                {selectedCustomer.gstNumber && (
                                    <div className="text-xs text-muted-foreground">
                                        GST: {selectedCustomer.gstNumber}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Products Section */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <Label className="text-base font-medium text-muted-foreground">Products</Label>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={addOrderItem}
                                disabled={orderItems.length >= products.length}
                            >
                                <Plus className="h-4 w-4 mr-1" />
                                Add Product
                            </Button>
                        </div>

                        {/* Order Items */}
                        <div className="space-y-4">
                            {orderItems.map((item, index) => {
                                const selectedProduct = getProductById(item.productId);
                                const availableProducts = getAvailableProducts(item.productId);
                                const lineTotal = item.quantity * item.price;
                                const lineTax = calculateItemTax(item);
                                const lineTotalWithTax = lineTotal + lineTax;

                                return (
                                    <div
                                        key={item.id}
                                        className="border rounded-lg p-4 space-y-3 bg-card"
                                    >
                                        {/* Item Header */}
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Package className="h-4 w-4 text-muted-foreground" />
                                                <span className="font-medium text-sm">Item {index + 1}</span>
                                                {/* ✅ Show tax badge when product is selected */}
                                                {selectedProduct && (
                                                    <Badge className={cn("text-xs", getTaxBadgeColor(item.taxPercentage))}>
                                                        {item.taxPercentage}% GST
                                                    </Badge>
                                                )}
                                            </div>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-destructive hover:text-destructive"
                                                onClick={() => removeOrderItem(item.id)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>

                                        {/* ✅ Searchable Product Selection */}
                                        <div className="space-y-2">
                                            <Label>Product *</Label>
                                            <Popover
                                                open={item.popoverOpen}
                                                onOpenChange={(isOpen) => toggleProductPopover(item.id, isOpen)}
                                            >
                                                <PopoverTrigger asChild>
                                                    <Button
                                                        variant="outline"
                                                        role="combobox"
                                                        aria-expanded={item.popoverOpen}
                                                        className="w-full justify-between font-normal"
                                                    >
                                                        {selectedProduct
                                                            ? `${selectedProduct.name} - ${selectedProduct.sku}`
                                                            : productsLoading
                                                                ? "Loading products..."
                                                                : "Search product..."}
                                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-[450px] p-0" align="start">
                                                    <Command>
                                                        <CommandInput placeholder="Search by product name, SKU..." />
                                                        <CommandList>
                                                            <CommandEmpty>No product found.</CommandEmpty>
                                                            <CommandGroup heading="Available Products">
                                                                {availableProducts.map((product) => (
                                                                    <CommandItem
                                                                        key={product._id}
                                                                        value={`${product.name} ${product.sku}`}
                                                                        onSelect={() => {
                                                                            updateOrderItem(item.id, 'productId', product._id);
                                                                        }}
                                                                    >
                                                                        <Check
                                                                            className={cn(
                                                                                "mr-2 h-4 w-4",
                                                                                item.productId === product._id
                                                                                    ? "opacity-100"
                                                                                    : "opacity-0"
                                                                            )}
                                                                        />
                                                                        <div className="flex flex-col flex-1">
                                                                            <div className="flex items-center justify-between">
                                                                                <span className="font-medium">{product.name}</span>
                                                                                <div className="flex items-center gap-2">
                                                                                    {/* ✅ Show tax rate in dropdown */}
                                                                                    <Badge className={cn("text-[10px] px-1.5 py-0", getTaxBadgeColor(product.taxPercentage))}>
                                                                                        {product.taxPercentage}%
                                                                                    </Badge>
                                                                                    {/* ✅ FIXED: Show price range */}
                                                                                    <span className="text-sm text-primary font-medium">
                                                                                        {product.minPrice === product.maxPrice
                                                                                            ? formatCurrency(product.minPrice)
                                                                                            : `${formatCurrency(product.minPrice)} - ${formatCurrency(product.maxPrice)}`
                                                                                        }
                                                                                    </span>
                                                                                </div>
                                                                            </div>
                                                                            <span className="text-xs text-muted-foreground">
                                                                                SKU: {product.sku || 'N/A'}
                                                                            </span>
                                                                        </div>
                                                                    </CommandItem>
                                                                ))}
                                                            </CommandGroup>
                                                        </CommandList>
                                                    </Command>
                                                </PopoverContent>
                                            </Popover>
                                        </div>

                                        {/* Quantity, Price, Tax, Line Total */}
                                        {selectedProduct && (
                                            <div className="space-y-3">
                                                <div className="grid grid-cols-4 gap-3">
                                                    <div className="space-y-2">
                                                        <Label>Quantity *</Label>
                                                        <Input
                                                            type="number"
                                                            min="0"
                                                            value={item.quantity}
                                                            onChange={(e) => updateOrderItem(item.id, 'quantity', parseInt(e.target.value) || 0)}
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label>Price *</Label>
                                                        <Input
                                                            type="number"
                                                            min="0"
                                                            value={item.price}
                                                            onChange={(e) => updateOrderItem(item.id, 'price', parseFloat(e.target.value) || 0)}
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label>Tax ({item.taxPercentage}%)</Label>
                                                        <div className="h-10 px-3 py-2 bg-muted rounded-md flex items-center text-sm text-muted-foreground">
                                                            {formatCurrency(lineTax, true)}
                                                        </div>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label>Line Total</Label>
                                                        <div className="h-10 px-3 py-2 bg-muted rounded-md flex items-center font-medium">
                                                            {formatCurrency(lineTotalWithTax)}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* No products available message */}
                        {orderItems.length >= products.length && products.length > 0 && (
                            <p className="text-sm text-muted-foreground text-center py-2">
                                All available products have been added
                            </p>
                        )}
                    </div>

                    {/* Priority Selection */}
                    <div className="space-y-2">
                        <Label>Priority</Label>
                        <Select value={priority} onValueChange={setPriority}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="low">Low</SelectItem>
                                <SelectItem value="medium">Medium</SelectItem>
                                <SelectItem value="high">High</SelectItem>
                                <SelectItem value="urgent">Urgent</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Notes */}
                    <div className="space-y-2">
                        <Label>Notes</Label>
                        <Textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Any special instructions..."
                            rows={3}
                        />
                    </div>

                    {/* Zero Stock Warning */}
                    {hasZeroStockItems && orderSettings.allowZeroStockOrders && (
                        <Alert className="border-amber-200 bg-amber-50">
                            <AlertTriangle className="h-4 w-4 text-amber-600" />
                            <AlertDescription className="text-amber-800">
                                <strong>Warning:</strong> One or more products have zero inventory.
                                This order will be processed as a backorder.
                            </AlertDescription>
                        </Alert>
                    )}

                    {/* ✅ Order Summary with Editable Discount & Shipping */}
                    <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                        <h3 className="font-medium">Order Summary</h3>

                        {/* Subtotal */}
                        <div className="flex justify-between text-sm items-center">
                            <span>Subtotal ({validItemsCount} {validItemsCount === 1 ? 'item' : 'items'})</span>
                            <span>{formatCurrency(calculateSubtotal())}</span>
                        </div>

                        {/* Total Tax */}
                        <div className="flex justify-between text-sm items-center">
                            <span>Total Tax</span>
                            <span>{formatCurrency(calculateTotalTax(), true)}</span>
                        </div>

                        {/* ✅ Editable Shipping Fee */}
                        <div className="flex justify-between text-sm items-center">
                            <span>Shipping Fee</span>
                            <div className="flex items-center gap-1">
                                <span className="text-muted-foreground">₹</span>
                                <Input
                                    type="number"
                                    min="0"
                                    value={shippingFee}
                                    onChange={(e) => setShippingFee(Number(e.target.value) || 0)}
                                    className="w-24 h-8 text-right"
                                />
                            </div>
                        </div>

                        {/* ✅ Editable Discount (Percentage) */}
                        <div className="flex justify-between text-sm items-center">
                            <span className="text-green-600">Discount</span>
                            <div className="flex items-center gap-2">
                                <Input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={discountPercent}
                                    onChange={(e) => setDiscountPercent(Math.min(100, Number(e.target.value) || 0))}
                                    className="w-20 h-8 text-right"
                                />
                                <span className="text-muted-foreground">%</span>
                                {discountPercent > 0 && (
                                    <span className="text-green-600 ml-2">
                                        (-{formatCurrency(calculateDiscountAmount())})
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Grand Total */}
                        <div className="flex justify-between font-semibold pt-2 border-t text-lg">
                            <span>Grand Total</span>
                            <span>{formatCurrency(calculateTotal())}</span>
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={
                            createOrderMutation.isPending ||
                            !selectedCustomerId ||
                            validItemsCount === 0
                        }
                    >
                        {createOrderMutation.isPending && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Create Order
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
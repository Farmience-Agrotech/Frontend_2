// =============================================================================
// PRODUCTION SOURCING PAGE
// Per-order configuration page for production workflow and supplier selection
// Route: /orders/:id/production
// =============================================================================

import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
    ArrowLeft,
    Package,
    ClipboardList,
    Truck,
    CheckCircle2,
    Circle,
    Building2,
    Phone,
    Mail,
    Loader2,
    Save,
    User,
    ChevronDown,
    ChevronUp,
} from 'lucide-react';

// Hooks & API
import { useOrders, useProducts, useCustomers, useUpdateOrderStatus } from '@/hooks/useApi';
import { listSuppliers, ApiSupplier } from '@/api/suppliers.api';
import type { ApiOrder } from '@/api/orders.api';
import type { ApiCustomer } from '@/api/customers.api';

// Template Hook
import { useProductionTemplate } from '@/hooks/useProductionTemplate';

// Types
import {
    SelectedSupplier,
    ProductionStageWithValues,
    StageFieldValue,
} from '@/types/production';

// =============================================================================
// COMPONENT
// =============================================================================

export default function ProductionSourcing() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { toast } = useToast();

    // ---------------------------------------------------------------------------
    // DATA FETCHING
    // ---------------------------------------------------------------------------
    const { data: apiOrders, isLoading: ordersLoading } = useOrders();
    const { data: apiProducts, isLoading: productsLoading } = useProducts();
    const { data: apiCustomers, isLoading: customersLoading } = useCustomers();
    const updateStatusMutation = useUpdateOrderStatus();

    // Template
    const {
        template,
        isLoading: templateLoading,
        getOrderProductionData,
        saveOrderProductionData,
    } = useProductionTemplate();

    // Suppliers state
    const [suppliers, setSuppliers] = useState<ApiSupplier[]>([]);
    const [suppliersLoading, setSuppliersLoading] = useState(true);

    // ---------------------------------------------------------------------------
    // LOCAL STATE
    // ---------------------------------------------------------------------------
    const [stages, setStages] = useState<ProductionStageWithValues[]>([]);
    const [selectedSuppliers, setSelectedSuppliers] = useState<SelectedSupplier[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [expandedStage, setExpandedStage] = useState<string | null>(null);
    const [savedSupplierIds, setSavedSupplierIds] = useState<string[]>([]);

    // ---------------------------------------------------------------------------
    // INITIALIZE STAGES FROM TEMPLATE OR SAVED DATA
    // ---------------------------------------------------------------------------
    useEffect(() => {
        if (!template || template.stages.length === 0 || !id) return;

        // Check for existing saved data for this order
        const savedData = getOrderProductionData(id);

        if (savedData && savedData.stages.length > 0) {
            // Use saved data
            setStages(savedData.stages);

            // Store supplier IDs to restore after suppliers load
            if (savedData.selectedSupplierIds.length > 0) {
                setSavedSupplierIds(savedData.selectedSupplierIds);
            }
        } else {
            // Initialize fresh from template
            const initialStages: ProductionStageWithValues[] = template.stages.map((stage) => ({
                stageId: stage.id,
                stageName: stage.stageName,
                isCompleted: false,
                fieldValues: stage.fields.map((field) => ({
                    fieldId: field.id,
                    fieldName: field.name,
                    value: field.type === 'checkbox' ? false : '',
                    unit: field.unit,
                })),
            }));
            setStages(initialStages);
        }
    }, [template, id, getOrderProductionData]);

    // ---------------------------------------------------------------------------
    // FETCH SUPPLIERS
    // ---------------------------------------------------------------------------
    useEffect(() => {
        const fetchSuppliers = async () => {
            try {
                const data = await listSuppliers();
                setSuppliers(data);
            } catch (error) {
                console.error('Failed to fetch suppliers:', error);
            } finally {
                setSuppliersLoading(false);
            }
        };
        fetchSuppliers();
    }, []);

    // ---------------------------------------------------------------------------
    // RESTORE SELECTED SUPPLIERS FROM SAVED DATA
    // ---------------------------------------------------------------------------
    useEffect(() => {
        if (savedSupplierIds.length > 0 && suppliers.length > 0) {
            const restoredSuppliers: SelectedSupplier[] = [];
            savedSupplierIds.forEach((supplierId) => {
                const supplier = suppliers.find((s) => s._id === supplierId);
                if (supplier) {
                    restoredSuppliers.push({
                        supplierId: supplier._id,
                        companyName: supplier.companyName,
                        contactPerson: supplier.contactPerson,
                        phone: supplier.phone,
                        email: supplier.email,
                        productCategories: supplier.productCategories || [],
                        selectedForCategories: [],
                    });
                }
            });
            if (restoredSuppliers.length > 0) {
                setSelectedSuppliers(restoredSuppliers);
            }
            setSavedSupplierIds([]); // Clear after restoring
        }
    }, [savedSupplierIds, suppliers]);

    // ---------------------------------------------------------------------------
    // CUSTOMER LOOKUP
    // ---------------------------------------------------------------------------
    const customerMap = useMemo(() => {
        if (!apiCustomers) return new Map<string, ApiCustomer>();
        const map = new Map<string, ApiCustomer>();
        (apiCustomers as ApiCustomer[]).forEach((c) => {
            if (c._id) map.set(c._id, c);
            if (c.id && c.id !== c._id) map.set(c.id, c);
        });
        return map;
    }, [apiCustomers]);

    // ---------------------------------------------------------------------------
    // GET CURRENT ORDER
    // ---------------------------------------------------------------------------
    const order = useMemo(() => {
        if (!apiOrders || !id) return null;
        return (apiOrders as ApiOrder[]).find((o) => o._id === id || o.orderId === id);
    }, [apiOrders, id]);

    // ---------------------------------------------------------------------------
    // GET LINKED CUSTOMER
    // ---------------------------------------------------------------------------
    const linkedCustomer = useMemo(() => {
        if (!order?.customerId) return null;
        return customerMap.get(order.customerId) || null;
    }, [order, customerMap]);

    // ---------------------------------------------------------------------------
    // GET PRODUCT CATEGORIES FROM ORDER ITEMS
    // ---------------------------------------------------------------------------
    const orderProductCategories = useMemo(() => {
        if (!order || !apiProducts) return [];

        const productIds = order.items.map((item) => item.productId);
        const categories = new Set<string>();

        (apiProducts as any[]).forEach((product) => {
            if (productIds.includes(product._id)) {
                if (product.category) categories.add(product.category);
                if (product.productCategories) {
                    product.productCategories.forEach((cat: string) => categories.add(cat));
                }
            }
        });

        if (categories.size === 0) {
            return ['Raw Materials', 'Textiles', 'Packaging'];
        }

        return Array.from(categories);
    }, [order, apiProducts]);

    // ---------------------------------------------------------------------------
    // FILTER SUPPLIERS
    // ---------------------------------------------------------------------------
    const filteredSuppliers = useMemo(() => {
        if (!suppliers.length) return [];

        const categoryFiltered = suppliers.filter((supplier) => {
            if (supplier.status !== 'active') return false;

            const hasMatchingCategory = supplier.productCategories?.some((cat) =>
                orderProductCategories.some(
                    (orderCat) =>
                        cat.toLowerCase().includes(orderCat.toLowerCase()) ||
                        orderCat.toLowerCase().includes(cat.toLowerCase())
                )
            );

            return hasMatchingCategory;
        });

        if (categoryFiltered.length === 0) {
            return suppliers.filter((supplier) => supplier.status === 'active');
        }

        return categoryFiltered;
    }, [suppliers, orderProductCategories]);

    // ---------------------------------------------------------------------------
    // HANDLERS
    // ---------------------------------------------------------------------------

    // Toggle stage completion
    const handleStageToggle = (stageId: string) => {
        setStages((prev) =>
            prev.map((stage) =>
                stage.stageId === stageId
                    ? {
                        ...stage,
                        isCompleted: !stage.isCompleted,
                        completedAt: !stage.isCompleted ? new Date().toISOString() : undefined,
                    }
                    : stage
            )
        );
    };

    // Update field value
    const handleFieldChange = (stageId: string, fieldId: string, value: string | number | boolean) => {
        setStages((prev) =>
            prev.map((stage) =>
                stage.stageId === stageId
                    ? {
                        ...stage,
                        fieldValues: stage.fieldValues.map((fv) =>
                            fv.fieldId === fieldId ? { ...fv, value } : fv
                        ),
                    }
                    : stage
            )
        );
    };

    // Toggle expanded stage
    const toggleExpandedStage = (stageId: string) => {
        setExpandedStage((prev) => (prev === stageId ? null : stageId));
    };

    // Toggle supplier selection
    const handleSupplierToggle = (supplier: ApiSupplier) => {
        setSelectedSuppliers((prev) => {
            const exists = prev.find((s) => s.supplierId === supplier._id);
            if (exists) {
                return prev.filter((s) => s.supplierId !== supplier._id);
            }
            return [
                ...prev,
                {
                    supplierId: supplier._id,
                    companyName: supplier.companyName,
                    contactPerson: supplier.contactPerson,
                    phone: supplier.phone,
                    email: supplier.email,
                    productCategories: supplier.productCategories || [],
                    selectedForCategories: (supplier.productCategories || []).filter((cat) =>
                        orderProductCategories.includes(cat)
                    ),
                },
            ];
        });
    };

    // Check if supplier is selected
    const isSupplierSelected = (supplierId: string): boolean => {
        return selectedSuppliers.some((s) => s.supplierId === supplierId);
    };

    // Save configuration
    const handleSave = async () => {
        if (!order || !id) return;

        setIsSaving(true);
        try {
            // Save production data to localStorage
            saveOrderProductionData(
                id,
                stages,
                selectedSuppliers.map((s) => s.supplierId)
            );
            // Build notes from stages and field values
            const stageNotes = stages
                .map((stage) => {
                    const fieldNotes = stage.fieldValues
                        .filter((fv) => fv.value !== '' && fv.value !== false)
                        .map((fv) => `  - ${fv.fieldName}: ${fv.value}${fv.unit ? ' ' + fv.unit : ''}`)
                        .join('\n');
                    return fieldNotes ? `${stage.stageName}:\n${fieldNotes}` : null;
                })
                .filter(Boolean)
                .join('\n\n');

            const supplierNames = selectedSuppliers.map((s) => s.companyName).join(', ');

            const note = [
                `Production started with ${selectedSuppliers.length} supplier(s) selected.`,
                supplierNames ? `Suppliers: ${supplierNames}` : '',
                stageNotes ? `\nInitial Data:\n${stageNotes}` : '',
            ]
                .filter(Boolean)
                .join('\n');

            await updateStatusMutation.mutateAsync({
                orderId: order.orderId || order._id,
                newStatus: 'processing',
                note,
            });

            toast({
                title: 'Production Started',
                description: 'Order has been moved to processing stage.',
            });

            navigate(`/orders/${id}`);
        } catch (error) {
            console.error('Failed to save:', error);
            toast({
                title: 'Error',
                description: 'Failed to save production configuration.',
                variant: 'destructive',
            });
        } finally {
            setIsSaving(false);
        }
    };

    // Calculate progress
    const progress = useMemo(() => {
        if (stages.length === 0) return 0;
        const completed = stages.filter((s) => s.isCompleted).length;
        return Math.round((completed / stages.length) * 100);
    }, [stages]);

    // Format currency
    const formatCurrency = (amount: number): string => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0,
        }).format(amount);
    };

    // Get customer display name
    const getCustomerName = (): string => {
        if (linkedCustomer) {
            return linkedCustomer.contactPerson || linkedCustomer.businessName || 'Unknown';
        }
        return 'N/A';
    };

    // ---------------------------------------------------------------------------
    // LOADING STATE
    // ---------------------------------------------------------------------------
    if (ordersLoading || productsLoading || customersLoading || suppliersLoading || templateLoading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            </DashboardLayout>
        );
    }

    // ---------------------------------------------------------------------------
    // NOT FOUND STATE
    // ---------------------------------------------------------------------------
    if (!order) {
        return (
            <DashboardLayout>
                <div className="space-y-6">
                    <Button variant="ghost" onClick={() => navigate('/orders')}>
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Orders
                    </Button>
                    <div className="text-center py-16">
                        <h1 className="text-2xl font-bold">Order Not Found</h1>
                        <p className="text-muted-foreground">This order does not exist.</p>
                    </div>
                </div>
            </DashboardLayout>
        );
    }
    // ===========================================================================
    // RENDER
    // ===========================================================================

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" onClick={() => navigate(`/orders/${id}`)}>
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back to Order
                        </Button>
                        <Separator orientation="vertical" className="h-6" />
                        <div>
                            <h1 className="text-2xl font-bold">Production & Sourcing</h1>
                            <p className="text-muted-foreground">
                                Configure workflow and select suppliers for this order
                            </p>
                        </div>
                    </div>
                    <Button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="bg-blue-600 hover:bg-blue-700"
                    >
                        {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        <Save className="h-4 w-4 mr-2" />
                        Save & Start Processing
                    </Button>
                </div>

                {/* Order Summary Card */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Package className="h-5 w-5 text-blue-600" />
                            Order Summary
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="space-y-1">
                                <p className="text-sm text-muted-foreground">Order Number</p>
                                <p className="font-medium">{order.orderNumber}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm text-muted-foreground">Customer</p>
                                <p className="font-medium">{getCustomerName()}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm text-muted-foreground">Items</p>
                                <p className="font-medium">{order.items?.length || 0} products</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm text-muted-foreground">Total Amount</p>
                                <p className="font-medium">{formatCurrency(order.totalAmount || 0)}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Workflow Stages Card */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="flex items-center gap-2">
                                        <ClipboardList className="h-5 w-5 text-amber-600" />
                                        Workflow Stages
                                    </CardTitle>
                                    <CardDescription>
                                        Using template: {template.name} ({stages.length} stages)
                                    </CardDescription>
                                </div>
                                <Badge variant="outline" className="text-sm">
                                    {progress}% Complete
                                </Badge>
                            </div>
                            <Progress value={progress} className="h-2 mt-2" />
                        </CardHeader>
                        <CardContent>
                            {stages.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    <ClipboardList className="h-10 w-10 mx-auto mb-2 opacity-50" />
                                    <p>No stages configured</p>
                                    <p className="text-sm">Edit the template to add stages</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {stages.map((stage, index) => {
                                        const templateStage = template.stages.find(
                                            (ts) => ts.id === stage.stageId
                                        );

                                        return (
                                            <div
                                                key={stage.stageId}
                                                className={`rounded-lg border transition-colors ${
                                                    stage.isCompleted
                                                        ? 'bg-green-50 border-green-200'
                                                        : 'bg-gray-50 border-gray-200'
                                                }`}
                                            >
                                                {/* Stage Header */}
                                                <div
                                                    className="flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-100/50"
                                                    onClick={() => toggleExpandedStage(stage.stageId)}
                                                >
                                                    <Checkbox
                                                        id={stage.stageId}
                                                        checked={stage.isCompleted}
                                                        onCheckedChange={() => handleStageToggle(stage.stageId)}
                                                        onClick={(e) => e.stopPropagation()}
                                                    />
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs text-muted-foreground font-medium">
                                                                {String(index + 1).padStart(2, '0')}
                                                            </span>
                                                            <label
                                                                htmlFor={stage.stageId}
                                                                className={`font-medium cursor-pointer ${
                                                                    stage.isCompleted ? 'text-green-700' : ''
                                                                }`}
                                                            >
                                                                {stage.stageName}
                                                            </label>
                                                            {templateStage && templateStage.fields.length > 0 && (
                                                                <Badge variant="secondary" className="text-xs">
                                                                    {templateStage.fields.length} field(s)
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        {templateStage?.description && (
                                                            <p className="text-sm text-muted-foreground">
                                                                {templateStage.description}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {stage.isCompleted ? (
                                                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                                                        ) : (
                                                            <Circle className="h-5 w-5 text-gray-300" />
                                                        )}
                                                        {templateStage && templateStage.fields.length > 0 && (
                                                            expandedStage === stage.stageId ? (
                                                                <ChevronUp className="h-4 w-4 text-muted-foreground" />
                                                            ) : (
                                                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                                            )
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Expanded Fields Section */}
                                                {expandedStage === stage.stageId &&
                                                    templateStage &&
                                                    templateStage.fields.length > 0 && (
                                                        <div className="px-3 pb-3 pt-0 border-t border-gray-200">
                                                            <div className="pt-3 space-y-3">
                                                                {templateStage.fields.map((field) => {
                                                                    const fieldValue = stage.fieldValues.find(
                                                                        (fv) => fv.fieldId === field.id
                                                                    );

                                                                    return (
                                                                        <div key={field.id}>
                                                                            <Label
                                                                                htmlFor={`${stage.stageId}-${field.id}`}
                                                                                className="text-sm"
                                                                            >
                                                                                {field.name}
                                                                                {field.unit && (
                                                                                    <span className="text-muted-foreground ml-1">
                                                                                        ({field.unit})
                                                                                    </span>
                                                                                )}
                                                                            </Label>

                                                                            {field.type === 'textarea' ? (
                                                                                <Textarea
                                                                                    id={`${stage.stageId}-${field.id}`}
                                                                                    value={(fieldValue?.value as string) || ''}
                                                                                    onChange={(e) =>
                                                                                        handleFieldChange(
                                                                                            stage.stageId,
                                                                                            field.id,
                                                                                            e.target.value
                                                                                        )
                                                                                    }
                                                                                    placeholder={field.placeholder}
                                                                                    rows={2}
                                                                                    className="mt-1"
                                                                                />
                                                                            ) : field.type === 'checkbox' ? (
                                                                                <div className="flex items-center gap-2 mt-1">
                                                                                    <Checkbox
                                                                                        id={`${stage.stageId}-${field.id}`}
                                                                                        checked={
                                                                                            (fieldValue?.value as boolean) || false
                                                                                        }
                                                                                        onCheckedChange={(checked) =>
                                                                                            handleFieldChange(
                                                                                                stage.stageId,
                                                                                                field.id,
                                                                                                checked as boolean
                                                                                            )
                                                                                        }
                                                                                    />
                                                                                    <label
                                                                                        htmlFor={`${stage.stageId}-${field.id}`}
                                                                                        className="text-sm cursor-pointer"
                                                                                    >
                                                                                        {field.placeholder || 'Yes'}
                                                                                    </label>
                                                                                </div>
                                                                            ) : (
                                                                                <Input
                                                                                    id={`${stage.stageId}-${field.id}`}
                                                                                    type={field.type === 'number' ? 'number' : 'text'}
                                                                                    value={(fieldValue?.value as string | number) || ''}
                                                                                    onChange={(e) =>
                                                                                        handleFieldChange(
                                                                                            stage.stageId,
                                                                                            field.id,
                                                                                            field.type === 'number'
                                                                                                ? e.target.value === ''
                                                                                                    ? ''
                                                                                                    : Number(e.target.value)
                                                                                                : e.target.value
                                                                                        )
                                                                                    }
                                                                                    placeholder={field.placeholder}
                                                                                    className="mt-1"
                                                                                />
                                                                            )}
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Supplier Selection Card */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="flex items-center gap-2">
                                        <Truck className="h-5 w-5 text-purple-600" />
                                        Select Suppliers
                                    </CardTitle>
                                    <CardDescription>
                                        Choose suppliers for raw materials ({filteredSuppliers.length} available)
                                    </CardDescription>
                                </div>
                                {selectedSuppliers.length > 0 && (
                                    <Badge className="bg-purple-100 text-purple-700">
                                        {selectedSuppliers.length} selected
                                    </Badge>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent>
                            {filteredSuppliers.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    <Building2 className="h-10 w-10 mx-auto mb-2 opacity-50" />
                                    <p>No suppliers available</p>
                                    <p className="text-sm">
                                        Add suppliers in the Suppliers section to select them here
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                                    {filteredSuppliers.map((supplier) => (
                                        <div
                                            key={supplier._id}
                                            onClick={() => handleSupplierToggle(supplier)}
                                            className={`p-4 rounded-lg border cursor-pointer transition-all ${
                                                isSupplierSelected(supplier._id)
                                                    ? 'bg-purple-50 border-purple-300 ring-1 ring-purple-300'
                                                    : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                                            }`}
                                        >
                                            <div className="flex items-start gap-3">
                                                <Checkbox
                                                    checked={isSupplierSelected(supplier._id)}
                                                    onCheckedChange={() => handleSupplierToggle(supplier)}
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <Building2 className="h-4 w-4 text-gray-500" />
                                                        <span className="font-medium truncate">
                                                            {supplier.companyName}
                                                        </span>
                                                    </div>
                                                    <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                                                        <div className="flex items-center gap-2">
                                                            <User className="h-3 w-3" />
                                                            <span>{supplier.contactPerson}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <Phone className="h-3 w-3" />
                                                            <span>{supplier.phone}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <Mail className="h-3 w-3" />
                                                            <span className="truncate">{supplier.email}</span>
                                                        </div>
                                                    </div>
                                                    {supplier.productCategories &&
                                                        supplier.productCategories.length > 0 && (
                                                            <div className="mt-2 flex flex-wrap gap-1">
                                                                {supplier.productCategories
                                                                    .slice(0, 3)
                                                                    .map((cat) => (
                                                                        <Badge
                                                                            key={cat}
                                                                            variant="secondary"
                                                                            className="text-xs"
                                                                        >
                                                                            {cat}
                                                                        </Badge>
                                                                    ))}
                                                                {supplier.productCategories.length > 3 && (
                                                                    <Badge
                                                                        variant="secondary"
                                                                        className="text-xs"
                                                                    >
                                                                        +{supplier.productCategories.length - 3} more
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                        )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </DashboardLayout>
    );
}
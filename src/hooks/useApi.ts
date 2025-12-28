// =============================================================================
// REACT QUERY HOOKS - For All Endpoints (FIXED)
// =============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

// API Services
import authApi from '@/api/auth.api';
import productsApi from '@/api/products.api';
import ordersApi from '@/api/orders.api';
import inventoryApi from '@/api/inventory.api';
import templatesApi from '@/api/templates.api';
import { customersApi, ApiCustomer } from '@/api/customers.api';
import { suppliersApi, ApiSupplier } from '@/api/suppliers.api';

// Types
import {
    User,
    LoginRequest,
    RegisterRequest,
    Product,
    CreateProductRequest,
    Order,
    CreateOrderRequest,
    Inventory,
    CreateInventoryRequest,
    UpdateStockRequest,
} from '@/types/api.types';

import { ApiTemplate, ApiTemplateField } from '@/api/templates.api';

// =============================================================================
// QUERY KEYS
// =============================================================================

export const queryKeys = {
    users: ['users'] as const,
    products: ['products'] as const,
    product: (id: string) => ['products', id] as const,
    orders: ['orders'] as const,
    inventory: ['inventory'] as const,
    templates: ['templates'] as const,
    customers: ['customers'] as const,
    suppliers: ['suppliers'] as const,
};

// =============================================================================
// AUTH HOOKS
// =============================================================================

export function useLogin() {
    const { toast } = useToast();

    return useMutation({
        mutationFn: (credentials: LoginRequest) => authApi.login(credentials),
        onSuccess: (data) => {
            toast({
                title: 'Login Successful',
                description: `Welcome! You are logged in as ${data.role}`,
            });
        },
        onError: (error: Error) => {
            toast({
                title: 'Login Failed',
                description: error.message,
                variant: 'destructive',
            });
        },
    });
}

export function useRegister() {
    const { toast } = useToast();

    return useMutation({
        mutationFn: (data: RegisterRequest) => authApi.register(data),
        onSuccess: (data) => {
            toast({
                title: 'Registration Successful',
                description: `User ${data.userName} has been created`,
            });
        },
        onError: (error: Error) => {
            toast({
                title: 'Registration Failed',
                description: error.message,
                variant: 'destructive',
            });
        },
    });
}

export function useUsers() {
    return useQuery({
        queryKey: queryKeys.users,
        queryFn: () => authApi.listUsers(),
    });
}

// =============================================================================
// PRODUCT HOOKS
// =============================================================================

export function useProducts() {
    return useQuery({
        queryKey: queryKeys.products,
        queryFn: () => productsApi.list(),
    });
}

export function useProduct(id: string | undefined) {
    const { data: products, isLoading, error } = useProducts();

    const product = id && products
        ? products.find((p) => p._id === id || p.sku === id)
        : undefined;

    return {
        data: product,
        isLoading,
        error,
    };
}

export function useCreateProduct() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: (data: CreateProductRequest) => productsApi.create(data),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.products });
            toast({
                title: 'Product Created',
                description: `${data.name} has been added`,
            });
        },
        onError: (error: Error) => {
            toast({
                title: 'Failed to Create Product',
                description: error.message,
                variant: 'destructive',
            });
        },
    });
}

// =============================================================================
// ORDER HOOKS
// =============================================================================

export function useOrders() {
    return useQuery({
        queryKey: queryKeys.orders,
        queryFn: () => ordersApi.listAll(),
    });
}

export function useOrdersOnly() {
    return useQuery({
        queryKey: ['orders-only'],
        queryFn: () => ordersApi.listOrders(),
    });
}

export function useQuotationsOnly() {
    return useQuery({
        queryKey: ['quotations-only'],
        queryFn: () => ordersApi.listQuotations(),
    });
}

export function useCreateOrder() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: (data: CreateOrderRequest) => ordersApi.create(data),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.orders });
            queryClient.invalidateQueries({ queryKey: queryKeys.inventory });
            toast({
                title: 'Order Created',
                description: `Order ${data.orderId} has been placed`,
            });
        },
        onError: (error: Error) => {
            toast({
                title: 'Failed to Create Order',
                description: error.message,
                variant: 'destructive',
            });
        },
    });
}

export function useUpdateOrder() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
            ordersApi.update(id, data as any),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.orders });
            toast({
                title: 'Order Updated',
                description: 'Order status has been updated',
            });
        },
        onError: (error: Error) => {
            toast({
                title: 'Failed to Update Order',
                description: error.message,
                variant: 'destructive',
            });
        },
    });
}

// =============================================================================
// QUOTATION HOOKS
// =============================================================================

export function useUpdateQuotation() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: ({ quotationId, data }: { quotationId: string; data: Record<string, unknown> }) =>
            ordersApi.updateQuotation(quotationId, data as any),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.orders });
            toast({
                title: 'Quotation Updated',
                description: 'Quotation has been updated',
            });
        },
        onError: (error: Error) => {
            toast({
                title: 'Failed to Update Quotation',
                description: error.message,
                variant: 'destructive',
            });
        },
    });
}

/**
 * Send Quote - Admin sends quoted prices to customer
 * Sets status to QUOTE_SENT (customer's turn)
 */
export function useSendQuote() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: ({
                         quotationId,
                         products,
                         notes
                     }: {
            quotationId: string;
            products: { productId: string; quantity: number; targetPrice: number; quotedPrice: number }[];
            notes?: string;
        }) => ordersApi.sendQuote(quotationId, products, notes),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.orders });
            toast({
                title: 'Quote Sent! ✅',
                description: 'Quote has been sent to the customer. Waiting for their response.',
            });
        },
        onError: (error: Error) => {
            toast({
                title: 'Failed to Send Quote',
                description: error.message,
                variant: 'destructive',
            });
        },
    });
}

/**
 * Accept Counter-Offer - Admin accepts customer's counter-offer
 * Sets status to ACCEPTED (deal done!)
 */
export function useAcceptCounter() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: ({
                         quotationId,
                         products
                     }: {
            quotationId: string;
            products: { productId: string; quantity: number; targetPrice: number; quotedPrice: number }[];
        }) => ordersApi.acceptCounter(quotationId, products),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.orders });
            toast({
                title: 'Counter-Offer Accepted! 🎉',
                description: 'Order has been confirmed at the negotiated price.',
            });
        },
        onError: (error: Error) => {
            toast({
                title: 'Failed to Accept Counter-Offer',
                description: error.message,
                variant: 'destructive',
            });
        },
    });
}

/**
 * Reject Counter-Offer - Admin rejects customer's counter-offer
 * Sets status to REJECTED (negotiation ended)
 */
export function useRejectCounter() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: ({
                         quotationId,
                         reason
                     }: {
            quotationId: string;
            reason?: string;
        }) => ordersApi.rejectCounter(quotationId, reason),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.orders });
            toast({
                title: 'Counter-Offer Rejected',
                description: 'The negotiation has been ended.',
            });
        },
        onError: (error: Error) => {
            toast({
                title: 'Failed to Reject Counter-Offer',
                description: error.message,
                variant: 'destructive',
            });
        },
    });
}

/**
 * Accept Quote Request - Admin accepts customer's initial target price
 * Sets status to ACCEPTED directly
 */
export function useAcceptQuoteRequest() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: ({
                         quotationId,
                         products
                     }: {
            quotationId: string;
            products: { productId: string; quantity: number; targetPrice: number }[];
        }) => ordersApi.acceptQuoteRequest(quotationId, products),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.orders });
            toast({
                title: 'Quote Request Accepted! 🎉',
                description: 'Order has been confirmed at customer\'s requested price.',
            });
        },
        onError: (error: Error) => {
            toast({
                title: 'Failed to Accept Quote Request',
                description: error.message,
                variant: 'destructive',
            });
        },
    });
}

/**
 * Reject Quote Request - Admin rejects customer's initial request
 * Sets status to REJECTED
 */
export function useRejectQuoteRequest() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: ({
                         quotationId,
                         reason
                     }: {
            quotationId: string;
            reason?: string;
        }) => ordersApi.rejectQuoteRequest(quotationId, reason),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.orders });
            toast({
                title: 'Quote Request Rejected',
                description: 'The quote request has been declined.',
            });
        },
        onError: (error: Error) => {
            toast({
                title: 'Failed to Reject Quote Request',
                description: error.message,
                variant: 'destructive',
            });
        },
    });
}

// =============================================================================
// UPDATE ORDER STATUS MUTATION (For stage transitions)
// =============================================================================

export const useUpdateOrderStatus = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({
                         orderId,
                         newStatus,
                         note
                     }: {
            orderId: string;
            newStatus: string;
            note?: string;
        }) => ordersApi.updateOrderStatus(orderId, newStatus, note),

        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['orders'] });
        },
        onError: (error: any) => {
            console.error('Failed to update order status:', error);
        },
    });
};

// =============================================================================
// INVENTORY HOOKS
// =============================================================================

export function useInventory() {
    return useQuery({
        queryKey: queryKeys.inventory,
        queryFn: () => inventoryApi.list(),
    });
}

export function useCreateInventory() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: (data: CreateInventoryRequest) => inventoryApi.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.inventory });
            toast({
                title: 'Inventory Created',
                description: 'Inventory entry has been added',
            });
        },
        onError: (error: Error) => {
            toast({
                title: 'Failed to Create Inventory',
                description: error.message,
                variant: 'destructive',
            });
        },
    });
}

export function useUpdateStock() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: (data: UpdateStockRequest) => inventoryApi.updateStock(data),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.inventory });

            if (data.reorderAlert) {
                toast({
                    title: 'Stock Updated - Low Stock Alert!',
                    description: 'Stock is below reorder level',
                    variant: 'destructive',
                });
            } else {
                toast({
                    title: 'Stock Updated',
                    description: 'Inventory has been updated',
                });
            }
        },
        onError: (error: Error) => {
            toast({
                title: 'Failed to Update Stock',
                description: error.message,
                variant: 'destructive',
            });
        },
    });
}

// =============================================================================
// TEMPLATE HOOKS
// =============================================================================

export function useTemplates() {
    return useQuery({
        queryKey: queryKeys.templates,
        queryFn: () => templatesApi.list(),
    });
}

export function useCreateTemplate() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: (data: { name: string; description?: string; fields?: ApiTemplateField[] }) =>
            templatesApi.create(data),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.templates });
            toast({
                title: 'Template Created',
                description: `${data.name} has been created`,
            });
        },
        onError: (error: Error) => {
            toast({
                title: 'Failed to Create Template',
                description: error.message,
                variant: 'destructive',
            });
        },
    });
}

export function useDeleteTemplate() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: (id: string) => templatesApi.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.templates });
            toast({
                title: 'Template Deleted',
                description: 'Template has been removed',
            });
        },
        onError: (error: Error) => {
            toast({
                title: 'Failed to Delete Template',
                description: error.message,
                variant: 'destructive',
            });
        },
    });
}

// =============================================================================
// CUSTOMER HOOKS
// =============================================================================

export function useCustomers() {
    return useQuery({
        queryKey: queryKeys.customers,
        queryFn: () => customersApi.list(),
    });
}

export function useCreateCustomer() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: (data: Partial<ApiCustomer>) => customersApi.create(data),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.customers });
            toast({
                title: 'Customer Created',
                description: `${data.businessName} has been added`,
            });
        },
        onError: (error: Error) => {
            toast({
                title: 'Failed to Create Customer',
                description: error.message,
                variant: 'destructive',
            });
        },
    });
}

export function useUpdateCustomer() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<ApiCustomer> }) =>
            customersApi.update(id, data),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.customers });
            toast({
                title: 'Customer Updated',
                description: `${data.businessName} has been updated`,
            });
        },
        onError: (error: Error) => {
            toast({
                title: 'Failed to Update Customer',
                description: error.message,
                variant: 'destructive',
            });
        },
    });
}

// =============================================================================
// SUPPLIER HOOKS
// =============================================================================

export function useSuppliers() {
    return useQuery({
        queryKey: queryKeys.suppliers,
        queryFn: () => suppliersApi.list(),
    });
}

export function useCreateSupplier() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: (data: Partial<ApiSupplier>) => suppliersApi.create(data),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.suppliers });
            toast({
                title: 'Supplier Created',
                description: `${data.companyName} has been added`,
            });
        },
        onError: (error: Error) => {
            toast({
                title: 'Failed to Create Supplier',
                description: error.message,
                variant: 'destructive',
            });
        },
    });
}

export function useUpdateSupplier() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<ApiSupplier> }) =>
            suppliersApi.update(id, data),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.suppliers });
            toast({
                title: 'Supplier Updated',
                description: `${data.companyName} has been updated`,
            });
        },
        onError: (error: Error) => {
            toast({
                title: 'Failed to Update Supplier',
                description: error.message,
                variant: 'destructive',
            });
        },
    });
}

// =============================================================================
// UTILITY HOOK - Invalidate All Queries
// =============================================================================

export function useInvalidateAll() {
    const queryClient = useQueryClient();

    return {
        invalidateUsers: () => queryClient.invalidateQueries({ queryKey: queryKeys.users }),
        invalidateProducts: () => queryClient.invalidateQueries({ queryKey: queryKeys.products }),
        invalidateOrders: () => queryClient.invalidateQueries({ queryKey: queryKeys.orders }),
        invalidateInventory: () => queryClient.invalidateQueries({ queryKey: queryKeys.inventory }),
        invalidateTemplates: () => queryClient.invalidateQueries({ queryKey: queryKeys.templates }),
        invalidateCustomers: () => queryClient.invalidateQueries({ queryKey: queryKeys.customers }),
        invalidateSuppliers: () => queryClient.invalidateQueries({ queryKey: queryKeys.suppliers }),
        invalidateAll: () => queryClient.invalidateQueries(),
    };
}
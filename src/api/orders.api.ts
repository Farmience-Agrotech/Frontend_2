// =============================================================================
// ORDERS API SERVICE (With Quotation Support)
// =============================================================================
import apiClient from './client';
import { Order, CreateOrderRequest } from '@/types/api.types';

// =============================================================================
// BACKEND SCHEMA - ORDERS (What the EC2 API returns for /orders/list)
// =============================================================================

interface BackendOrderProduct {
    productId: string;
    quantity: number;
    price: number;
    _id?: string;
}

interface BackendOrder {
    _id: string;
    orderId: string;  // Human-readable like "ORD-2025-001"
    customerId?: string;
    products: BackendOrderProduct[];
    totalAmount: number;
    currency: string;
    status: string;
    shippingAddress?: {
        streetAddress?: string;
        city?: string;
        state?: string;
        pinCode?: string;
    };
    notes?: string;
    shippingCost?: number;
    discount?: number;
    createdAt: string;
    updatedAt: string;
    __v?: number;
}

// =============================================================================
// BACKEND SCHEMA - QUOTATIONS (What the EC2 API returns for /orders/quotation/list)
// =============================================================================

interface BackendQuotationProduct {
    productId: string;
    quantity: number;
    targetPrice: number;      // Customer's requested price
    quotedPrice?: number;     // Admin's quoted price
    _id?: string;
}

interface BackendQuotation {
    _id: string;
    quotationId?: string;     // Human-readable like "QUO-2025-001"
    customerId?: string;
    products: BackendQuotationProduct[];
    totalAmount?: number;
    quotedTotal?: number;
    status: string;
    shippingAddress?: {
        streetAddress?: string;
        city?: string;
        state?: string;
        pinCode?: string;
        label?: string;
        contactPerson?: string;
        contactPhone?: string;
    };
    notes?: string;
    createdAt: string;
    updatedAt: string;
    __v?: number;
}

// =============================================================================
// FRONTEND SCHEMA (Unified - What the UI components expect)
// =============================================================================

export interface ApiOrderItem {
    productId: string;
    name: string;
    quantity: number;
    price: number;
    targetPrice?: number;     // For quotations
    quotedPrice?: number;     // For quotations
    total: number;
}

export interface ApiOrderCustomer {
    id: string;
    name: string;
    company: string;
    email?: string;
    phone?: string;
}

export interface ApiOrder {
    _id: string;
    id: string;
    orderNumber: string;
    orderId: string;          // Human-readable ID
    customerId?: string;
    customer: ApiOrderCustomer;
    items: ApiOrderItem[];
    products: BackendOrderProduct[] | BackendQuotationProduct[];
    totalAmount: number;
    quotedTotal?: number;     // For quotations
    currency: string;
    status: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    shippingAddress?: any;
    notes?: string;
    shippingCost?: number;
    discount?: number;
    createdAt: string;
    updatedAt: string;

    // NEW: Quotation-specific fields
    isQuotation: boolean;     // true if from quotation endpoint
    sourceType: 'order' | 'quotation';
}

// =============================================================================
// STATUS MAPPING
// =============================================================================

/**
 * Backend only accepts these 4 statuses for quotations:
 * - PENDING: Customer requested quote, waiting for admin
 * - NEGOTIATING: Admin sent quote / Counter-offer in progress
 * - ACCEPTED: Customer accepted the quote
 * - REJECTED: Customer rejected the quote
 */

/**
 * Map various backend statuses to unified display status
 */
const mapStatus = (status: string, isQuotation: boolean): string => {
    // Quotation status mapping (backend uses 4 statuses)
    if (isQuotation) {
        const quotationStatusMap: Record<string, string> = {
            'PENDING': 'quote_requested',
            'NEGOTIATING': 'quote_sent',
            'ACCEPTED': 'order_booked',
            'REJECTED': 'rejected',
        };
        return quotationStatusMap[status] || 'quote_requested';
    }

    // Order status mapping
    const orderStatusMap: Record<string, string> = {
        'PENDING': 'payment_pending',
        'CONFIRMED': 'confirmed',
        'PAID': 'paid',
        'PROCESSING': 'processing',
        'SHIPPED': 'shipped',
        'DELIVERED': 'delivered',
        'CANCELLED': 'cancelled',
    };

    return orderStatusMap[status] || status.toLowerCase();
};

// =============================================================================
// TRANSFORMATION FUNCTIONS
// =============================================================================

/**
 * Transform backend order to frontend format
 */
function transformOrderToFrontend(backend: BackendOrder): ApiOrder {
    return {
        _id: backend._id,
        id: backend._id,
        orderNumber: backend.orderId,
        orderId: backend.orderId,
        customerId: backend.customerId,
        customer: {
            id: backend.customerId || '',
            name: backend.customerId ? 'Loading...' : 'Guest',
            company: '',
            email: '',
            phone: '',
        },
        items: backend.products.map(p => ({
            productId: p.productId,
            name: `Product ${p.productId.slice(-6)}`,
            quantity: p.quantity,
            price: p.price,
            total: p.quantity * p.price,
        })),
        products: backend.products,
        totalAmount: backend.totalAmount,
        currency: backend.currency || 'INR',
        status: mapStatus(backend.status, false),
        priority: 'medium',
        shippingAddress: backend.shippingAddress,
        notes: backend.notes,
        shippingCost: backend.shippingCost,
        discount: backend.discount,
        createdAt: backend.createdAt,
        updatedAt: backend.updatedAt,
        isQuotation: false,
        sourceType: 'order',
    };
}

/**
 * Transform backend quotation to frontend format (same ApiOrder interface)
 */
function transformQuotationToFrontend(backend: BackendQuotation): ApiOrder {
    // Calculate totals
    const targetTotal = backend.products.reduce((sum, p) => sum + (p.quantity * p.targetPrice), 0);
    const quotedTotal = backend.products.reduce((sum, p) => sum + (p.quantity * (p.quotedPrice || p.targetPrice)), 0);

    return {
        _id: backend._id,
        id: backend._id,
        orderNumber: backend.quotationId || `QUO-${backend._id.slice(-8).toUpperCase()}`,
        orderId: backend.quotationId || backend._id,
        customerId: backend.customerId,
        customer: {
            id: backend.customerId || '',
            name: backend.customerId ? 'Loading...' : 'Guest',
            company: '',
            email: '',
            phone: '',
        },
        items: backend.products.map(p => ({
            productId: p.productId,
            name: `Product ${p.productId.slice(-6)}`,
            quantity: p.quantity,
            price: p.quotedPrice || p.targetPrice,
            targetPrice: p.targetPrice,
            quotedPrice: p.quotedPrice,
            total: p.quantity * (p.quotedPrice || p.targetPrice),
        })),
        products: backend.products,
        totalAmount: backend.totalAmount || targetTotal,
        quotedTotal: quotedTotal !== targetTotal ? quotedTotal : undefined,
        currency: 'INR',
        status: mapStatus(backend.status, true),
        priority: 'medium',
        shippingAddress: backend.shippingAddress,
        notes: backend.notes,
        shippingCost: 0,
        discount: 0,
        createdAt: backend.createdAt,
        updatedAt: backend.updatedAt,
        isQuotation: true,
        sourceType: 'quotation',
    };
}

// =============================================================================
// API FUNCTIONS - ORDERS
// =============================================================================

/**
 * List orders from /orders/list
 */
export const listOrders = async (): Promise<ApiOrder[]> => {
    try {
        const response = await apiClient.get<BackendOrder[]>('/orders/list');

        let backendData: BackendOrder[] = [];

        if (Array.isArray(response.data)) {
            backendData = response.data;
        } else if (response.data && typeof response.data === 'object') {
            const data = response.data as any;
            if (Array.isArray(data.orders)) {
                backendData = data.orders;
            } else if (Array.isArray(data.data)) {
                backendData = data.data;
            }
        }

        return backendData.map(transformOrderToFrontend);
    } catch (error) {
        console.error('Error fetching orders:', error);
        return []; // Return empty array instead of throwing
    }
};

// =============================================================================
// API FUNCTIONS - QUOTATIONS
// =============================================================================

/**
 * List quotations from /orders/quotation/list
 */
export const listQuotations = async (): Promise<ApiOrder[]> => {
    try {
        const response = await apiClient.get<BackendQuotation[]>('/orders/quotation/list');

        let backendData: BackendQuotation[] = [];

        if (Array.isArray(response.data)) {
            backendData = response.data;
        } else if (response.data && typeof response.data === 'object') {
            const data = response.data as any;
            if (Array.isArray(data.quotations)) {
                backendData = data.quotations;
            } else if (Array.isArray(data.data)) {
                backendData = data.data;
            }
        }

        console.log('Fetched quotations:', backendData.length);
        return backendData.map(transformQuotationToFrontend);
    } catch (error) {
        console.error('Error fetching quotations:', error);
        return []; // Return empty array instead of throwing
    }
};

// =============================================================================
// MERGED LIST - ORDERS + QUOTATIONS
// =============================================================================

/**
 * List ALL orders and quotations merged together
 * Sorted by createdAt descending (newest first)
 */
export const listAllOrdersAndQuotations = async (): Promise<ApiOrder[]> => {
    try {
        // Fetch both in parallel
        const [orders, quotations] = await Promise.all([
            listOrders(),
            listQuotations(),
        ]);

        console.log(`Fetched ${orders.length} orders and ${quotations.length} quotations`);

        // Merge and sort by date (newest first)
        const merged = [...orders, ...quotations];
        merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        return merged;
    } catch (error) {
        console.error('Error fetching orders and quotations:', error);
        throw error;
    }
};

// =============================================================================
// CREATE ORDER
// =============================================================================

export const createOrder = async (data: CreateOrderRequest): Promise<ApiOrder> => {
    try {
        const response = await apiClient.post<BackendOrder>('/orders/create', data);
        return transformOrderToFrontend(response.data);
    } catch (error) {
        console.error('Error creating order:', error);
        throw error;
    }
};

// =============================================================================
// UPDATE ORDER
// =============================================================================

export const updateOrder = async (
    id: string,
    data: Partial<ApiOrder>,
    orderNumber?: string
): Promise<ApiOrder> => {
    try {
        const values: Record<string, any> = {};

        if (data.status !== undefined) values.status = data.status;
        if (data.notes !== undefined) values.notes = data.notes;
        if (data.shippingCost !== undefined) values.shippingCost = data.shippingCost;
        if (data.discount !== undefined) values.discount = data.discount;
        if (data.shippingAddress !== undefined) {
            values.shippingAddress = {
                streetAddress: data.shippingAddress.street || data.shippingAddress.streetAddress,
                city: data.shippingAddress.city,
                state: data.shippingAddress.state,
                pinCode: data.shippingAddress.pincode || data.shippingAddress.pinCode,
            };
        }
        if (data.products !== undefined) values.products = data.products;
        if (data.totalAmount !== undefined) values.totalAmount = data.totalAmount;

        const orderIdToUse = orderNumber || data.orderId || data.orderNumber || id;

        const payload = {
            orderId: orderIdToUse,
            values: values,
        };

        console.log('Updating order with payload:', payload);

        const response = await apiClient.patch<BackendOrder | { message: string; order: BackendOrder }>('/orders/update', payload);

        if (response.data) {
            const responseData = response.data as any;
            if (responseData.order) {
                return transformOrderToFrontend(responseData.order);
            }
            if (responseData._id && responseData.orderId) {
                return transformOrderToFrontend(responseData as BackendOrder);
            }
        }

        // Refetch to get updated data
        const allOrders = await listAllOrdersAndQuotations();
        const updatedOrder = allOrders.find(o => o._id === id || o.orderId === orderIdToUse);

        if (updatedOrder) return updatedOrder;

        throw new Error('Order updated but could not retrieve updated data');

    } catch (error: any) {
        console.error('Error updating order:', error);
        if (error.response?.status === 404) {
            throw new Error('Order not found. Please check the order ID.');
        }
        if (error.response?.status === 400) {
            throw new Error(error.response?.data?.message || 'Invalid order data');
        }
        throw error;
    }
};

// =============================================================================
// UPDATE QUOTATION
// =============================================================================

/**
 * Update quotation using PATCH /orders/quotation/update
 */
export const updateQuotation = async (
    quotationId: string,
    data: {
        status?: string;
        products?: BackendQuotationProduct[];
        quotedTotal?: number;
        notes?: string;
    }
): Promise<ApiOrder> => {
    try {
        const payload = {
            quotationId: quotationId,
            values: data,
        };

        console.log('Updating quotation with payload:', payload);

        // Use PATCH method as per backend API spec
        const response = await apiClient.patch<BackendQuotation | { message: string; quotation: BackendQuotation }>(
            '/orders/quotation/update',
            payload
        );

        if (response.data) {
            const responseData = response.data as any;
            if (responseData.quotation) {
                return transformQuotationToFrontend(responseData.quotation);
            }
            if (responseData._id) {
                return transformQuotationToFrontend(responseData as BackendQuotation);
            }
        }

        // Refetch to get updated data
        const quotations = await listQuotations();
        const updated = quotations.find(q => q._id === quotationId || q.orderId === quotationId);

        if (updated) return updated;

        throw new Error('Quotation updated but could not retrieve updated data');

    } catch (error: any) {
        console.error('Error updating quotation:', error);
        throw error;
    }
};

// =============================================================================
// SEND QUOTE (Admin action)
// =============================================================================

/**
 * Admin sends a quote to customer
 * Updates status to NEGOTIATING and sets quoted prices
 * Backend only accepts: PENDING, NEGOTIATING, ACCEPTED, REJECTED
 */
export const sendQuote = async (
    quotationId: string,
    quotedProducts: { productId: string; quantity: number; targetPrice: number; quotedPrice: number }[],
    notes?: string
): Promise<ApiOrder> => {
    try {
        const payload = {
            quotationId: quotationId,
            values: {
                status: 'NEGOTIATING',  // Backend enum: PENDING, NEGOTIATING, ACCEPTED, REJECTED
                products: quotedProducts,
            },
        };

        console.log('Sending quote with payload:', payload);

        // Use PATCH method as per backend API spec
        const response = await apiClient.patch<BackendQuotation | { message: string; quotation: BackendQuotation }>(
            '/orders/quotation/update',
            payload
        );

        if (response.data) {
            const responseData = response.data as any;
            if (responseData.quotation) {
                return transformQuotationToFrontend(responseData.quotation);
            }
            if (responseData._id) {
                return transformQuotationToFrontend(responseData as BackendQuotation);
            }
        }

        // Refetch to get updated data
        const quotations = await listQuotations();
        const updated = quotations.find(q => q._id === quotationId || q.orderId === quotationId);

        if (updated) return updated;

        throw new Error('Quote sent but could not retrieve updated data');

    } catch (error: any) {
        console.error('Error sending quote:', error);
        throw error;
    }
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get a single order or quotation by ID
 */
export const getOrder = async (id: string): Promise<ApiOrder> => {
    try {
        const allOrders = await listAllOrdersAndQuotations();
        const order = allOrders.find(o => o._id === id || o.orderId === id);
        if (!order) {
            throw new Error('Order not found');
        }
        return order;
    } catch (error) {
        console.error('Error fetching order:', error);
        throw error;
    }
};

/**
 * Delete order
 */
export const deleteOrder = async (id: string): Promise<void> => {
    try {
        await apiClient.delete(`/orders/delete/${id}`);
    } catch (error) {
        console.error('Error deleting order:', error);
        throw error;
    }
};

/**
 * Check if order is a quotation that needs admin action
 * Admin needs to respond when status is PENDING (quote_requested in UI)
 */
export const needsAdminAction = (order: ApiOrder): boolean => {
    return order.isQuotation && ['quote_requested'].includes(order.status);
};

/**
 * Check if customer needs to respond
 * Customer can respond when status is NEGOTIATING (quote_sent in UI)
 */
export const needsCustomerAction = (order: ApiOrder): boolean => {
    return order.isQuotation && order.status === 'quote_sent';
};

// =============================================================================
// EXPORT ALL
// =============================================================================

const ordersApi = {
    // List functions
    list: listAllOrdersAndQuotations,      // Default: merged list
    listOrders: listOrders,                 // Orders only
    listQuotations: listQuotations,         // Quotations only
    listAll: listAllOrdersAndQuotations,    // Explicit merged

    // CRUD
    create: createOrder,
    update: updateOrder,
    updateQuotation: updateQuotation,
    get: getOrder,
    delete: deleteOrder,

    // Quotation actions
    sendQuote: sendQuote,

    // Helpers
    needsAdminAction,
    needsCustomerAction,
};

export default ordersApi;
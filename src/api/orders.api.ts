// =============================================================================
// ORDERS API SERVICE (With Quotation Support - FIXED)
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

    // Quotation-specific fields
    isQuotation: boolean;     // true if from quotation endpoint
    sourceType: 'order' | 'quotation';
}

// =============================================================================
// STATUS MAPPING - FIXED!
// =============================================================================

/**
 * Backend Quotation Statuses:
 * - PENDING: Customer requested quote → ADMIN's turn
 * - QUOTE_SENT: Admin sent quote → CUSTOMER's turn
 * - NEGOTIATING: Customer counter-offered → ADMIN's turn
 * - ACCEPTED: Deal done (either party accepted)
 * - REJECTED: No deal (either party rejected)
 */

/**
 * Map backend statuses to frontend display status
 */
const mapStatus = (status: string, isQuotation: boolean): string => {
    // Quotation status mapping
    if (isQuotation) {
        const quotationStatusMap: Record<string, string> = {
            'PENDING': 'quote_requested',       // Admin needs to send quote
            'QUOTE_SENT': 'quote_sent',         // Customer needs to respond
            'NEGOTIATING': 'negotiation',       // Admin needs to respond to counter
            'ACCEPTED': 'order_booked',         // Deal done!
            'REJECTED': 'rejected',             // No deal
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
        return [];
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
        return [];
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
        const [orders, quotations] = await Promise.all([
            listOrders(),
            listQuotations(),
        ]);

        console.log(`Fetched ${orders.length} orders and ${quotations.length} quotations`);

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
// SEND QUOTE (Admin sends quote to customer)
// =============================================================================

/**
 * Admin sends a quote to customer
 * Changes status to QUOTE_SENT (customer's turn to respond)
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
                status: 'QUOTE_SENT',  // ✅ FIXED! Was 'NEGOTIATING' before
                products: quotedProducts,
                ...(notes && { notes }),
            },
        };

        console.log('Sending quote with payload:', payload);

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
// ACCEPT COUNTER-OFFER (Admin accepts customer's counter-offer)
// =============================================================================

/**
 * Admin accepts customer's counter-offer
 * Changes status to ACCEPTED (deal done!)
 * Uses customer's targetPrice as the final price
 */
export const acceptCounter = async (
    quotationId: string,
    acceptedProducts: { productId: string; quantity: number; targetPrice: number; quotedPrice: number }[]
): Promise<ApiOrder> => {
    try {
        // Set quotedPrice = targetPrice (accepting customer's price)
        const productsWithAcceptedPrice = acceptedProducts.map(p => ({
            ...p,
            quotedPrice: p.targetPrice,  // Accept customer's price
        }));

        const payload = {
            quotationId: quotationId,
            values: {
                status: 'ACCEPTED',
                products: productsWithAcceptedPrice,
            },
        };

        console.log('Accepting counter-offer with payload:', payload);

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

        const quotations = await listQuotations();
        const updated = quotations.find(q => q._id === quotationId || q.orderId === quotationId);

        if (updated) return updated;

        throw new Error('Counter-offer accepted but could not retrieve updated data');

    } catch (error: any) {
        console.error('Error accepting counter-offer:', error);
        throw error;
    }
};

// =============================================================================
// REJECT COUNTER-OFFER (Admin rejects customer's counter-offer)
// =============================================================================

/**
 * Admin rejects customer's counter-offer
 * Changes status to REJECTED (negotiation ended)
 */
export const rejectCounter = async (
    quotationId: string,
    reason?: string
): Promise<ApiOrder> => {
    try {
        const payload = {
            quotationId: quotationId,
            values: {
                status: 'REJECTED',
                ...(reason && { notes: reason }),
            },
        };

        console.log('Rejecting counter-offer with payload:', payload);

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

        const quotations = await listQuotations();
        const updated = quotations.find(q => q._id === quotationId || q.orderId === quotationId);

        if (updated) return updated;

        throw new Error('Counter-offer rejected but could not retrieve updated data');

    } catch (error: any) {
        console.error('Error rejecting counter-offer:', error);
        throw error;
    }
};

// =============================================================================
// ACCEPT INITIAL REQUEST (Admin accepts customer's initial target price)
// =============================================================================

/**
 * Admin accepts customer's initial quote request (their target price)
 * Changes status to ACCEPTED directly
 */
export const acceptQuoteRequest = async (
    quotationId: string,
    products: { productId: string; quantity: number; targetPrice: number }[]
): Promise<ApiOrder> => {
    try {
        // Set quotedPrice = targetPrice (accepting customer's price)
        const productsWithAcceptedPrice = products.map(p => ({
            ...p,
            quotedPrice: p.targetPrice,
        }));

        const payload = {
            quotationId: quotationId,
            values: {
                status: 'ACCEPTED',
                products: productsWithAcceptedPrice,
            },
        };

        console.log('Accepting quote request with payload:', payload);

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

        const quotations = await listQuotations();
        const updated = quotations.find(q => q._id === quotationId || q.orderId === quotationId);

        if (updated) return updated;

        throw new Error('Quote request accepted but could not retrieve updated data');

    } catch (error: any) {
        console.error('Error accepting quote request:', error);
        throw error;
    }
};

// =============================================================================
// REJECT INITIAL REQUEST (Admin rejects customer's quote request)
// =============================================================================

/**
 * Admin rejects customer's initial quote request
 * Changes status to REJECTED
 */
export const rejectQuoteRequest = async (
    quotationId: string,
    reason?: string
): Promise<ApiOrder> => {
    try {
        const payload = {
            quotationId: quotationId,
            values: {
                status: 'REJECTED',
                ...(reason && { notes: reason }),
            },
        };

        console.log('Rejecting quote request with payload:', payload);

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

        const quotations = await listQuotations();
        const updated = quotations.find(q => q._id === quotationId || q.orderId === quotationId);

        if (updated) return updated;

        throw new Error('Quote request rejected but could not retrieve updated data');

    } catch (error: any) {
        console.error('Error rejecting quote request:', error);
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
 * Check if admin needs to respond (quote_requested OR negotiation)
 */
export const needsAdminAction = (order: ApiOrder): boolean => {
    return order.isQuotation && ['quote_requested', 'negotiation'].includes(order.status);
};

/**
 * Check if customer needs to respond (quote_sent)
 */
export const needsCustomerAction = (order: ApiOrder): boolean => {
    return order.isQuotation && order.status === 'quote_sent';
};

/**
 * Check if quotation is in final state
 */
export const isQuotationFinal = (order: ApiOrder): boolean => {
    return ['order_booked', 'rejected', 'cancelled'].includes(order.status);
};

// =============================================================================
// UPDATE ORDER STATUS (For post-booking stage transitions)
// =============================================================================

/**
 * Update order status for stage transitions
 * Used for: order_booked → processing → shipped → delivered
 */
export const updateOrderStatus = async (
    orderId: string,
    newStatus: string,
    note?: string
): Promise<ApiOrder> => {
    try {
        // Map frontend status to backend status
        const statusMap: Record<string, string> = {
            'processing': 'PAID',           // Order model uses PAID instead of PROCESSING
            'shipped': 'SHIPPED',
            'delivered': 'DELIVERED',
            'completed': 'DELIVERED',       // Map to DELIVERED
        };

        const backendStatus = statusMap[newStatus] || newStatus.toUpperCase();

        const payload = {
            orderId: orderId,
            values: {
                status: backendStatus,
                ...(note && { notes: note }),
            },
        };

        console.log('Updating order status with payload:', payload);

        const response = await apiClient.patch<BackendOrder | { message: string; order: BackendOrder }>(
            '/orders/update',
            payload
        );

        if (response.data) {
            const responseData = response.data as any;
            if (responseData.order) {
                return transformOrderToFrontend(responseData.order);
            }
            if (responseData._id) {
                return transformOrderToFrontend(responseData as BackendOrder);
            }
        }

        // Fallback: refetch
        const allOrders = await listAllOrdersAndQuotations();
        const updated = allOrders.find(o => o._id === orderId || o.orderId === orderId);

        if (updated) return updated;

        throw new Error('Status updated but could not retrieve updated data');

    } catch (error: any) {
        console.error('Error updating order status:', error);
        throw error;
    }
};

// =============================================================================
// EXPORT ALL
// =============================================================================

const ordersApi = {
    // List functions
    list: listAllOrdersAndQuotations,
    listOrders: listOrders,
    listQuotations: listQuotations,
    listAll: listAllOrdersAndQuotations,

    // CRUD
    create: createOrder,
    update: updateOrder,
    updateQuotation: updateQuotation,
    get: getOrder,
    delete: deleteOrder,

    // Quotation actions - Admin
    sendQuote: sendQuote,
    acceptCounter: acceptCounter,
    rejectCounter: rejectCounter,
    acceptQuoteRequest: acceptQuoteRequest,
    rejectQuoteRequest: rejectQuoteRequest,
    updateOrderStatus: updateOrderStatus,

    // Helpers
    needsAdminAction,
    needsCustomerAction,
    isQuotationFinal,
};

export default ordersApi;
// -----------------------------------------------------------------------------
// USER / AUTH TYPES
// -----------------------------------------------------------------------------
export interface User {
    _id: string;
    userName: string;
    role: string;
}

export interface LoginRequest {
    userName: string;
    password: string;
}

export interface RegisterRequest {
    userName: string;
    password: string;
    role?: string;
}

export interface LoginResponse {
    token: string;
    role: string;
}

// -----------------------------------------------------------------------------
// PRODUCT TYPES
// -----------------------------------------------------------------------------
export interface Product {
    _id: string;
    name: string;
    description?: string;
    sku: string;
    price?: number;
    unit?: string;
    categories?: string[];
    minPrice?: number;
    maxPrice?: number;
    taxRate?: number;
    inventoryLocation?: string;
    stockQuantity?: number;
    minStockLevel?: number;
    minOrderLevel?: number;
    templateId?: string;
    templateValues?: Record<string, string>;
    additionalFields?: Array<{
        fieldName: string;
        fieldType: string;
        value: string;
    }>;
    currency?: string;
    isActive?: boolean;
    createdAt?: string;
    updatedAt?: string;
}

// ✅ UPDATED: Full CreateProductRequest matching backend requirements
export interface CreateProductRequest {
    name: string;
    description?: string;
    sku: string;
    unit: string;                    // Required: e.g., "pcs", "units", "kg"
    categories?: string[];           // Optional: e.g., ["Electronics", "Tools"]
    minPrice: number;                // Required: minimum price
    maxPrice: number;                // Required: maximum price
    taxRate: number;                 // Required: e.g., 0, 5, 12, 18, 28
    inventoryLocation: string;       // Required: e.g., "Warehouse A"
    stockQuantity: number;           // Required: initial stock
    minStockLevel: number;           // Required: reorder level
    minOrderLevel: number;           // Required: minimum order quantity (MOQ)
    templateId?: string;             // Optional: template reference
    templateValues?: Record<string, string>;  // Optional: template field values
    additionalFields?: Array<{       // Optional: custom fields
        fieldName: string;
        fieldType: string;
        value: string;
    }>;
}

// -----------------------------------------------------------------------------
// ORDER TYPES
// -----------------------------------------------------------------------------
export interface Order {
    _id: string;
    orderId: string;
    orderNumber?: string;
    products?: Array<{
        productId: string;
        quantity: number;
    }>;
    totalAmount: number;
    status: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface CreateOrderRequest {
    orderId?: string;
    products?: Array<{
        productId: string;
        quantity: number;
    }>;
    totalAmount?: number;
    status?: string;
}

// -----------------------------------------------------------------------------
// TEMPLATE TYPES
// -----------------------------------------------------------------------------
export interface TemplateField {
    id: string;
    name: string;
    type: string;
    required?: boolean;
    options?: string[];
}

export interface Template {
    _id: string;
    id: string;
    name: string;
    description: string;
    fields: TemplateField[];
    createdAt: Date;
}

export interface CreateTemplateRequest {
    name: string;
    description?: string;
    templateFields: {
        fieldName: string;
        fieldType: string;
        isRequired?: boolean;
        options?: string[];
    }[];
}

// -----------------------------------------------------------------------------
// INVENTORY TYPES
// -----------------------------------------------------------------------------
export interface Inventory {
    _id: string;
    product: string;
    stock: number;
    reserved: number;
    reorderLevel: number;
}

export interface CreateInventoryRequest {
    product: string;
    stock: number;
    reserved?: number;
    reorderLevel?: number;
}

export interface UpdateStockRequest {
    productId: string;
    quantity: number;
}

export interface UpdateStockResponse {
    inventory: Inventory;
    reorderAlert: boolean;
}
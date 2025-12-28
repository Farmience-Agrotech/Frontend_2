// =============================================================================
// SUPPLIERS API SERVICE
// =============================================================================
import apiClient from './client';

export interface ApiSupplier {
    _id: string;
    id: string;
    companyName: string;
    gstNumber: string;
    panNumber: string;
    contactPerson: string;
    phone: string;
    email: string;
    address: {
        street: string;
        city: string;
        state: string;
        pinCode: string;
    };
    productCategories: string[];
    paymentTerms: string;
    bankDetails: {
        accountName: string;
        accountNumber: string;
        ifscCode: string;
        bankName: string;
    };
    documents: Array<any>;
    status: string;
    registrationDate: string;
    notes?: string;
    blacklistReason?: string;
    activities: Array<any>;
    orders: Array<any>;
}

// -----------------------------------------------------------------------------
// LIST SUPPLIERS
// -----------------------------------------------------------------------------
export const listSuppliers = async (): Promise<ApiSupplier[]> => {
    const response = await apiClient.get<ApiSupplier[]>('/suppliers/list');
    return response.data;
};

// -----------------------------------------------------------------------------
// CREATE SUPPLIER
// -----------------------------------------------------------------------------
export const createSupplier = async (data: Partial<ApiSupplier>): Promise<ApiSupplier> => {
    const response = await apiClient.post<ApiSupplier>('/suppliers/create', data);
    return response.data;
};

// -----------------------------------------------------------------------------
// UPDATE SUPPLIER
// -----------------------------------------------------------------------------
export const updateSupplier = async (id: string, data: Partial<ApiSupplier>): Promise<ApiSupplier> => {
    const response = await apiClient.put<ApiSupplier>(`/suppliers/update/${id}`, data);
    return response.data;
};

// -----------------------------------------------------------------------------
// EXPORT ALL
// -----------------------------------------------------------------------------
export const suppliersApi = {
    list: listSuppliers,
    create: createSupplier,
    update: updateSupplier,
};

export default suppliersApi;
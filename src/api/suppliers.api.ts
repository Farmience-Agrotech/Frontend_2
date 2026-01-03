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
    const response = await apiClient.get<ApiSupplier[]>('/users/supplier/list');
    return response.data;
};

// -----------------------------------------------------------------------------
// CREATE SUPPLIER
// -----------------------------------------------------------------------------
export const createSupplier = async (data: Partial<ApiSupplier>): Promise<ApiSupplier> => {
    const response = await apiClient.post<ApiSupplier>('/users/supplier/create', data);
    return response.data;
};

// -----------------------------------------------------------------------------
// UPDATE SUPPLIER
// -----------------------------------------------------------------------------
export const updateSupplier = async (id: string, data: Partial<ApiSupplier>): Promise<ApiSupplier> => {
    const response = await apiClient.patch<ApiSupplier>('/users/supplier/edit', {
        supplierId: id,
        values: data
    });
    return response.data;
};

// -----------------------------------------------------------------------------
// DELETE SUPPLIER
// -----------------------------------------------------------------------------
export const deleteSupplier = async (id: string): Promise<void> => {
    await apiClient.delete(`/users/supplier/delete/${id}`);
};

// -----------------------------------------------------------------------------
// EXPORT ALL
// -----------------------------------------------------------------------------
export const suppliersApi = {
    list: listSuppliers,
    create: createSupplier,
    update: updateSupplier,
    delete: deleteSupplier,
};

export default suppliersApi;
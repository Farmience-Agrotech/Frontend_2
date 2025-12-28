// =============================================================================
// CUSTOMERS API SERVICE
// =============================================================================
// Backend routes: GET /users/customer/list, POST /users/customer/create

import apiClient from './client';

// =============================================================================
// BACKEND SCHEMA (What the EC2 API actually returns)
// =============================================================================

interface BackendAddress {
    _id?: string;
    streetAddress?: string;
    city?: string;
    state?: string;
    pinCode?: string;
    isDefault?: boolean;
    contactPerson?: string;
    contactPhone?: string;
    label?: string;
}

interface BackendContactDetails {
    _id?: string;
    phoneNumber?: string;
    email?: string;
    website?: string;
}

interface BackendCompanyInfo {
    _id?: string;
    companyName?: string;
    gstNumber?: string;
    panNumber?: string;
    billingAddress?: BackendAddress;
    shippingAddress?: BackendAddress[];
    contactDetails?: BackendContactDetails;
}

interface BackendBankDetails {
    _id?: string;
    accountHolderName?: string;
    accountNumber?: string;
    ifscCode?: string;
    bankName?: string;
    upiId?: string;
}

interface BackendCustomer {
    _id: string;
    fullName: string;
    email: string;
    phoneNumber: string;
    designation?: string;
    companyInfo?: BackendCompanyInfo;
    bankDetails?: BackendBankDetails;
    blocked?: boolean;
    creditLimit?: number;
    createdAt?: string;
    updatedAt?: string;
    __v?: number;
}

// =============================================================================
// FRONTEND SCHEMA (What the UI components expect)
// =============================================================================

export interface ApiBankDetails {
    _id?: string;
    accountHolderName: string;
    accountNumber: string;
    ifscCode: string;
    bankName: string;
    upiId?: string;
}

export interface ApiCompanyContactDetails {
    _id?: string;
    phoneNumber: string;
    email: string;
    website?: string;
}

export interface ApiAddress {
    _id?: string;
    label: string;
    street: string;
    streetAddress?: string;
    city: string;
    state: string;
    pinCode: string;
    contactPerson?: string;
    contactPhone?: string;
    isDefault?: boolean;
}

export interface ApiCustomer {
    _id: string;
    id: string;
    businessName: string;
    businessType: string;
    gstNumber: string;
    panNumber: string;
    establishedYear?: number;
    contactPerson: string;
    designation?: string;
    primaryPhone: string;
    secondaryPhone?: string;
    email: string;
    website?: string;
    billingAddress: ApiAddress;
    deliveryAddresses: ApiAddress[];
    bankDetails?: ApiBankDetails;
    companyContactDetails?: ApiCompanyContactDetails;
    creditLimit: number;
    paymentTerms: string;
    preferredPaymentMethod: string;
    documents: Array<any>;
    totalOrders: number;
    totalBusinessValue: number;
    outstandingAmount: number;
    lastOrderDate?: string;
    status: string;
    blocked?: boolean;
    blockedReason?: string;
    notes?: string;
    registeredAt: string;
    orders: Array<any>;
    activities: Array<any>;
}

// =============================================================================
// TRANSFORMATION FUNCTIONS
// =============================================================================

function transformBackendToFrontend(backend: BackendCustomer): ApiCustomer {
    const billingAddr = backend.companyInfo?.billingAddress;
    const shippingAddrs = backend.companyInfo?.shippingAddress || [];
    const contactDetails = backend.companyInfo?.contactDetails;
    const bankDetails = backend.bankDetails;

    return {
        _id: backend._id,
        id: backend._id,
        businessName: backend.companyInfo?.companyName || backend.fullName || 'Unknown',
        businessType: 'other',
        gstNumber: backend.companyInfo?.gstNumber || '',
        panNumber: backend.companyInfo?.panNumber || '',
        establishedYear: undefined,
        contactPerson: backend.fullName || '',
        designation: backend.designation || '',
        primaryPhone: backend.phoneNumber || '',
        secondaryPhone: contactDetails?.phoneNumber || '',
        email: backend.email || '',
        website: contactDetails?.website || '',

        billingAddress: {
            _id: billingAddr?._id,
            label: 'Billing Address',
            street: billingAddr?.streetAddress || '',
            streetAddress: billingAddr?.streetAddress || '',
            city: billingAddr?.city || '',
            state: billingAddr?.state || '',
            pinCode: billingAddr?.pinCode || '',
            isDefault: billingAddr?.isDefault,
        },

        deliveryAddresses: Array.isArray(shippingAddrs)
            ? shippingAddrs.map((addr, index) => ({
                _id: addr._id,
                label: addr.label || `Shipping Address ${index + 1}`,
                street: addr.streetAddress || '',
                streetAddress: addr.streetAddress || '',
                city: addr.city || '',
                state: addr.state || '',
                pinCode: addr.pinCode || '',
                contactPerson: addr.contactPerson,
                contactPhone: addr.contactPhone,
                isDefault: addr.isDefault,
            }))
            : [],

        bankDetails: bankDetails ? {
            _id: bankDetails._id,
            accountHolderName: bankDetails.accountHolderName || '',
            accountNumber: bankDetails.accountNumber || '',
            ifscCode: bankDetails.ifscCode || '',
            bankName: bankDetails.bankName || '',
            upiId: bankDetails.upiId || '',
        } : undefined,

        companyContactDetails: contactDetails ? {
            _id: contactDetails._id,
            phoneNumber: contactDetails.phoneNumber || '',
            email: contactDetails.email || '',
            website: contactDetails.website || '',
        } : undefined,

        creditLimit: backend.creditLimit || 0,
        paymentTerms: 'net_30',
        preferredPaymentMethod: 'bank_transfer',
        documents: [],
        totalOrders: 0,
        totalBusinessValue: 0,
        outstandingAmount: 0,
        lastOrderDate: undefined,
        status: backend.blocked ? 'blocked' : 'active',
        blocked: backend.blocked,
        blockedReason: undefined,
        notes: '',
        registeredAt: backend.createdAt || new Date().toISOString(),
        orders: [],
        activities: [],
    };
}

function transformFrontendToBackend(frontend: Partial<ApiCustomer>): any {
    const payload: any = {
        fullName: frontend.contactPerson || '',
        email: frontend.email || '',
        phoneNumber: frontend.primaryPhone || '',
        designation: frontend.designation || '',
        companyInfo: {
            companyName: frontend.businessName || '',
            gstNumber: frontend.gstNumber || '',
            panNumber: frontend.panNumber || '',
            billingAddress: {
                streetAddress: frontend.billingAddress?.street || frontend.billingAddress?.streetAddress || '',
                city: frontend.billingAddress?.city || '',
                state: frontend.billingAddress?.state || '',
                pinCode: frontend.billingAddress?.pinCode || '',
            },
            shippingAddress: frontend.deliveryAddresses?.map(addr => ({
                streetAddress: addr.street || addr.streetAddress || '',
                city: addr.city || '',
                state: addr.state || '',
                pinCode: addr.pinCode || '',
                contactPerson: addr.contactPerson || '',
                contactPhone: addr.contactPhone || '',
                isDefault: addr.isDefault || false,
                label: addr.label || '',
            })) || [],
            contactDetails: {
                phoneNumber: frontend.secondaryPhone || frontend.companyContactDetails?.phoneNumber || '',
                email: frontend.companyContactDetails?.email || frontend.email || '',
                website: frontend.website || frontend.companyContactDetails?.website || '',
            },
        },
    };

    if (frontend.bankDetails) {
        payload.bankDetails = {
            accountHolderName: frontend.bankDetails.accountHolderName || '',
            accountNumber: frontend.bankDetails.accountNumber || '',
            ifscCode: frontend.bankDetails.ifscCode || '',
            bankName: frontend.bankDetails.bankName || '',
            upiId: frontend.bankDetails.upiId || '',
        };
    }

    // Add creditLimit at root level (backend expects this)
    if (frontend.creditLimit !== undefined) {
        payload.creditLimit = frontend.creditLimit;
    }

    // Add blocked status
    if (frontend.blocked !== undefined) {
        payload.blocked = frontend.blocked;
    } else if (frontend.status !== undefined) {
        payload.blocked = frontend.status === 'blocked';
    }

    return payload;
}

// =============================================================================
// API FUNCTIONS
// =============================================================================

export const listCustomers = async (): Promise<ApiCustomer[]> => {
    try {
        const response = await apiClient.get<BackendCustomer[]>('/users/customer/list');

        let backendData: BackendCustomer[] = [];

        if (Array.isArray(response.data)) {
            backendData = response.data;
        } else if (response.data && typeof response.data === 'object') {
            const data = response.data as any;
            if (Array.isArray(data.customers)) {
                backendData = data.customers;
            } else if (Array.isArray(data.data)) {
                backendData = data.data;
            }
        }

        return backendData.map(transformBackendToFrontend);
    } catch (error) {
        console.error('Error fetching customers:', error);
        throw error;
    }
};

export const createCustomer = async (data: Partial<ApiCustomer>): Promise<ApiCustomer> => {
    try {
        const backendPayload = transformFrontendToBackend(data);
        const response = await apiClient.post<BackendCustomer>('/users/customer/create', backendPayload);
        return transformBackendToFrontend(response.data);
    } catch (error) {
        console.error('Error creating customer:', error);
        throw error;
    }
};

export const updateCustomer = async (id: string, data: Partial<ApiCustomer>): Promise<ApiCustomer> => {
    try {
        // Build the values object with dot notation for nested fields (as backend expects)
        const values: Record<string, any> = {};

        // Map frontend fields to backend format with dot notation
        if (data.contactPerson !== undefined) values['fullName'] = data.contactPerson;
        if (data.email !== undefined) values['email'] = data.email;
        if (data.primaryPhone !== undefined) values['phoneNumber'] = data.primaryPhone;
        if (data.designation !== undefined) values['designation'] = data.designation;
        if (data.creditLimit !== undefined) values['creditLimit'] = data.creditLimit;
        if (data.blocked !== undefined) values['blocked'] = data.blocked;
        if (data.status !== undefined) values['blocked'] = data.status === 'blocked';

        // Company info fields (using dot notation)
        if (data.businessName !== undefined) values['companyInfo.companyName'] = data.businessName;
        if (data.gstNumber !== undefined) values['companyInfo.gstNumber'] = data.gstNumber;
        if (data.panNumber !== undefined) values['companyInfo.panNumber'] = data.panNumber;
        if (data.website !== undefined) values['companyInfo.contactDetails.website'] = data.website;
        if (data.secondaryPhone !== undefined) values['companyInfo.contactDetails.phoneNumber'] = data.secondaryPhone;

        // Billing address
        if (data.billingAddress) {
            if (data.billingAddress.street || data.billingAddress.streetAddress) {
                values['companyInfo.billingAddress.streetAddress'] = data.billingAddress.street || data.billingAddress.streetAddress;
            }
            if (data.billingAddress.city) values['companyInfo.billingAddress.city'] = data.billingAddress.city;
            if (data.billingAddress.state) values['companyInfo.billingAddress.state'] = data.billingAddress.state;
            if (data.billingAddress.pinCode) values['companyInfo.billingAddress.pinCode'] = data.billingAddress.pinCode;
        }

        // Bank details
        if (data.bankDetails) {
            if (data.bankDetails.accountHolderName) values['bankDetails.accountHolderName'] = data.bankDetails.accountHolderName;
            if (data.bankDetails.accountNumber) values['bankDetails.accountNumber'] = data.bankDetails.accountNumber;
            if (data.bankDetails.ifscCode) values['bankDetails.ifscCode'] = data.bankDetails.ifscCode;
            if (data.bankDetails.bankName) values['bankDetails.bankName'] = data.bankDetails.bankName;
            if (data.bankDetails.upiId) values['bankDetails.upiId'] = data.bankDetails.upiId;
        }

        // Use the correct endpoint format: /users/customer/edit with customerId and values
        const response = await apiClient.patch<BackendCustomer>('/users/customer/edit', {
            customerId: id,
            values: values
        });
        return transformBackendToFrontend(response.data);
    } catch (error) {
        console.error('Error updating customer:', error);
        throw error;
    }
};

export const deleteCustomer = async (id: string): Promise<void> => {
    try {
        await apiClient.delete(`/users/customer/delete/${id}`);
    } catch (error) {
        console.error('Error deleting customer:', error);
        throw error;
    }
};

export const customersApi = {
    list: listCustomers,
    create: createCustomer,
    update: updateCustomer,
    delete: deleteCustomer,
};

export default customersApi;
// =============================================================================
// TEMPLATES API SERVICE
// =============================================================================

import apiClient from './client';

// =============================================================================
// BACKEND SCHEMA (What the EC2 API returns)
// =============================================================================

interface BackendTemplateField {
    _id?: string;
    fieldName: string;
    fieldType: string;
    isRequired?: boolean;
    options?: string[];
}

interface BackendTemplate {
    _id: string;
    name: string;
    description?: string;
    templateFields: BackendTemplateField[];
    createdAt?: string;
    updatedAt?: string;
}

// =============================================================================
// FRONTEND SCHEMA (What the UI components expect)
// =============================================================================

export interface ApiTemplateField {
    id: string;
    name: string;
    type: string;
    required?: boolean;
    options?: string[];
}

export interface ApiTemplate {
    id: string;
    _id: string;
    name: string;
    description: string;
    fields: ApiTemplateField[];
    createdAt: Date;
}

// =============================================================================
// CREATE REQUEST SCHEMA
// =============================================================================

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

// =============================================================================
// TRANSFORMATION FUNCTIONS
// =============================================================================

/**
 * Transform backend template to frontend format
 */
function transformBackendToFrontend(backend: BackendTemplate): ApiTemplate {
    return {
        id: backend._id,
        _id: backend._id,
        name: backend.name,
        description: backend.description || '',
        fields: backend.templateFields.map((field, index) => ({
            id: field._id || `field-${index}`,
            name: field.fieldName,
            type: field.fieldType,
            required: field.isRequired,
            options: field.options,
        })),
        createdAt: new Date(backend.createdAt || Date.now()),
    };
}

/**
 * Transform frontend template fields to backend format for creation
 */
function transformFieldsToBackend(fields: ApiTemplateField[] | undefined): BackendTemplateField[] {
    if (!fields || !Array.isArray(fields)) {
        return [];
    }
    return fields.map(field => ({
        fieldName: field.name,
        fieldType: field.type,
        isRequired: field.required,
        options: field.options,
    }));
}

// =============================================================================
// API FUNCTIONS
// =============================================================================

// -----------------------------------------------------------------------------
// LIST TEMPLATES
// -----------------------------------------------------------------------------
export const listTemplates = async (): Promise<ApiTemplate[]> => {
    try {
        const response = await apiClient.get<BackendTemplate[]>('/products/templates/list');

        let backendData: BackendTemplate[] = [];

        if (Array.isArray(response.data)) {
            backendData = response.data;
        } else if (response.data && typeof response.data === 'object') {
            const data = response.data as any;
            if (Array.isArray(data.templates)) {
                backendData = data.templates;
            } else if (Array.isArray(data.data)) {
                backendData = data.data;
            }
        }

        return backendData.map(transformBackendToFrontend);
    } catch (error) {
        console.error('Error fetching templates:', error);
        throw error;
    }
};

// -----------------------------------------------------------------------------
// CREATE TEMPLATE
// -----------------------------------------------------------------------------
export const createTemplate = async (data: {
    name: string;
    description?: string;
    fields?: ApiTemplateField[];
}): Promise<ApiTemplate> => {
    try {
        const payload: CreateTemplateRequest = {
            name: data.name,
            description: data.description,
            templateFields: transformFieldsToBackend(data.fields || []),
        };

        const response = await apiClient.post<BackendTemplate>('/products/templates/create', payload);
        return transformBackendToFrontend(response.data);
    } catch (error) {
        console.error('Error creating template:', error);
        throw error;
    }
};

// -----------------------------------------------------------------------------
// DELETE TEMPLATE
// -----------------------------------------------------------------------------
export const deleteTemplate = async (id: string): Promise<void> => {
    try {
        await apiClient.delete(`/products/templates/delete/${id}`);
    } catch (error) {
        console.error('Error deleting template:', error);
        throw error;
    }
};

// -----------------------------------------------------------------------------
// EXPORT ALL
// -----------------------------------------------------------------------------
const templatesApi = {
    list: listTemplates,
    create: createTemplate,
    delete: deleteTemplate,
};

export default templatesApi;
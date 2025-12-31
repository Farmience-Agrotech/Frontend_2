// =============================================================================
// PRODUCTS API SERVICE
// =============================================================================

import apiClient from './client';
import { Product, CreateProductRequest } from '@/types/api.types';

// -----------------------------------------------------------------------------
// LIST PRODUCTS
// -----------------------------------------------------------------------------

export const listProducts = async (): Promise<Product[]> => {
    const response = await apiClient.get<Product[]>('/products/list');
    return response.data;
};

// -----------------------------------------------------------------------------
// CREATE PRODUCT
// -----------------------------------------------------------------------------

export const createProduct = async (data: CreateProductRequest): Promise<Product> => {
    const response = await apiClient.post<Product>('/products/create', data);
    return response.data;
};

// -----------------------------------------------------------------------------
// DELETE PRODUCT
// -----------------------------------------------------------------------------

export const deleteProduct = async (id: string): Promise<void> => {
    await apiClient.delete(`/products/delete/${id}`);
};

// -----------------------------------------------------------------------------
// DELETE MULTIPLE PRODUCTS
// -----------------------------------------------------------------------------

export const deleteMultipleProducts = async (ids: string[]): Promise<void> => {
    await Promise.all(ids.map(id => apiClient.delete(`/products/delete/${id}`)));
};

// -----------------------------------------------------------------------------
// EXPORT ALL
// -----------------------------------------------------------------------------

const productsApi = {
    list: listProducts,
    create: createProduct,
    delete: deleteProduct,
    deleteBulk: deleteMultipleProducts,
};

export default productsApi;
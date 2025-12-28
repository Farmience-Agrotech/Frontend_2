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
// EXPORT ALL
// -----------------------------------------------------------------------------

const productsApi = {
    list: listProducts,
    create: createProduct,
};

export default productsApi;
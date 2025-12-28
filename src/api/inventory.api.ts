// =============================================================================
// INVENTORY API SERVICE
// =============================================================================

import apiClient from './client';
import {
    Inventory,
    CreateInventoryRequest,
    UpdateStockRequest,
    UpdateStockResponse,
} from '@/types/api.types';

// -----------------------------------------------------------------------------
// LIST INVENTORY
// -----------------------------------------------------------------------------

export const listInventory = async (): Promise<Inventory[]> => {
    const response = await apiClient.get<Inventory[]>('/inventory/list');
    return response.data;
};

// -----------------------------------------------------------------------------
// CREATE INVENTORY
// -----------------------------------------------------------------------------

export const createInventory = async (data: CreateInventoryRequest): Promise<Inventory> => {
    const response = await apiClient.post<Inventory>('/inventory/create', data);
    return response.data;
};

// -----------------------------------------------------------------------------
// UPDATE STOCK
// -----------------------------------------------------------------------------

export const updateStock = async (data: UpdateStockRequest): Promise<UpdateStockResponse> => {
    const response = await apiClient.put<UpdateStockResponse>('/inventory/update', data);
    return response.data;
};

// -----------------------------------------------------------------------------
// EXPORT ALL
// -----------------------------------------------------------------------------

const inventoryApi = {
    list: listInventory,
    create: createInventory,
    updateStock: updateStock,
};

export default inventoryApi;
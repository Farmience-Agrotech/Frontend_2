// =============================================================================
// USE PRODUCTION TEMPLATE HOOK
// Single template storage + per-order production data using localStorage
// =============================================================================

import { useState, useEffect, useCallback } from 'react';
import { ProductionTemplate, ProductionStageWithValues, getDefaultTemplate } from '@/types/production';

const TEMPLATE_STORAGE_KEY = 'production-template';
const ORDER_DATA_STORAGE_KEY = 'production-order-data';

interface OrderProductionData {
    orderId: string;
    stages: ProductionStageWithValues[];
    selectedSupplierIds: string[];
    updatedAt: string;
}

interface UseProductionTemplateReturn {
    template: ProductionTemplate;
    isLoading: boolean;
    saveTemplate: (template: ProductionTemplate) => void;
    resetTemplate: () => void;
    // Order-specific data
    getOrderProductionData: (orderId: string) => OrderProductionData | null;
    saveOrderProductionData: (orderId: string, stages: ProductionStageWithValues[], supplierIds: string[]) => void;
    clearOrderProductionData: (orderId: string) => void;
}

/**
 * Hook for managing single production template and per-order production data
 */
export const useProductionTemplate = (): UseProductionTemplateReturn => {
    const [template, setTemplate] = useState<ProductionTemplate>(getDefaultTemplate());
    const [isLoading, setIsLoading] = useState(true);

    // Load template from localStorage on mount
    useEffect(() => {
        try {
            const stored = localStorage.getItem(TEMPLATE_STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored) as ProductionTemplate;
                setTemplate(parsed);
            } else {
                // No stored template, use default and save it
                const defaultTemplate = getDefaultTemplate();
                localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(defaultTemplate));
                setTemplate(defaultTemplate);
            }
        } catch (error) {
            console.error('Failed to load template from localStorage:', error);
            // Fallback to default template
            const defaultTemplate = getDefaultTemplate();
            setTemplate(defaultTemplate);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Save template to localStorage
    const saveTemplate = useCallback((newTemplate: ProductionTemplate) => {
        try {
            const updatedTemplate = {
                ...newTemplate,
                updatedAt: new Date().toISOString(),
            };
            localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(updatedTemplate));
            setTemplate(updatedTemplate);
        } catch (error) {
            console.error('Failed to save template to localStorage:', error);
            throw error;
        }
    }, []);

    // Reset template to default
    const resetTemplate = useCallback(() => {
        try {
            const defaultTemplate = getDefaultTemplate();
            localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(defaultTemplate));
            setTemplate(defaultTemplate);
        } catch (error) {
            console.error('Failed to reset template:', error);
            throw error;
        }
    }, []);

    // ---------------------------------------------------------------------------
    // ORDER-SPECIFIC PRODUCTION DATA
    // ---------------------------------------------------------------------------

    // Get all order production data from localStorage
    const getAllOrderData = (): Record<string, OrderProductionData> => {
        try {
            const stored = localStorage.getItem(ORDER_DATA_STORAGE_KEY);
            return stored ? JSON.parse(stored) : {};
        } catch {
            return {};
        }
    };

    // Get production data for a specific order
    const getOrderProductionData = useCallback((orderId: string): OrderProductionData | null => {
        const allData = getAllOrderData();
        return allData[orderId] || null;
    }, []);

    // Save production data for a specific order
    const saveOrderProductionData = useCallback(
        (orderId: string, stages: ProductionStageWithValues[], supplierIds: string[]) => {
            try {
                const allData = getAllOrderData();
                allData[orderId] = {
                    orderId,
                    stages,
                    selectedSupplierIds: supplierIds,
                    updatedAt: new Date().toISOString(),
                };
                localStorage.setItem(ORDER_DATA_STORAGE_KEY, JSON.stringify(allData));
            } catch (error) {
                console.error('Failed to save order production data:', error);
            }
        },
        []
    );

    // Clear production data for a specific order
    const clearOrderProductionData = useCallback((orderId: string) => {
        try {
            const allData = getAllOrderData();
            delete allData[orderId];
            localStorage.setItem(ORDER_DATA_STORAGE_KEY, JSON.stringify(allData));
        } catch (error) {
            console.error('Failed to clear order production data:', error);
        }
    }, []);

    return {
        template,
        isLoading,
        saveTemplate,
        resetTemplate,
        getOrderProductionData,
        saveOrderProductionData,
        clearOrderProductionData,
    };
};

export default useProductionTemplate;
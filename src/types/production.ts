// =============================================================================
// PRODUCTION TYPES - Workflow Stages & Configuration
// =============================================================================

/**
 * Available production stages in the manufacturing workflow
 */
export type ProductionStageKey =
    | 'measurement'
    | 'cutting'
    | 'inspection_cutting'
    | 'stitching'
    | 'inspection_stitching'
    | 'accessories'
    | 'packing'
    | 'shipping';

/**
 * Individual production stage configuration
 */
export interface ProductionStage {
    key: ProductionStageKey;
    label: string;
    description: string;
    isCompleted: boolean;
    completedAt?: string;
    completedBy?: string;
    notes?: string;
    order: number;
}

/**
 * Default production stages with labels and descriptions
 */
export const DEFAULT_PRODUCTION_STAGES: Omit<ProductionStage, 'isCompleted'>[] = [
    {
        key: 'measurement',
        label: 'Measurement',
        description: 'Take measurements and prepare specifications',
        order: 1,
    },
    {
        key: 'cutting',
        label: 'Cutting',
        description: 'Cut raw materials according to measurements',
        order: 2,
    },
    {
        key: 'inspection_cutting',
        label: 'Inspection (Cutting)',
        description: 'Quality check after cutting process',
        order: 3,
    },
    {
        key: 'stitching',
        label: 'Stitching',
        description: 'Stitch and assemble the product',
        order: 4,
    },
    {
        key: 'inspection_stitching',
        label: 'Inspection (Stitching)',
        description: 'Quality check after stitching process',
        order: 5,
    },
    {
        key: 'accessories',
        label: 'Accessories',
        description: 'Add buttons, zippers, and other accessories',
        order: 6,
    },
    {
        key: 'packing',
        label: 'Packing',
        description: 'Pack the finished product',
        order: 7,
    },
    {
        key: 'shipping',
        label: 'Shipping',
        description: 'Prepare for shipment and dispatch',
        order: 8,
    },
];

// =============================================================================
// SUPPLIER SELECTION TYPES
// =============================================================================

/**
 * Supplier selected for sourcing raw materials
 */
export interface SelectedSupplier {
    supplierId: string;
    companyName: string;
    contactPerson: string;
    phone: string;
    email: string;
    productCategories: string[];
    selectedForCategories: string[];  // Which categories this supplier is selected for
    notes?: string;
}

/**
 * Raw material sourcing configuration
 */
export interface SourcingConfig {
    suppliers: SelectedSupplier[];
    totalSuppliers: number;
    sourcingNotes?: string;
}

// =============================================================================
// PRODUCTION CONFIGURATION - Main Interface
// =============================================================================

/**
 * Complete production configuration for an order
 */
export interface ProductionConfig {
    orderId: string;
    orderNumber: string;
    stages: ProductionStage[];
    sourcing: SourcingConfig;
    status: ProductionStatus;
    createdAt: string;
    updatedAt: string;
    createdBy?: string;
    notes?: string;
}

/**
 * Production workflow status
 */
export type ProductionStatus =
    | 'draft'           // Configuration in progress
    | 'confirmed'       // Configuration confirmed, ready to start
    | 'in_progress'     // Production started
    | 'completed'       // All stages completed
    | 'on_hold';        // Production paused

/**
 * Production status display configuration
 */
export const PRODUCTION_STATUS_CONFIG: Record<ProductionStatus, { label: string; color: string; bgColor: string }> = {
    draft: { label: 'Draft', color: 'text-gray-700', bgColor: 'bg-gray-100' },
    confirmed: { label: 'Confirmed', color: 'text-blue-700', bgColor: 'bg-blue-100' },
    in_progress: { label: 'In Progress', color: 'text-amber-700', bgColor: 'bg-amber-100' },
    completed: { label: 'Completed', color: 'text-green-700', bgColor: 'bg-green-100' },
    on_hold: { label: 'On Hold', color: 'text-red-700', bgColor: 'bg-red-100' },
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Initialize production stages with default values
 * All stages enabled by default, none completed
 */
export const initializeProductionStages = (): ProductionStage[] => {
    return DEFAULT_PRODUCTION_STAGES.map(stage => ({
        ...stage,
        isCompleted: false,
    }));
};

/**
 * Calculate production progress percentage
 */
export const calculateProductionProgress = (stages: ProductionStage[]): number => {
    if (stages.length === 0) return 0;

    const completedStages = stages.filter(s => s.isCompleted);
    return Math.round((completedStages.length / stages.length) * 100);
};

/**
 * Get next pending stage in the workflow
 */
export const getNextPendingStage = (stages: ProductionStage[]): ProductionStage | null => {
    const sortedStages = [...stages].sort((a, b) => a.order - b.order);
    return sortedStages.find(s => !s.isCompleted) || null;
};
/**
 * Check if all enabled stages are completed
 */
export const isProductionComplete = (stages: ProductionStage[]): boolean => {
    return stages.length > 0 && stages.every(s => s.isCompleted);
};

// =============================================================================
// PRODUCTION TEMPLATE TYPES - Single Template System
// =============================================================================

/**
 * Field types supported in templates
 */
export type TemplateFieldType = 'text' | 'number' | 'textarea' | 'checkbox' | 'select';

/**
 * Single field definition in a template
 */
export interface TemplateField {
    id: string;
    name: string;
    type: TemplateFieldType;
    placeholder?: string;
    unit?: string;
    required?: boolean;
    options?: string[]; // For 'select' type
}

/**
 * Fields configuration for a single stage
 */
export interface StageTemplate {
    id: string;
    stageName: string;
    description?: string;
    fields: TemplateField[];
    order: number;
}

/**
 * Complete production template (Single template)
 */
export interface ProductionTemplate {
    id: string;
    name: string;
    description?: string;
    stages: StageTemplate[];
    updatedAt: string;
}

/**
 * Stage field values (filled by user during production)
 */
export interface StageFieldValue {
    fieldId: string;
    fieldName: string;
    value: string | number | boolean;
    unit?: string;
}

/**
 * Production stage with user-filled values
 */
export interface ProductionStageWithValues {
    stageId: string;
    stageName: string;
    isCompleted: boolean;
    completedAt?: string;
    fieldValues: StageFieldValue[];
}

/**
 * Generate unique ID
 */
export const generateId = (): string => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Default template with common production stages
 */
export const getDefaultTemplate = (): ProductionTemplate => ({
    id: 'default-template',
    name: 'Production Workflow',
    description: 'Default production workflow template',
    stages: [
        {
            id: generateId(),
            stageName: 'Measurement',
            description: 'Take measurements and prepare specifications',
            order: 1,
            fields: [
                { id: generateId(), name: 'Length', type: 'number', unit: 'cm', placeholder: '0' },
                { id: generateId(), name: 'Width', type: 'number', unit: 'cm', placeholder: '0' },
                { id: generateId(), name: 'Notes', type: 'textarea', placeholder: 'Enter measurement notes...' },
            ],
        },
        {
            id: generateId(),
            stageName: 'Cutting',
            description: 'Cut raw materials according to measurements',
            order: 2,
            fields: [
                { id: generateId(), name: 'Pieces Cut', type: 'number', placeholder: '0' },
                { id: generateId(), name: 'Wastage', type: 'number', unit: '%', placeholder: '0' },
            ],
        },
        {
            id: generateId(),
            stageName: 'Inspection (Cutting)',
            description: 'Quality check after cutting process',
            order: 3,
            fields: [
                { id: generateId(), name: 'Passed', type: 'number', placeholder: '0' },
                { id: generateId(), name: 'Rejected', type: 'number', placeholder: '0' },
                { id: generateId(), name: 'Remarks', type: 'textarea', placeholder: 'Inspection remarks...' },
            ],
        },
        {
            id: generateId(),
            stageName: 'Stitching',
            description: 'Stitch and assemble the product',
            order: 4,
            fields: [
                { id: generateId(), name: 'Pieces Completed', type: 'number', placeholder: '0' },
                { id: generateId(), name: 'Notes', type: 'textarea', placeholder: 'Stitching notes...' },
            ],
        },
        {
            id: generateId(),
            stageName: 'Inspection (Stitching)',
            description: 'Quality check after stitching process',
            order: 5,
            fields: [
                { id: generateId(), name: 'Passed', type: 'number', placeholder: '0' },
                { id: generateId(), name: 'Rejected', type: 'number', placeholder: '0' },
                { id: generateId(), name: 'Remarks', type: 'textarea', placeholder: 'Inspection remarks...' },
            ],
        },
        {
            id: generateId(),
            stageName: 'Accessories',
            description: 'Add buttons, zippers, and other accessories',
            order: 6,
            fields: [
                { id: generateId(), name: 'Items Used', type: 'text', placeholder: 'e.g., Buttons x10, Zippers x5' },
            ],
        },
        {
            id: generateId(),
            stageName: 'Packing',
            description: 'Pack the finished product',
            order: 7,
            fields: [
                { id: generateId(), name: 'Boxes Used', type: 'number', placeholder: '0' },
                { id: generateId(), name: 'Total Weight', type: 'number', unit: 'kg', placeholder: '0' },
            ],
        },
        {
            id: generateId(),
            stageName: 'Shipping',
            description: 'Prepare for shipment and dispatch',
            order: 8,
            fields: [
                { id: generateId(), name: 'Tracking Number', type: 'text', placeholder: 'Enter tracking number' },
                { id: generateId(), name: 'Courier', type: 'text', placeholder: 'Courier name' },
            ],
        },
    ],
    updatedAt: new Date().toISOString(),
});
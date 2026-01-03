export interface CustomField {
  id: string;
  name: string;
  type: 'text' | 'number' | 'select' | 'boolean' | 'date';
  options?: string[]; // For select type
  required: boolean;
}

export interface ProductTemplate {
  id: string;
  name: string;
  description: string;
  fields: CustomField[];
  createdAt: Date;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  description: string;
  category: string;
  categories?: string[];
  templateId?: string;
  stockQuantity: number;
  minStockLevel: number;
  minOrderLevel?: number;
  unit: string;
  customFields: Record<string, string | number | boolean>;
  images: string[];
  minPrice?: number;
  maxPrice?: number;
  taxPercentage?: string;
  inventoryLocation?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface StockStatus {
  level: 'in-stock' | 'low-stock' | 'out-of-stock';
  label: string;
  color: string;
}

export const getStockStatus = (quantity: number, minLevel: number): StockStatus => {
  if (quantity === 0) {
    return { level: 'out-of-stock', label: 'Out of Stock', color: 'bg-destructive text-destructive-foreground' };
  }
  if (quantity <= minLevel) {
    return { level: 'low-stock', label: 'Low Stock', color: 'bg-warning text-warning-foreground' };
  }
  return { level: 'in-stock', label: 'In Stock', color: 'bg-success text-success-foreground' };
};

export const DEFAULT_FIELDS: CustomField[] = [
  { id: 'brand', name: 'Brand', type: 'text', required: false },
  { id: 'weight', name: 'Weight', type: 'text', required: false },
  { id: 'dimensions', name: 'Dimensions', type: 'text', required: false },
  { id: 'material', name: 'Material', type: 'text', required: false },
  { id: 'color', name: 'Color', type: 'text', required: false },
];
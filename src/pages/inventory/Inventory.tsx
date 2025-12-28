import { useState, useMemo } from 'react';
import { Plus, Upload, Layers, Trash2, Loader2 } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { InventoryStats } from '@/components/inventory/InventoryStats';
import { InventoryFilters } from '@/components/inventory/InventoryFilters';
import { ProductsTable } from '@/components/inventory/ProductsTable';
import { AddProductDialog } from '@/components/inventory/AddProductDialog';
import { TemplateManager } from '@/components/inventory/TemplateManager';
import { BulkUploadDialog } from '@/components/inventory/BulkUploadDialog';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Product, ProductTemplate } from '@/types/inventory';
import { usePermissions } from '@/hooks/usePermissions';
import {
  useProducts,
  useInventory,
  useCreateProduct,
  useCreateInventory,
  useTemplates,
  useCreateTemplate,
  useDeleteTemplate,
} from '@/hooks/useApi';

// Default predefined categories
const INITIAL_CATEGORIES = [
  'Electronics', 'Clothing', 'Food & Beverages', 'Furniture', 'Accessories',
  'Home & Kitchen', 'Sports & Outdoors', 'Health & Beauty', 'Toys & Games',
  'Books & Stationery', 'Automotive', 'Industrial',
];

// Extended product data type (for images and additional fields)
interface ExtendedProductData {
  images?: string[];
  customFields?: Record<string, unknown>;
  // Price fields
  minPrice?: number;
  maxPrice?: number;
  taxPercentage?: string;
  // Inventory fields
  inventoryLocation?: string;
  categories?: string[];
  stockQuantity?: number;
  minStockLevel?: number;
  minOrderLevel?: number;
  unit?: string;
  templateId?: string;
}

// localStorage key for images only
const IMAGES_DATA_KEY = 'bulkflow_product_images';

// Helper to load images from localStorage
const loadImagesData = (): Record<string, ExtendedProductData> => {
  try {
    const data = localStorage.getItem(IMAGES_DATA_KEY);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
};

// Helper to save images to localStorage
const saveImagesData = (data: Record<string, ExtendedProductData>) => {
  try {
    localStorage.setItem(IMAGES_DATA_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save product images:', e);
  }
};

export default function Inventory() {
  const { canCreate, canDelete } = usePermissions();

  // API Data
  const { data: apiProducts, isLoading: productsLoading, error: productsError } = useProducts();
  const { data: apiInventory, isLoading: inventoryLoading, error: inventoryError } = useInventory();
  const { data: apiTemplates, isLoading: templatesLoading } = useTemplates();

  // Mutations
  const createProductMutation = useCreateProduct();
  const createInventoryMutation = useCreateInventory();
  const createTemplateMutation = useCreateTemplate();
  const deleteTemplateMutation = useDeleteTemplate();

  // Local state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [stockStatus, setStockStatus] = useState('all');
  const [allCategories, setAllCategories] = useState<string[]>(INITIAL_CATEGORIES);
  const [imagesData, setImagesData] = useState<Record<string, ExtendedProductData>>(loadImagesData);

  // Dialogs
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Template creation flow
  const [startTemplateInCreateMode, setStartTemplateInCreateMode] = useState(false);
  const [preSelectedTemplateId, setPreSelectedTemplateId] = useState<string | undefined>(undefined);
  const [reopenAddProductAfterTemplate, setReopenAddProductAfterTemplate] = useState(false);

  // Transform API templates to frontend format
  const templates: ProductTemplate[] = useMemo(() => {
    if (!apiTemplates) return [];
    return apiTemplates.map(t => ({
      id: t.id,
      name: t.name,
      description: t.description,
      fields: t.fields.map(f => ({
        id: f.id,
        name: f.name,
        type: f.type as 'text' | 'number' | 'boolean' | 'select' | 'date',
        required: f.required,
        options: f.options,
      })),
      createdAt: t.createdAt,
    }));
  }, [apiTemplates]);

  // Category management handlers
  const handleAddCategory = (newCategory: string) => {
    if (!allCategories.includes(newCategory)) {
      setAllCategories(prev => [...prev, newCategory]);
      toast.success(`Category "${newCategory}" added`);
    }
  };

  const handleEditCategory = (oldName: string, newName: string) => {
    if (allCategories.includes(oldName)) {
      setAllCategories(prev => prev.map(c => c === oldName ? newName : c));
      toast.success(`Category renamed to "${newName}"`);
    }
  };

  const handleDeleteCategory = (categoryToDelete: string) => {
    setAllCategories(prev => prev.filter(c => c !== categoryToDelete));
    toast.success(`Category "${categoryToDelete}" deleted`);
  };

  // Merge API products with inventory data
  const products: Product[] = useMemo(() => {
    if (!apiProducts) return [];
    return apiProducts.map((apiProduct) => {
      const inventory = apiInventory?.find((inv) => inv.product === apiProduct._id);
      const images = imagesData[apiProduct._id]?.images || [];

      return {
        id: apiProduct._id,
        sku: apiProduct.sku || '',
        name: apiProduct.name,
        description: apiProduct.description || '',
        category: apiProduct.categories?.[0] || 'General',
        stockQuantity: apiProduct.stockQuantity ?? inventory?.stock ?? 0,
        minStockLevel: apiProduct.minStockLevel ?? inventory?.reorderLevel ?? 0,
        minOrderLevel: apiProduct.minOrderLevel ?? 1,
        unit: apiProduct.unit || 'units',
        customFields: {},
        images: images,
        templateId: apiProduct.templateId,
        createdAt: new Date(apiProduct.createdAt || Date.now()),
        updatedAt: new Date(apiProduct.updatedAt || Date.now()),
        minPrice: apiProduct.minPrice,
        maxPrice: apiProduct.maxPrice,
        taxPercentage: apiProduct.taxRate?.toString(),
        inventoryLocation: apiProduct.inventoryLocation,
        categories: apiProduct.categories,
      } as Product & ExtendedProductData;
    });
  }, [apiProducts, apiInventory, imagesData]);

  const categories = useMemo(() => [...new Set(products.map((p) => p.category))], [products]);

  const stats = useMemo(() => {
    const totalProducts = products.length;
    const inStock = products.filter((p) => p.stockQuantity > p.minStockLevel).length;
    const lowStock = products.filter((p) => p.stockQuantity > 0 && p.stockQuantity <= p.minStockLevel).length;
    const outOfStock = products.filter((p) => p.stockQuantity === 0).length;
    return {
      totalProducts,
      inStock,
      lowStock,
      outOfStock,
      totalTemplates: templates.length,
      categories: [...new Set(products.map((p) => p.category))].length,
    };
  }, [products, templates]);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const searchLower = search.toLowerCase();
      const matchesSearch = !search || product.sku.toLowerCase().includes(searchLower) || product.name.toLowerCase().includes(searchLower) || product.description.toLowerCase().includes(searchLower);
      const matchesCategory = category === 'all' || product.category === category;
      let matchesStock = true;
      if (stockStatus === 'in-stock') matchesStock = product.stockQuantity > product.minStockLevel;
      else if (stockStatus === 'low-stock') matchesStock = product.stockQuantity > 0 && product.stockQuantity <= product.minStockLevel;
      else if (stockStatus === 'out-of-stock') matchesStock = product.stockQuantity === 0;
      return matchesSearch && matchesCategory && matchesStock;
    });
  }, [products, search, category, stockStatus]);

  // Handle save product
  const handleSaveProduct = async (productData: Partial<Product> & ExtendedProductData) => {
    if (editingProduct) {
      // TODO: Implement product update when backend supports it
      toast.info('Product update coming soon');
    } else {
      try {
        // Helper to check if string is valid MongoDB ObjectId (24 hex chars)
        const isValidObjectId = (id: string | undefined): boolean => {
          if (!id) return false;
          return /^[a-fA-F0-9]{24}$/.test(id);
        };

        // Transform customFields from ID-keyed to name-keyed for backend
        // Frontend stores: { "fieldId123": "value" }
        // Backend expects: { "Company Name": "value" }
        const transformedTemplateValues: Record<string, string> = {};
        if (productData.customFields && productData.templateId) {
          const selectedTemplate = templates.find(t => t.id === productData.templateId);
          if (selectedTemplate) {
            Object.entries(productData.customFields).forEach(([fieldId, value]) => {
              // Find the field by ID to get its name
              const field = selectedTemplate.fields.find(f => f.id === fieldId);
              if (field) {
                transformedTemplateValues[field.name] = String(value);
              } else {
                // Fallback: use the key as-is (might already be a name)
                transformedTemplateValues[fieldId] = String(value);
              }
            });
          }
        }

        // Step 1: Create product in backend
        const result = await createProductMutation.mutateAsync({
          name: productData.name || '',
          description: productData.description || '',
          sku: productData.sku || `SKU-${Date.now()}`,
          unit: productData.unit || 'units',
          categories: productData.categories || ['General'],
          minPrice: productData.minPrice || 0,
          maxPrice: productData.maxPrice || 0,
          taxRate: parseInt(productData.taxPercentage || '0', 10),
          inventoryLocation: productData.inventoryLocation || 'Default',
          stockQuantity: productData.stockQuantity || 0,
          minStockLevel: productData.minStockLevel || 0,
          minOrderLevel: productData.minOrderLevel || 1,
          ...(isValidObjectId(productData.templateId) && { templateId: productData.templateId }),
          templateValues: transformedTemplateValues,
        });

        // Step 2: Create inventory entry (required for orders to work)
        if (result && result._id) {
          try {
            await createInventoryMutation.mutateAsync({
              product: result._id,
              stock: productData.stockQuantity || 0,
              reserved: 0,
              reorderLevel: productData.minStockLevel || 0,
            });
          } catch (inventoryError) {
            console.error('Failed to create inventory entry:', inventoryError);
            // Product was created but inventory failed - inform user
            toast.error('Product created but inventory entry failed. Orders may not work.');
          }

          // Step 3: Store images locally (until backend supports images)
          if (productData.images?.length) {
            const updatedImages = {
              ...imagesData,
              [result._id]: { images: productData.images },
            };
            setImagesData(updatedImages);
            saveImagesData(updatedImages);
          }
        }
      } catch {
        // Error toast shown by hook
      }
    }
    setEditingProduct(null);
    setPreSelectedTemplateId(undefined);
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setAddDialogOpen(true);
  };

  const handleDeleteProduct = (id: string) => {
    setDeletingId(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (deletingId) {
      // Remove images data
      const updatedImages = { ...imagesData };
      delete updatedImages[deletingId];
      setImagesData(updatedImages);
      saveImagesData(updatedImages);
    }
    toast.info('Delete functionality coming soon');
    setDeleteDialogOpen(false);
    setDeletingId(null);
  };

  const handleBulkDelete = () => {
    toast.info('Bulk delete functionality coming soon');
    setSelectedIds([]);
  };

  // Template handlers - now using API
  const handleSaveTemplate = async (templateData: Partial<ProductTemplate>) => {
    try {
      await createTemplateMutation.mutateAsync({
        name: templateData.name || '',
        description: templateData.description,
        fields: (templateData.fields || []).map(f => ({
          id: f.id,
          name: f.name,
          type: f.type,
          required: f.required,
          options: f.options,
        })),
      });
    } catch {
      // Error toast shown by hook
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    try {
      await deleteTemplateMutation.mutateAsync(id);
    } catch {
      // Error toast shown by hook
    }
  };

  const handleBulkUpload = (data: Record<string, unknown>[]) => {
    toast.success(`Imported ${data.length} products`);
  };

  const clearFilters = () => {
    setSearch('');
    setCategory('all');
    setStockStatus('all');
  };

  const handleCreateTemplateFromProduct = () => {
    setAddDialogOpen(false);
    setReopenAddProductAfterTemplate(true);
    setStartTemplateInCreateMode(true);
    setTemplateDialogOpen(true);
  };

  const handleTemplateCreated = (templateId: string) => {
    setPreSelectedTemplateId(templateId);
    if (reopenAddProductAfterTemplate) {
      setReopenAddProductAfterTemplate(false);
      setTimeout(() => setAddDialogOpen(true), 150);
    }
  };

  const handleTemplateDialogChange = (open: boolean) => {
    setTemplateDialogOpen(open);
    if (!open) {
      setStartTemplateInCreateMode(false);
      if (reopenAddProductAfterTemplate) {
        setReopenAddProductAfterTemplate(false);
        setTimeout(() => setAddDialogOpen(true), 150);
      }
    }
  };

  const handleAddDialogChange = (open: boolean) => {
    setAddDialogOpen(open);
    if (!open) {
      setEditingProduct(null);
      setPreSelectedTemplateId(undefined);
    }
  };

  // Loading state
  if (productsLoading || inventoryLoading || templatesLoading) {
    return (
        <DashboardLayout>
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">Loading inventory...</span>
          </div>
        </DashboardLayout>
    );
  }

  // Error state
  if (productsError || inventoryError) {
    return (
        <DashboardLayout>
          <div className="flex flex-col items-center justify-center h-64 text-destructive">
            <p>Failed to load inventory data</p>
            <p className="text-sm">{productsError?.message || inventoryError?.message}</p>
          </div>
        </DashboardLayout>
    );
  }

  return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">Inventory</h1>
              <p className="text-muted-foreground">Manage your product listings, stock levels, and templates</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {canCreate('inventory') && (
                  <Button variant="outline" onClick={() => { setStartTemplateInCreateMode(false); setTemplateDialogOpen(true); }}>
                    <Layers className="mr-2 h-4 w-4" />Templates
                  </Button>
              )}
              {canCreate('inventory') && (
                  <Button variant="outline" onClick={() => setBulkUploadOpen(true)}>
                    <Upload className="mr-2 h-4 w-4" />Bulk Upload
                  </Button>
              )}
              {canCreate('inventory') && (
                  <Button onClick={() => setAddDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />Add Product
                  </Button>
              )}
            </div>
          </div>

          <InventoryStats stats={stats} />
          <InventoryFilters
              search={search}
              onSearchChange={setSearch}
              category={category}
              onCategoryChange={setCategory}
              stockStatus={stockStatus}
              onStockStatusChange={setStockStatus}
              categories={categories}
              onClearFilters={clearFilters}
          />

          {canDelete('inventory') && selectedIds.length > 0 && (
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <span className="text-sm font-medium">{selectedIds.length} selected</span>
                <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
                  <Trash2 className="mr-2 h-4 w-4" />Delete Selected
                </Button>
              </div>
          )}

          <ProductsTable
              products={filteredProducts}
              selectedIds={selectedIds}
              onSelectionChange={setSelectedIds}
              onEdit={handleEditProduct}
              onDelete={handleDeleteProduct}
              showCheckboxes={canDelete('inventory')}
          />
        </div>

        <AddProductDialog
            open={addDialogOpen}
            onOpenChange={handleAddDialogChange}
            editProduct={editingProduct}
            onSave={handleSaveProduct}
            onCreateTemplate={handleCreateTemplateFromProduct}
            templates={templates}
            preSelectedTemplateId={preSelectedTemplateId}
            availableCategories={allCategories}
            onAddCategory={handleAddCategory}
            onEditCategory={handleEditCategory}
            onDeleteCategory={handleDeleteCategory}
        />

        <TemplateManager
            open={templateDialogOpen}
            onOpenChange={handleTemplateDialogChange}
            templates={templates}
            onSave={handleSaveTemplate}
            onDelete={handleDeleteTemplate}
            startInCreateMode={startTemplateInCreateMode}
            onTemplateCreated={handleTemplateCreated}
        />

        <BulkUploadDialog
            open={bulkUploadOpen}
            onOpenChange={setBulkUploadOpen}
            templates={templates}
            onUpload={handleBulkUpload}
        />

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Product</AlertDialogTitle>
              <AlertDialogDescription>Are you sure you want to delete this product? This action cannot be undone.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DashboardLayout>
  );
}
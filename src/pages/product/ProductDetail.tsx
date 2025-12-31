import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Package, AlertTriangle, ImageIcon, Loader2, Layers, Trash2 } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { StockBadge } from '@/components/inventory/StockBadge';
import { useProduct, useInventory, useTemplates, useDeleteProduct } from '@/hooks/useApi';
import { usePermissions } from '@/hooks/usePermissions';


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

// localStorage key for images (until backend supports images)
const IMAGES_DATA_KEY = 'bulkflow_product_images';

// Helper to load images from localStorage
const loadImagesData = (): Record<string, { images?: string[] }> => {
  try {
    const data = localStorage.getItem(IMAGES_DATA_KEY);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
};

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { canEdit, canDelete } = usePermissions();

  // API Data
  const { data: apiProduct, isLoading: productLoading } = useProduct(id);
  const { data: apiInventory, isLoading: inventoryLoading } = useInventory();
  const { data: apiTemplates, isLoading: templatesLoading } = useTemplates();
  // Delete mutation and state
  const deleteProductMutation = useDeleteProduct();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Find inventory entry for this product
  const inventoryEntry = apiInventory?.find((inv) => inv.product === id);

  // Get images from localStorage (until backend supports images)
  const imagesData = loadImagesData();
  const productImages = id ? imagesData[id]?.images || [] : [];

  // Handle delete product
  const handleDelete = async () => {
    if (!id) return;

    try {
      await deleteProductMutation.mutateAsync(id);
      // Clean up localStorage images
      const currentImagesData = loadImagesData();
      if (currentImagesData[id]) {
        delete currentImagesData[id];
        localStorage.setItem(IMAGES_DATA_KEY, JSON.stringify(currentImagesData));
      }
      navigate('/inventory');
    } catch {
      // Error handled by hook
    }
  };

  // Loading state
  if (productLoading || inventoryLoading || templatesLoading) {
    return (
        <DashboardLayout>
          <div className="flex items-center justify-center h-[50vh] gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span>Loading product...</span>
          </div>
        </DashboardLayout>
    );
  }

  // Not found state
  if (!apiProduct) {
    return (
        <DashboardLayout>
          <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
            <Package className="h-16 w-16 text-muted-foreground" />
            <h2 className="text-xl font-semibold">Product not found</h2>
            <p className="text-muted-foreground">The product you're looking for doesn't exist or has been removed.</p>
            <Button onClick={() => navigate('/inventory')}>Back to Inventory</Button>
          </div>
        </DashboardLayout>
    );
  }

  // Extract product data from API
  const productName = apiProduct.name;
  const productSku = apiProduct.sku || apiProduct._id;
  const productDescription = apiProduct.description || '';

  // Stock data - prioritize product API, then inventory API
  const stockQuantity = apiProduct.stockQuantity ?? inventoryEntry?.stock ?? 0;
  const minStockLevel = apiProduct.minStockLevel ?? inventoryEntry?.reorderLevel ?? 0;
  const minOrderLevel = apiProduct.minOrderLevel ?? 1;
  const productUnit = apiProduct.unit || 'units';

  // Category
  const productCategory = apiProduct.categories?.[0] || 'General';
  const categories = apiProduct.categories || [];

  // Price and tax
  const minPrice = apiProduct.minPrice;
  const maxPrice = apiProduct.maxPrice;
  const taxRate = apiProduct.taxRate;
  const inventoryLocation = apiProduct.inventoryLocation;

  // Image
  const productImage = productImages[0] || null;

  // Template
  const template = apiProduct.templateId && apiTemplates
      ? apiTemplates.find(t => t.id === apiProduct.templateId || t._id === apiProduct.templateId)
      : undefined;

  // Template values / additional fields
  // Backend may return data in different formats:
  // 1. templateValues: { "Company Name": "value" }
  // 2. additionalFields: [{ fieldName: "Company Name", value: "value" }]
  const rawTemplateValues = apiProduct.templateValues || {};
  const rawAdditionalFields = apiProduct.additionalFields || [];

  // Merge both sources into a unified format for display
  const mergedTemplateValues: Record<string, unknown> = { ...rawTemplateValues };

  // Convert additionalFields array to object format and merge
  if (Array.isArray(rawAdditionalFields)) {
    rawAdditionalFields.forEach((field: { fieldName?: string; value?: unknown }) => {
      if (field.fieldName && field.value !== undefined && field.value !== null && field.value !== '') {
        mergedTemplateValues[field.fieldName] = field.value;
      }
    });
  }

  // Check if we have any actual values to display
  const hasTemplateValues = Object.keys(mergedTemplateValues).length > 0 &&
      Object.values(mergedTemplateValues).some(v => v !== undefined && v !== null && v !== '');

  // Don't show Additional Details separately - it's already merged into templateValues
  // Only show Additional Details if there's NO template but there ARE additionalFields
  const hasAdditionalFields = !template && rawAdditionalFields.length > 0 &&
      rawAdditionalFields.some((f: { value?: unknown }) => f.value !== undefined && f.value !== null && f.value !== '');

  const displayAdditionalFields = hasAdditionalFields ? rawAdditionalFields.filter(
      (field: { fieldName?: string; value?: unknown }) =>
          field.fieldName && field.value !== undefined && field.value !== null && field.value !== ''
  ) : [];

  const stockPercentage = minStockLevel > 0
      ? Math.min((stockQuantity / minStockLevel) * 100, 200)
      : 100;

  // Helper to get field label from template
  const getFieldLabel = (fieldId: string): string => {
    if (template) {
      const field = template.fields.find(f => f.id === fieldId || f.name === fieldId);
      if (field) return field.name;
    }
    // Fallback: format field ID as label
    return fieldId.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).trim();
  };

  // Helper to render field value
  const renderFieldValue = (fieldId: string, value: unknown) => {
    // Check if it's a color field (hex value)
    const isColor = typeof value === 'string' && /^#[0-9A-Fa-f]{6}$/.test(value);

    if (isColor) {
      return (
          <div className="mt-1 flex items-center gap-2">
            <div
                className="h-6 w-6 rounded border"
                style={{ backgroundColor: value as string }}
            />
            <span className="font-medium font-mono">{value}</span>
          </div>
      );
    }

    if (typeof value === 'boolean') {
      return <p className="mt-1 font-medium">{value ? 'Yes' : 'No'}</p>;
    }

    return <p className="mt-1 font-medium">{String(value)}</p>;
  };

  return (
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/inventory')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">{productName}</h1>
                <StockBadge quantity={stockQuantity} minLevel={minStockLevel} />
              </div>
              <p className="text-muted-foreground font-mono">{productSku}</p>
            </div>
            <div className="flex gap-2">
              {canEdit('inventory') && (
                  <Button variant="outline" onClick={() => navigate('/inventory')}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Product
                  </Button>
              )}
              {canDelete('inventory') && (
                  <Button
                      variant="destructive"
                      onClick={() => setDeleteDialogOpen(true)}
                      disabled={deleteProductMutation.isPending}
                  >
                    {deleteProductMutation.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <Trash2 className="mr-2 h-4 w-4" />
                    )}
                    Delete
                  </Button>
              )}
            </div>
          </div>

          {/* Main Content */}
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Left Column - Product Image & Custom Fields */}
            <div className="lg:col-span-2 space-y-6">
              {/* Product Image */}
              <Card>
                <CardHeader>
                  <CardTitle>Product Image</CardTitle>
                </CardHeader>
                <CardContent>
                  {productImage ? (
                      <div className="aspect-video rounded-lg overflow-hidden bg-gray-100">
                        <img
                            src={productImage}
                            alt={productName}
                            className="w-full h-full object-contain"
                        />
                      </div>
                  ) : (
                      <div className="aspect-video rounded-lg bg-gray-100 flex flex-col items-center justify-center text-muted-foreground">
                        <ImageIcon className="h-16 w-16 mb-2" />
                        <p>No image available</p>
                      </div>
                  )}
                </CardContent>
              </Card>

              {/* Template Fields */}
              {hasTemplateValues && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        {template ? (
                            <>
                              <Layers className="h-5 w-5 text-primary" />
                              {template.name} Fields
                            </>
                        ) : (
                            'Template Fields'
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid sm:grid-cols-2 gap-4">
                        {Object.entries(mergedTemplateValues).map(([key, value]) => (
                            <div key={key}>
                              <p className="text-sm text-muted-foreground">
                                {getFieldLabel(key)}
                              </p>
                              {renderFieldValue(key, value)}
                            </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
              )}

              {/* Additional Fields */}
              {hasAdditionalFields && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Additional Details</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid sm:grid-cols-2 gap-4">
                        {displayAdditionalFields.map((field: { fieldName?: string; value?: unknown }, index: number) => (
                            <div key={index}>
                              <p className="text-sm text-muted-foreground">{field.fieldName}</p>
                              <p className="mt-1 font-medium">{String(field.value)}</p>
                            </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
              )}
            </div>

            {/* Sidebar - Stock Level + Product Information */}
            <div className="space-y-6">
              {/* Stock Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    Stock Level
                    {stockQuantity <= minStockLevel && stockQuantity > 0 && (
                        <AlertTriangle className="h-5 w-5 text-warning" />
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center">
                    <p className="text-4xl font-bold">
                      {stockQuantity.toLocaleString()}
                    </p>
                    <p className="text-sm text-muted-foreground">{productUnit}</p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Current Stock</span>
                      <span className="font-medium">{stockQuantity}</span>
                    </div>
                    <div className="h-3 bg-muted rounded-full overflow-hidden">
                      <div
                          className={`h-full transition-all ${
                              stockQuantity === 0
                                  ? 'bg-destructive'
                                  : stockQuantity <= minStockLevel
                                      ? 'bg-warning'
                                      : 'bg-success'
                          }`}
                          style={{ width: `${Math.min(stockPercentage, 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Minimum Level</span>
                      <span>{minStockLevel}</span>
                    </div>
                  </div>

                  {stockQuantity <= minStockLevel && (
                      <div className="p-3 bg-warning/10 border border-warning/20 rounded-lg">
                        <p className="text-sm text-warning-foreground">
                          {stockQuantity === 0
                              ? 'This product is out of stock. Consider restocking soon.'
                              : 'Stock is running low. Consider reordering.'}
                        </p>
                      </div>
                  )}
                </CardContent>
              </Card>

              {/* Product Information Card */}
              <Card>
                <CardHeader>
                  <CardTitle>Product Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Description */}
                  <div>
                    <p className="text-sm text-muted-foreground">Description</p>
                    <p className="mt-1 text-sm">{productDescription || 'No description available'}</p>
                  </div>

                  <Separator />

                  {/* Category */}
                  <div>
                    <p className="text-sm text-muted-foreground">Category</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {categories.length > 0 ? (
                          categories.map((cat) => (
                              <Badge key={cat} variant="secondary" className="text-xs">{cat}</Badge>
                          ))
                      ) : (
                          <span className="font-medium text-sm">{productCategory}</span>
                      )}
                    </div>
                  </div>

                  {/* Template */}
                  <div>
                    <p className="text-sm text-muted-foreground">Template</p>
                    <div className="mt-1 flex items-center gap-2">
                      {template ? (
                          <>
                            <Layers className="h-4 w-4 text-primary" />
                            <span className="font-medium text-sm">{template.name}</span>
                          </>
                      ) : (
                          <span className="font-medium text-sm text-muted-foreground">None</span>
                      )}
                    </div>
                  </div>

                  {/* Unit */}
                  <div>
                    <p className="text-sm text-muted-foreground">Unit</p>
                    <p className="mt-1 font-medium text-sm capitalize">{productUnit}</p>
                  </div>

                  {/* SKU */}
                  <div>
                    <p className="text-sm text-muted-foreground">SKU</p>
                    <p className="mt-1 font-mono text-sm">{productSku}</p>
                  </div>

                  {/* Min Order Level */}
                  <div>
                    <p className="text-sm text-muted-foreground">Minimum Order Quantity</p>
                    <p className="mt-1 font-medium text-sm">{minOrderLevel} {productUnit}</p>
                  </div>

                  {/* Price & Tax Section */}
                  {(minPrice !== undefined || maxPrice !== undefined || taxRate !== undefined) && (
                      <>
                        <Separator />
                        {minPrice !== undefined && (
                            <div>
                              <p className="text-sm text-muted-foreground">Min Price</p>
                              <p className="mt-1 font-semibold text-lg">₹{minPrice.toLocaleString()}</p>
                            </div>
                        )}
                        {maxPrice !== undefined && (
                            <div>
                              <p className="text-sm text-muted-foreground">Max Price</p>
                              <p className="mt-1 font-semibold text-lg">₹{maxPrice.toLocaleString()}</p>
                            </div>
                        )}
                        {taxRate !== undefined && (
                            <div>
                              <p className="text-sm text-muted-foreground">Tax Rate</p>
                              <p className="mt-1 font-semibold">{taxRate}% GST</p>
                            </div>
                        )}
                      </>
                  )}

                  {/* Inventory Location */}
                  {inventoryLocation && (
                      <>
                        <Separator />
                        <div>
                          <p className="text-sm text-muted-foreground">Inventory Location</p>
                          <p className="mt-1 font-medium text-sm">{inventoryLocation}</p>
                        </div>
                      </>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Product</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{productName}"? This action cannot be undone and will remove all associated data.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleteProductMutation.isPending}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  disabled={deleteProductMutation.isPending}
              >
                {deleteProductMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Deleting...
                    </>
                ) : (
                    <>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Product
                    </>
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DashboardLayout>
  );
}
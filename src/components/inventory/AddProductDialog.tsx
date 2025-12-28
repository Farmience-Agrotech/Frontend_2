import { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, X, Check, ChevronsUpDown, Palette, Pencil, Upload, Image as ImageIcon, AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Command,
  CommandInput,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Product, ProductTemplate, CustomField } from '@/types/inventory';

// Default predefined categories
const DEFAULT_CATEGORIES = [
  'Electronics', 'Clothing', 'Food & Beverages', 'Furniture', 'Accessories',
  'Home & Kitchen', 'Sports & Outdoors', 'Health & Beauty', 'Toys & Games',
  'Books & Stationery', 'Automotive', 'Industrial',
];

// Tax percentage options (GST slabs)
const TAX_OPTIONS = [
  { value: '0', label: '0% (Exempt)' },
  { value: '5', label: '5% GST' },
  { value: '12', label: '12% GST' },
  { value: '18', label: '18% GST' },
  { value: '28', label: '28% GST' },
];

const COLOR_PALETTE = [
  { name: 'Red', hex: '#EF4444' }, { name: 'Orange', hex: '#F97316' },
  { name: 'Amber', hex: '#F59E0B' }, { name: 'Yellow', hex: '#EAB308' },
  { name: 'Lime', hex: '#84CC16' }, { name: 'Green', hex: '#22C55E' },
  { name: 'Emerald', hex: '#10B981' }, { name: 'Teal', hex: '#14B8A6' },
  { name: 'Cyan', hex: '#06B6D4' }, { name: 'Sky', hex: '#0EA5E9' },
  { name: 'Blue', hex: '#3B82F6' }, { name: 'Indigo', hex: '#6366F1' },
  { name: 'Violet', hex: '#8B5CF6' }, { name: 'Purple', hex: '#A855F7' },
  { name: 'Fuchsia', hex: '#D946EF' }, { name: 'Pink', hex: '#EC4899' },
  { name: 'Rose', hex: '#F43F5E' }, { name: 'Brown', hex: '#A16207' },
  { name: 'Gray', hex: '#6B7280' }, { name: 'Slate', hex: '#64748B' },
  { name: 'Zinc', hex: '#71717A' }, { name: 'Stone', hex: '#78716C' },
  { name: 'Black', hex: '#000000' }, { name: 'White', hex: '#FFFFFF' },
];

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
}

function ColorPicker({ value, onChange }: ColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [customColor, setCustomColor] = useState('');
  const selectedColor = COLOR_PALETTE.find(c => c.hex.toLowerCase() === value?.toLowerCase());

  return (
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-full justify-start gap-2 font-normal">
            {value ? (
                <>
                  <div className="h-5 w-5 rounded border border-gray-300" style={{ backgroundColor: value }} />
                  <span>{selectedColor?.name || value}</span>
                </>
            ) : (
                <>
                  <Palette className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Select color...</span>
                </>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[280px] p-3" align="start">
          <div className="space-y-3">
            <Label className="text-sm font-medium">Color Palette</Label>
            <div className="grid grid-cols-8 gap-1.5">
              {COLOR_PALETTE.map((color) => (
                  <button
                      key={color.hex}
                      type="button"
                      className={cn(
                          "h-7 w-7 rounded-md border-2 transition-all hover:scale-110",
                          value?.toLowerCase() === color.hex.toLowerCase()
                              ? "border-primary ring-2 ring-primary ring-offset-1"
                              : "border-transparent hover:border-gray-400"
                      )}
                      style={{ backgroundColor: color.hex }}
                      onClick={() => { onChange(color.hex); setIsOpen(false); }}
                      title={color.name}
                  />
              ))}
            </div>
            <Separator />
            <div className="space-y-2">
              <Label className="text-sm">Custom Color (Hex)</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">#</span>
                  <Input
                      value={customColor}
                      onChange={(e) => setCustomColor(e.target.value.replace('#', ''))}
                      placeholder="FF5733"
                      maxLength={6}
                      className="pl-7"
                  />
                </div>
                <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      if (customColor && customColor.length >= 3) {
                        onChange(`#${customColor}`);
                        setIsOpen(false);
                        setCustomColor('');
                      }
                    }}
                    disabled={!customColor || customColor.length < 3}
                >
                  Apply
                </Button>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
  );
}

interface LocalCustomField {
  id: string;
  name: string;
  type: string;
  required?: boolean;
}

interface AddProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editProduct?: Product | null;
  onSave: (product: Partial<Product>) => void;
  onCreateTemplate?: () => void;
  templates?: ProductTemplate[];
  preSelectedTemplateId?: string;
  availableCategories?: string[];
  onAddCategory?: (category: string) => void;
  onEditCategory?: (oldName: string, newName: string) => void;
  onDeleteCategory?: (category: string) => void;
}

export function AddProductDialog({
                                   open,
                                   onOpenChange,
                                   editProduct,
                                   onSave,
                                   onCreateTemplate,
                                   templates: externalTemplates,
                                   preSelectedTemplateId,
                                   availableCategories: externalCategories,
                                   onAddCategory,
                                   onEditCategory,
                                   onDeleteCategory,
                                 }: AddProductDialogProps) {
  const templates = externalTemplates || [];
  const allCategories = externalCategories || DEFAULT_CATEGORIES;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    description: '',
    templateId: '',
    stockQuantity: 0,
    minStockLevel: 0,
    minOrderLevel: 1, // NEW: Minimum Order Level (MOQ)
    unit: 'units',
    minPrice: 0,
    maxPrice: 0,
    inventoryLocation: '',
    taxPercentage: '18',
  });

  // Product image state
  const [productImage, setProductImage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Price validation error
  const [priceError, setPriceError] = useState<string | null>(null);

  const [categories, setCategories] = useState<string[]>([]);
  const [categoryPopoverOpen, setCategoryPopoverOpen] = useState(false);
  const [categorySearch, setCategorySearch] = useState('');
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editCategoryValue, setEditCategoryValue] = useState('');
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string | number | boolean>>({});
  const [additionalFields, setAdditionalFields] = useState<LocalCustomField[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<ProductTemplate | null>(null);

  // Validate prices whenever they change
  useEffect(() => {
    validatePrices(formData.minPrice, formData.maxPrice);
  }, [formData.minPrice, formData.maxPrice]);

  // Price validation function
  const validatePrices = (minPrice: number, maxPrice: number): boolean => {
    // Both cannot be zero
    if (minPrice === 0 && maxPrice === 0) {
      setPriceError('Both Min and Max price cannot be zero');
      return false;
    }

    // Max should be greater than Min (when both are non-zero)
    if (minPrice > 0 && maxPrice > 0 && maxPrice <= minPrice) {
      setPriceError('Max price must be greater than Min price');
      return false;
    }

    // If only one is filled, that's okay
    setPriceError(null);
    return true;
  };

  // Handle preSelectedTemplateId
  useEffect(() => {
    if (preSelectedTemplateId && open) {
      const template = templates.find((t) => t.id === preSelectedTemplateId);
      if (template) {
        setSelectedTemplate(template);
        setFormData((prev) => ({ ...prev, templateId: preSelectedTemplateId }));
      }
    }
  }, [preSelectedTemplateId, open, templates]);

  // Handle editProduct
  useEffect(() => {
    if (editProduct && open) {
      const extProduct = editProduct as unknown as Record<string, unknown>;
      setFormData({
        sku: editProduct.sku,
        name: editProduct.name,
        description: editProduct.description,
        templateId: editProduct.templateId || '',
        stockQuantity: editProduct.stockQuantity,
        minStockLevel: editProduct.minStockLevel,
        minOrderLevel: (extProduct.minOrderLevel as number) || 1, // NEW: Load minOrderLevel
        unit: editProduct.unit,
        minPrice: (extProduct.minPrice as number) || 0,
        maxPrice: (extProduct.maxPrice as number) || 0,
        inventoryLocation: (extProduct.inventoryLocation as string) || '',
        taxPercentage: (extProduct.taxPercentage as string) || '18',
      });
      const cats = (extProduct.categories as string[]) || (editProduct.category ? [editProduct.category] : []);
      setCategories(cats);
      setCustomFieldValues(editProduct.customFields || {});
      if (editProduct.images && editProduct.images.length > 0) {
        setProductImage(editProduct.images[0]);
      }
      if (editProduct.templateId) {
        const template = templates.find((t) => t.id === editProduct.templateId);
        setSelectedTemplate(template || null);
      }
    } else if (!editProduct && open && !preSelectedTemplateId) {
      resetForm();
    }
  }, [editProduct, open, templates, preSelectedTemplateId]);

  const resetForm = () => {
    setFormData({
      sku: '', name: '', description: '', templateId: '',
      stockQuantity: 0, minStockLevel: 0, minOrderLevel: 1, unit: 'units', // NEW: Reset minOrderLevel
      minPrice: 0, maxPrice: 0, inventoryLocation: '',
      taxPercentage: '18',
    });
    setCategories([]);
    setCategorySearch('');
    setEditingCategory(null);
    setEditCategoryValue('');
    setCustomFieldValues({});
    setAdditionalFields([]);
    setSelectedTemplate(null);
    setProductImage(null);
    setPriceError(null);
  };

  // Image upload handlers
  const handleImageUpload = (file: File) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProductImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageUpload(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleImageUpload(file);
    }
  };

  const removeImage = () => {
    setProductImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleTemplateChange = (templateId: string) => {
    if (templateId === '__create__') {
      onCreateTemplate?.();
      return;
    }
    if (templateId === 'none') {
      setSelectedTemplate(null);
      setFormData((prev) => ({ ...prev, templateId: '' }));
      return;
    }
    const template = templates.find((t) => t.id === templateId);
    setSelectedTemplate(template || null);
    setFormData((prev) => ({ ...prev, templateId }));
    const newValues: Record<string, string | number | boolean> = {};
    template?.fields.forEach((field) => {
      if (field.type === 'boolean') newValues[field.id] = false;
      else if (field.type === 'number') newValues[field.id] = 0;
      else newValues[field.id] = '';
    });
    setCustomFieldValues(newValues);
  };

  const handleToggleCategory = (category: string) => {
    if (categories.includes(category)) {
      setCategories(categories.filter(c => c !== category));
    } else {
      setCategories([...categories, category]);
    }
  };

  const handleAddNewCategory = (category: string) => {
    const trimmed = category.trim();
    if (trimmed) {
      if (!categories.includes(trimmed)) {
        setCategories([...categories, trimmed]);
      }
      if (!allCategories.includes(trimmed) && onAddCategory) {
        onAddCategory(trimmed);
      }
    }
    setCategorySearch('');
  };

  const handleRemoveCategory = (cat: string) => {
    setCategories(categories.filter(c => c !== cat));
  };

  const handleStartEditCategory = (cat: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setEditingCategory(cat);
    setEditCategoryValue(cat);
  };

  const handleSaveEditCategory = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    e?.preventDefault();
    if (editingCategory && editCategoryValue.trim() && editCategoryValue !== editingCategory) {
      const newName = editCategoryValue.trim();
      setCategories(categories.map(c => c === editingCategory ? newName : c));
      if (onEditCategory) {
        onEditCategory(editingCategory, newName);
      }
    }
    setEditingCategory(null);
    setEditCategoryValue('');
  };

  const handleCancelEdit = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    e?.preventDefault();
    setEditingCategory(null);
    setEditCategoryValue('');
  };

  const handleDeleteCategoryFromList = (cat: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setCategories(categories.filter(c => c !== cat));
    if (onDeleteCategory) {
      onDeleteCategory(cat);
    }
  };

  const filteredCategories = allCategories.filter(cat =>
      cat.toLowerCase().includes(categorySearch.toLowerCase())
  );

  const isNewCategory = categorySearch.trim() &&
      !allCategories.some(c => c.toLowerCase() === categorySearch.toLowerCase());

  const addCustomField = () => {
    setAdditionalFields([...additionalFields, { id: `custom-${Date.now()}`, name: '', type: 'text', required: false }]);
  };

  const updateAdditionalField = (index: number, updates: Partial<LocalCustomField>) => {
    const updated = [...additionalFields];
    updated[index] = { ...updated[index], ...updates };
    setAdditionalFields(updated);
    if (updates.type) {
      const fieldId = additionalFields[index].id;
      setCustomFieldValues(prev => ({
        ...prev,
        [fieldId]: updates.type === 'boolean' ? false : updates.type === 'number' ? 0 : ''
      }));
    }
  };

  const removeAdditionalField = (index: number) => {
    const fieldId = additionalFields[index].id;
    setAdditionalFields(additionalFields.filter((_, i) => i !== index));
    setCustomFieldValues(prev => {
      const newValues = { ...prev };
      delete newValues[fieldId];
      return newValues;
    });
  };

  // Check if form is valid
  const isFormValid = () => {
    if (!formData.sku || !formData.name || categories.length === 0) return false;
    if (priceError) return false;
    // At least one price should be set (not both zero)
    if (formData.minPrice === 0 && formData.maxPrice === 0) return false;
    return true;
  };

  const handleSubmit = () => {
    // Final validation
    if (!validatePrices(formData.minPrice, formData.maxPrice)) {
      return;
    }

    const product = {
      ...formData,
      category: categories[0] || '',
      categories,
      customFields: customFieldValues,
      images: productImage ? [productImage] : [],
      createdAt: editProduct?.createdAt || new Date(),
      updatedAt: new Date(),
    };
    onSave(product as Partial<Product>);
    onOpenChange(false);
    resetForm();
  };

  const renderTemplateFieldInput = (field: CustomField) => {
    const value = customFieldValues[field.id];
    const fieldType = field.type as string;
    switch (fieldType) {
      case 'boolean':
        return (
            <div className="flex items-center gap-2">
              <Checkbox id={field.id} checked={!!value} onCheckedChange={(checked) => setCustomFieldValues(prev => ({ ...prev, [field.id]: checked }))} />
              <Label htmlFor={field.id} className="text-sm">{field.name}</Label>
            </div>
        );
      case 'select':
        return (
            <Select value={String(value || '')} onValueChange={(v) => setCustomFieldValues(prev => ({ ...prev, [field.id]: v }))}>
              <SelectTrigger><SelectValue placeholder={`Select ${field.name}`} /></SelectTrigger>
              <SelectContent>
                {field.options?.map((opt) => (<SelectItem key={opt} value={opt}>{opt}</SelectItem>))}
              </SelectContent>
            </Select>
        );
      case 'number':
        return <Input type="number" value={Number(value) || 0} onChange={(e) => setCustomFieldValues(prev => ({ ...prev, [field.id]: Number(e.target.value) }))} />;
      case 'color':
        return <ColorPicker value={String(value || '')} onChange={(color) => setCustomFieldValues(prev => ({ ...prev, [field.id]: color }))} />;
      default:
        return <Input value={String(value || '')} onChange={(e) => setCustomFieldValues(prev => ({ ...prev, [field.id]: e.target.value }))} />;
    }
  };

  const renderCustomFieldValueInput = (field: LocalCustomField) => {
    const value = customFieldValues[field.id];
    switch (field.type) {
      case 'color':
        return <ColorPicker value={String(value || '')} onChange={(color) => setCustomFieldValues(prev => ({ ...prev, [field.id]: color }))} />;
      case 'boolean':
        return (
            <div className="flex items-center h-10 px-3">
              <Checkbox id={`custom-${field.id}`} checked={!!value} onCheckedChange={(checked) => setCustomFieldValues(prev => ({ ...prev, [field.id]: checked }))} />
              <Label htmlFor={`custom-${field.id}`} className="ml-2 text-sm">Enabled</Label>
            </div>
        );
      case 'number':
        return <Input type="number" value={Number(value) || 0} onChange={(e) => setCustomFieldValues(prev => ({ ...prev, [field.id]: Number(e.target.value) }))} placeholder="Value" />;
      default:
        return <Input value={String(value || '')} onChange={(e) => setCustomFieldValues(prev => ({ ...prev, [field.id]: e.target.value }))} placeholder="Value" />;
    }
  };

  return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editProduct ? 'Edit Product' : 'Add New Product'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Product Image Upload */}
            <div className="space-y-2">
              <Label>Product Image</Label>
              {productImage ? (
                  <div className="relative w-full h-48 rounded-lg border overflow-hidden group">
                    <img
                        src={productImage}
                        alt="Product"
                        className="w-full h-full object-contain bg-gray-50"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => fileInputRef.current?.click()}
                      >
                        <Upload className="h-4 w-4 mr-1" />
                        Change
                      </Button>
                      <Button
                          size="sm"
                          variant="destructive"
                          onClick={removeImage}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Remove
                      </Button>
                    </div>
                  </div>
              ) : (
                  <div
                      className={cn(
                          "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
                          isDragging
                              ? "border-primary bg-primary/5"
                              : "border-gray-300 hover:border-primary hover:bg-gray-50"
                      )}
                      onClick={() => fileInputRef.current?.click()}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                  >
                    <ImageIcon className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                    <p className="text-sm font-medium text-muted-foreground">
                      Drag & drop an image here, or click to select
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Supports: JPG, PNG, GIF (Max 5MB)
                    </p>
                  </div>
              )}
              <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileInputChange}
                  className="hidden"
              />
            </div>

            <Separator />

            {/* Template Selection */}
            <div className="space-y-2">
              <Label>Product Template (Optional)</Label>
              <Select value={formData.templateId || 'none'} onValueChange={handleTemplateChange}>
                <SelectTrigger><SelectValue placeholder="Select a template" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__create__">
                    <span className="flex items-center gap-2"><Plus className="h-4 w-4" />Create New Template</span>
                  </SelectItem>
                  <Separator className="my-1" />
                  <SelectItem value="none">No Template</SelectItem>
                  {templates.map((t) => (<SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Basic Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sku">SKU *</Label>
                <Input id="sku" value={formData.sku} onChange={(e) => setFormData(prev => ({ ...prev, sku: e.target.value }))} placeholder="e.g., FB-RICE-001" />
              </div>
              <div className="space-y-2">
                <Label>Unit</Label>
                <Select value={formData.unit} onValueChange={(v) => setFormData(prev => ({ ...prev, unit: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="units">Units</SelectItem>
                    <SelectItem value="kg">Kilograms</SelectItem>
                    <SelectItem value="liters">Liters</SelectItem>
                    <SelectItem value="pieces">Pieces</SelectItem>
                    <SelectItem value="boxes">Boxes</SelectItem>
                    <SelectItem value="rolls">Rolls</SelectItem>
                    <SelectItem value="meters">Meters</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Product Name *</Label>
              <Input id="name" value={formData.name} onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))} placeholder="Enter product name" />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={formData.description} onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))} placeholder="Product description" rows={3} />
            </div>

            {/* Categories */}
            <div className="space-y-3">
              <Label>Categories *</Label>
              <Popover open={categoryPopoverOpen} onOpenChange={setCategoryPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
                    {categories.length > 0
                        ? `${categories.length} categor${categories.length === 1 ? 'y' : 'ies'} selected`
                        : "Search or type category..."
                    }
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[450px] p-0" align="start">
                  <Command shouldFilter={false}>
                    <CommandInput
                        placeholder="Search or type new category..."
                        value={categorySearch}
                        onValueChange={setCategorySearch}
                    />
                    <div className="max-h-[300px] overflow-y-auto overscroll-contain">
                      {isNewCategory && (
                          <div className="p-1">
                            <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Add New Category</div>
                            <div
                                className="flex items-center px-2 py-2 cursor-pointer hover:bg-accent rounded-sm"
                                onClick={() => handleAddNewCategory(categorySearch.trim())}
                            >
                              <Plus className="mr-2 h-4 w-4 text-primary" />
                              <span>Add "<strong>{categorySearch.trim()}</strong>" as new category</span>
                            </div>
                          </div>
                      )}

                      {filteredCategories.length > 0 ? (
                          <div className="p-1">
                            <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Categories</div>
                            {filteredCategories.map((cat) => (
                                <div key={cat} className="relative">
                                  {editingCategory === cat ? (
                                      <div className="flex items-center gap-2 px-2 py-1.5" onClick={(e) => e.stopPropagation()}>
                                        <Input
                                            value={editCategoryValue}
                                            onChange={(e) => setEditCategoryValue(e.target.value)}
                                            className="h-8 flex-1"
                                            autoFocus
                                            onKeyDown={(e) => {
                                              if (e.key === 'Enter') handleSaveEditCategory();
                                              if (e.key === 'Escape') handleCancelEdit();
                                            }}
                                        />
                                        <Button size="sm" variant="ghost" className="h-8 px-2" onClick={handleSaveEditCategory}>
                                          <Check className="h-4 w-4 text-green-600" />
                                        </Button>
                                        <Button size="sm" variant="ghost" className="h-8 px-2" onClick={handleCancelEdit}>
                                          <X className="h-4 w-4 text-red-600" />
                                        </Button>
                                      </div>
                                  ) : (
                                      <div
                                          className="flex items-center justify-between px-2 py-2 cursor-pointer hover:bg-accent rounded-sm"
                                          onClick={() => handleToggleCategory(cat)}
                                      >
                                        <div className="flex items-center">
                                          <Check className={cn(
                                              "mr-2 h-4 w-4",
                                              categories.includes(cat) ? "opacity-100 text-primary" : "opacity-0"
                                          )} />
                                          <span>{cat}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <Button
                                              size="sm"
                                              variant="ghost"
                                              className="h-7 w-7 p-0 hover:bg-muted"
                                              onClick={(e) => handleStartEditCategory(cat, e)}
                                          >
                                            <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                                          </Button>
                                          <Button
                                              size="sm"
                                              variant="ghost"
                                              className="h-7 w-7 p-0 hover:bg-destructive/10"
                                              onClick={(e) => handleDeleteCategoryFromList(cat, e)}
                                          >
                                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                          </Button>
                                        </div>
                                      </div>
                                  )}
                                </div>
                            ))}
                          </div>
                      ) : (
                          <div className="py-6 text-center text-sm text-muted-foreground">
                            {categorySearch ? (
                                <p>No categories found. Click above to add "{categorySearch}"</p>
                            ) : (
                                <p>No categories available</p>
                            )}
                          </div>
                      )}
                    </div>
                  </Command>
                </PopoverContent>
              </Popover>

              {categories.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {categories.map((cat) => (
                        <Badge key={cat} variant="secondary" className="px-3 py-1 text-sm">
                          {cat}
                          <button type="button" onClick={() => handleRemoveCategory(cat)} className="ml-2 hover:text-destructive">
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                    ))}
                  </div>
              ) : (
                  <p className="text-sm text-muted-foreground">No categories selected</p>
              )}
            </div>

            {/* Price Range & Tax with Validation */}
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Min Price *</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                    <Input
                        type="number"
                        min="0"
                        value={formData.minPrice}
                        onChange={(e) => setFormData(prev => ({ ...prev, minPrice: Number(e.target.value) }))}
                        className={cn("pl-7", priceError && "border-destructive")}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Max Price *</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                    <Input
                        type="number"
                        min="0"
                        value={formData.maxPrice}
                        onChange={(e) => setFormData(prev => ({ ...prev, maxPrice: Number(e.target.value) }))}
                        className={cn("pl-7", priceError && "border-destructive")}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Tax Rate</Label>
                  <Select value={formData.taxPercentage} onValueChange={(v) => setFormData(prev => ({ ...prev, taxPercentage: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select tax" /></SelectTrigger>
                    <SelectContent>
                      {TAX_OPTIONS.map((tax) => (
                          <SelectItem key={tax.value} value={tax.value}>{tax.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Price Error Message */}
              {priceError && (
                  <div className="flex items-center gap-2 text-destructive text-sm">
                    <AlertCircle className="h-4 w-4" />
                    <span>{priceError}</span>
                  </div>
              )}
            </div>

            {/* Inventory Location */}
            <div className="space-y-2">
              <Label>Inventory Location</Label>
              <Input value={formData.inventoryLocation} onChange={(e) => setFormData(prev => ({ ...prev, inventoryLocation: e.target.value }))} placeholder="e.g., Warehouse A, Section B, Shelf 3" />
            </div>

            {/* Stock Quantity, Minimum Stock Level, and Minimum Order Level */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Stock Quantity</Label>
                <Input type="number" value={formData.stockQuantity} onChange={(e) => setFormData(prev => ({ ...prev, stockQuantity: Number(e.target.value) }))} />
              </div>
              <div className="space-y-2">
                <Label>Minimum Stock Level</Label>
                <Input type="number" value={formData.minStockLevel} onChange={(e) => setFormData(prev => ({ ...prev, minStockLevel: Number(e.target.value) }))} />
              </div>
              {/* NEW: Minimum Order Level Field */}
              <div className="space-y-2">
                <Label>Minimum Order Level</Label>
                <Input
                    type="number"
                    min="1"
                    value={formData.minOrderLevel}
                    onChange={(e) => setFormData(prev => ({ ...prev, minOrderLevel: Math.max(1, Number(e.target.value)) }))}
                    placeholder="e.g., 10"
                />
              </div>
            </div>

            {/* Template Fields */}
            {selectedTemplate && selectedTemplate.fields.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-4">
                    <h4 className="font-medium">Template Fields: {selectedTemplate.name}</h4>
                    {selectedTemplate.fields.map((field) => (
                        <div key={field.id} className="space-y-2">
                          {(field.type as string) !== 'boolean' && <Label>{field.name} {field.required && '*'}</Label>}
                          {renderTemplateFieldInput(field)}
                        </div>
                    ))}
                  </div>
                </>
            )}

            {/* Additional Custom Fields */}
            <Separator />
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Additional Custom Fields</h4>
                <Button type="button" variant="outline" size="sm" onClick={addCustomField}>
                  <Plus className="mr-2 h-4 w-4" />Add Field
                </Button>
              </div>
              {additionalFields.map((field, index) => (
                  <div key={field.id} className="flex gap-3 items-end">
                    <div className="flex-1 space-y-2">
                      <Label>Field Name</Label>
                      <Input value={field.name} onChange={(e) => updateAdditionalField(index, { name: e.target.value })} placeholder="Field name" />
                    </div>
                    <div className="w-32 space-y-2">
                      <Label>Type</Label>
                      <Select value={field.type} onValueChange={(v) => updateAdditionalField(index, { type: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="text">Text</SelectItem>
                          <SelectItem value="number">Number</SelectItem>
                          <SelectItem value="boolean">Checkbox</SelectItem>
                          <SelectItem value="color">Color</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex-1 space-y-2">
                      <Label>Value</Label>
                      {renderCustomFieldValueInput(field)}
                    </div>
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeAdditionalField(index)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={!isFormValid()}>
              {editProduct ? 'Save Changes' : 'Add Product'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
  );
}
import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, ChevronDown, ChevronUp, Palette } from 'lucide-react';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { ProductTemplate } from '@/types/inventory';

// Color palette options
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

// Color Picker Component
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
                  <span className="text-muted-foreground">Select default color...</span>
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
            {value && (
                <>
                  <Separator />
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-md border border-gray-300" style={{ backgroundColor: value }} />
                    <div>
                      <p className="text-sm font-medium">{selectedColor?.name || 'Custom Color'}</p>
                      <p className="text-xs text-muted-foreground">{value.toUpperCase()}</p>
                    </div>
                  </div>
                </>
            )}
          </div>
        </PopoverContent>
      </Popover>
  );
}

interface TemplateManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templates: ProductTemplate[];
  onSave: (template: Partial<ProductTemplate>) => void;
  onDelete: (id: string) => void;
  startInCreateMode?: boolean;
  onTemplateCreated?: (templateId: string) => void;
}

// Local interface to allow 'color' type and default value
interface LocalField {
  id: string;
  name: string;
  type: string;
  required?: boolean;
  options?: string[];
  defaultValue?: string;
}

export function TemplateManager({
                                  open,
                                  onOpenChange,
                                  templates,
                                  onSave,
                                  onDelete,
                                  startInCreateMode = false,
                                  onTemplateCreated,
                                }: TemplateManagerProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ProductTemplate | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [fields, setFields] = useState<LocalField[]>([]);

  useEffect(() => {
    if (open && startInCreateMode) {
      setIsCreating(true);
    }
  }, [open, startInCreateMode]);

  useEffect(() => {
    if (!open) {
      const timer = setTimeout(() => {
        resetForm();
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [open]);

  const resetForm = () => {
    setFormData({ name: '', description: '' });
    setFields([]);
    setIsCreating(false);
    setEditingTemplate(null);
  };

  const startEdit = (template: ProductTemplate) => {
    setEditingTemplate(template);
    setFormData({ name: template.name, description: template.description });
    // Cast fields to LocalField to allow color type
    setFields(template.fields.map(f => ({
      ...f,
      type: f.type as string,
      defaultValue: (f as LocalField).defaultValue || ''
    })));
    setIsCreating(true);
  };

  const addField = () => {
    const newField: LocalField = {
      id: `field-${Date.now()}`,
      name: '',
      type: 'text',
      required: false,
      defaultValue: '',
    };
    setFields([...fields, newField]);
  };

  const updateField = (index: number, updates: Partial<LocalField>) => {
    const updated = [...fields];
    updated[index] = { ...updated[index], ...updates };
    // Clear default value when type changes
    if (updates.type) {
      updated[index].defaultValue = '';
    }
    setFields(updated);
  };

  const removeField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    const templateId = editingTemplate?.id || `tpl-${Date.now()}`;
    const template = {
      id: templateId,
      name: formData.name,
      description: formData.description,
      fields: fields,
      createdAt: editingTemplate?.createdAt || new Date(),
    };
    onSave(template as Partial<ProductTemplate>);
    if (!editingTemplate && onTemplateCreated) {
      onTemplateCreated(templateId);
    }
    resetForm();
    if (startInCreateMode) {
      onOpenChange(false);
    }
  };

  const handleCancel = () => {
    if (startInCreateMode) {
      onOpenChange(false);
    } else {
      resetForm();
    }
  };

  const getFieldTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      text: 'Text',
      number: 'Number',
      select: 'Dropdown',
      boolean: 'Checkbox',
      date: 'Date',
      color: 'Color',
    };
    return labels[type] || type;
  };

  // Render default value input based on field type
  const renderDefaultValueInput = (field: LocalField, index: number) => {
    switch (field.type) {
      case 'color':
        return (
            <div className="flex-1 space-y-2">
              <Label>Default Color</Label>
              <ColorPicker
                  value={field.defaultValue || ''}
                  onChange={(color) => updateField(index, { defaultValue: color })}
              />
            </div>
        );
      case 'select':
        return (
            <div className="flex-1 space-y-2">
              <Label>Options (comma-separated)</Label>
              <Input
                  value={field.options?.join(', ') || ''}
                  onChange={(e) => updateField(index, { options: e.target.value.split(',').map((s) => s.trim()) })}
                  placeholder="Option 1, Option 2, Option 3"
              />
            </div>
        );
      default:
        return null;
    }
  };

  return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isCreating ? (editingTemplate ? 'Edit Template' : 'Create New Template') : 'Manage Product Templates'}
            </DialogTitle>
          </DialogHeader>

          {!isCreating ? (
              <div className="space-y-4">
                <Button onClick={() => setIsCreating(true)} className="w-full">
                  <Plus className="mr-2 h-4 w-4" />
                  Create New Template
                </Button>
                <div className="space-y-3">
                  {templates.map((template) => (
                      <Collapsible
                          key={template.id}
                          open={expandedId === template.id}
                          onOpenChange={(isOpen) => setExpandedId(isOpen ? template.id : null)}
                      >
                        <Card>
                          <CardHeader className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <CollapsibleTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    {expandedId === template.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                  </Button>
                                </CollapsibleTrigger>
                                <div>
                                  <CardTitle className="text-base">{template.name}</CardTitle>
                                  <p className="text-sm text-muted-foreground">{template.description}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary">{template.fields.length} fields</Badge>
                                <Button variant="ghost" size="icon" onClick={() => startEdit(template)}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => onDelete(template.id)}>
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </div>
                          </CardHeader>
                          <CollapsibleContent>
                            <CardContent className="pt-0 pb-4">
                              <div className="grid gap-2">
                                {template.fields.map((field) => {
                                  const fieldType = field.type as string;
                                  const localField = field as unknown as LocalField;
                                  return (
                                      <div key={field.id} className="flex items-center justify-between px-3 py-2 bg-muted/50 rounded-md">
                                        <div className="flex items-center gap-3">
                                          <span className="font-medium">{field.name}</span>
                                          {field.required && <Badge variant="outline" className="text-xs">Required</Badge>}
                                          {/* Show color preview if field has default color */}
                                          {fieldType === 'color' && localField.defaultValue && (
                                              <div
                                                  className="h-5 w-5 rounded border border-gray-300"
                                                  style={{ backgroundColor: localField.defaultValue }}
                                              />
                                          )}
                                        </div>
                                        <Badge variant="secondary">{getFieldTypeLabel(fieldType)}</Badge>
                                      </div>
                                  );
                                })}
                              </div>
                            </CardContent>
                          </CollapsibleContent>
                        </Card>
                      </Collapsible>
                  ))}
                </div>
              </div>
          ) : (
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="templateName">Template Name *</Label>
                    <Input
                        id="templateName"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g., Food & Beverages"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="templateDesc">Description</Label>
                    <Textarea
                        id="templateDesc"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Describe what this template is for"
                        rows={2}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Template Fields</h4>
                    <Button type="button" variant="outline" size="sm" onClick={addField}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Field
                    </Button>
                  </div>

                  {fields.length === 0 ? (
                      <p className="text-center text-muted-foreground py-4">No fields added yet. Click "Add Field" to start.</p>
                  ) : (
                      <div className="space-y-3">
                        {fields.map((field, index) => (
                            <div key={field.id} className="flex gap-3 items-end p-3 bg-muted/30 rounded-lg flex-wrap">
                              <div className="flex-1 min-w-[200px] space-y-2">
                                <Label>Field Name</Label>
                                <Input
                                    value={field.name}
                                    onChange={(e) => updateField(index, { name: e.target.value })}
                                    placeholder="Field name"
                                />
                              </div>
                              <div className="w-32 space-y-2">
                                <Label>Type</Label>
                                <Select value={field.type} onValueChange={(v) => updateField(index, { type: v })}>
                                  <SelectTrigger><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="text">Text</SelectItem>
                                    <SelectItem value="number">Number</SelectItem>
                                    <SelectItem value="select">Dropdown</SelectItem>
                                    <SelectItem value="boolean">Checkbox</SelectItem>
                                    <SelectItem value="date">Date</SelectItem>
                                    <SelectItem value="color">Color</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              {renderDefaultValueInput(field, index)}
                              <div className="flex items-center gap-2 pb-1">
                                <Checkbox
                                    id={`required-${index}`}
                                    checked={field.required}
                                    onCheckedChange={(checked) => updateField(index, { required: checked as boolean })}
                                />
                                <Label htmlFor={`required-${index}`} className="text-sm">Required</Label>
                              </div>
                              <Button type="button" variant="ghost" size="icon" onClick={() => removeField(index)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                        ))}
                      </div>
                  )}
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={handleCancel}>Cancel</Button>
                  <Button onClick={handleSubmit} disabled={!formData.name}>
                    {editingTemplate ? 'Save Changes' : 'Create Template'}
                  </Button>
                </DialogFooter>
              </div>
          )}
        </DialogContent>
      </Dialog>
  );
}
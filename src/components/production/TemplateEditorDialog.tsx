// =============================================================================
// TEMPLATE EDITOR DIALOG
// Dialog component for editing the single production template
// =============================================================================

import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
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
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import {
    Plus,
    Trash2,
    GripVertical,
    Save,
    RotateCcw,
    X,
    AlertCircle,
    Layers,
    FormInput,
} from 'lucide-react';

import {
    ProductionTemplate,
    StageTemplate,
    TemplateField,
    TemplateFieldType,
    generateId,
    getDefaultTemplate,
} from '@/types/production';

// =============================================================================
// TYPES
// =============================================================================

interface TemplateEditorDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    template: ProductionTemplate;
    onSave: (template: ProductionTemplate) => void;
    onReset: () => void;
}

const FIELD_TYPES: { value: TemplateFieldType; label: string }[] = [
    { value: 'text', label: 'Text' },
    { value: 'number', label: 'Number' },
    { value: 'textarea', label: 'Long Text' },
    { value: 'checkbox', label: 'Checkbox' },
    { value: 'select', label: 'Dropdown' },
];

// =============================================================================
// COMPONENT
// =============================================================================

export function TemplateEditorDialog({
                                         open,
                                         onOpenChange,
                                         template,
                                         onSave,
                                         onReset,
                                     }: TemplateEditorDialogProps) {
    const { toast } = useToast();

    // Local state for editing
    const [editedTemplate, setEditedTemplate] = useState<ProductionTemplate>(template);
    const [showResetConfirm, setShowResetConfirm] = useState(false);

    // Sync with prop when dialog opens
    useEffect(() => {
        if (open) {
            setEditedTemplate(template);
        }
    }, [open, template]);

    // ---------------------------------------------------------------------------
    // TEMPLATE HANDLERS
    // ---------------------------------------------------------------------------

    const handleNameChange = (name: string) => {
        setEditedTemplate((prev) => ({ ...prev, name }));
    };

    const handleDescriptionChange = (description: string) => {
        setEditedTemplate((prev) => ({ ...prev, description }));
    };

    // ---------------------------------------------------------------------------
    // STAGE HANDLERS
    // ---------------------------------------------------------------------------

    const handleAddStage = () => {
        const newStage: StageTemplate = {
            id: generateId(),
            stageName: `New Stage ${editedTemplate.stages.length + 1}`,
            description: '',
            order: editedTemplate.stages.length + 1,
            fields: [],
        };

        setEditedTemplate((prev) => ({
            ...prev,
            stages: [...prev.stages, newStage],
        }));
    };

    const handleRemoveStage = (stageId: string) => {
        setEditedTemplate((prev) => ({
            ...prev,
            stages: prev.stages
                .filter((s) => s.id !== stageId)
                .map((s, index) => ({ ...s, order: index + 1 })),
        }));
    };

    const handleStageNameChange = (stageId: string, stageName: string) => {
        setEditedTemplate((prev) => ({
            ...prev,
            stages: prev.stages.map((s) =>
                s.id === stageId ? { ...s, stageName } : s
            ),
        }));
    };

    const handleStageDescriptionChange = (stageId: string, description: string) => {
        setEditedTemplate((prev) => ({
            ...prev,
            stages: prev.stages.map((s) =>
                s.id === stageId ? { ...s, description } : s
            ),
        }));
    };

    // ---------------------------------------------------------------------------
    // FIELD HANDLERS
    // ---------------------------------------------------------------------------

    const handleAddField = (stageId: string) => {
        const newField: TemplateField = {
            id: generateId(),
            name: 'New Field',
            type: 'text',
            placeholder: '',
        };

        setEditedTemplate((prev) => ({
            ...prev,
            stages: prev.stages.map((s) =>
                s.id === stageId ? { ...s, fields: [...s.fields, newField] } : s
            ),
        }));
    };

    const handleRemoveField = (stageId: string, fieldId: string) => {
        setEditedTemplate((prev) => ({
            ...prev,
            stages: prev.stages.map((s) =>
                s.id === stageId
                    ? { ...s, fields: s.fields.filter((f) => f.id !== fieldId) }
                    : s
            ),
        }));
    };

    const handleFieldChange = (
        stageId: string,
        fieldId: string,
        key: keyof TemplateField,
        value: string
    ) => {
        setEditedTemplate((prev) => ({
            ...prev,
            stages: prev.stages.map((s) =>
                s.id === stageId
                    ? {
                        ...s,
                        fields: s.fields.map((f) =>
                            f.id === fieldId ? { ...f, [key]: value } : f
                        ),
                    }
                    : s
            ),
        }));
    };

    // ---------------------------------------------------------------------------
    // SAVE & RESET
    // ---------------------------------------------------------------------------

    const handleSave = () => {
        // Validation
        if (!editedTemplate.name.trim()) {
            toast({
                title: 'Validation Error',
                description: 'Template name is required.',
                variant: 'destructive',
            });
            return;
        }

        if (editedTemplate.stages.length === 0) {
            toast({
                title: 'Validation Error',
                description: 'At least one stage is required.',
                variant: 'destructive',
            });
            return;
        }

        // Check for empty stage names
        const emptyStage = editedTemplate.stages.find((s) => !s.stageName.trim());
        if (emptyStage) {
            toast({
                title: 'Validation Error',
                description: 'All stages must have a name.',
                variant: 'destructive',
            });
            return;
        }

        onSave(editedTemplate);
        toast({
            title: 'Template Saved',
            description: 'Your production template has been updated.',
        });
        onOpenChange(false);
    };

    const handleReset = () => {
        onReset();
        setEditedTemplate(getDefaultTemplate());
        setShowResetConfirm(false);
        toast({
            title: 'Template Reset',
            description: 'Template has been reset to default.',
        });
    };

    const handleCancel = () => {
        setEditedTemplate(template);
        onOpenChange(false);
    };

    // ===========================================================================
    // RENDER
    // ===========================================================================

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Layers className="h-5 w-5 text-blue-600" />
                            Edit Production Template
                        </DialogTitle>
                        <DialogDescription>
                            Customize your production workflow stages and fields. Changes will apply to all new orders.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto py-4 space-y-6">
                        {/* Template Info */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="template-name">Template Name</Label>
                                <Input
                                    id="template-name"
                                    value={editedTemplate.name}
                                    onChange={(e) => handleNameChange(e.target.value)}
                                    placeholder="Enter template name"
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label htmlFor="template-desc">Description (Optional)</Label>
                                <Input
                                    id="template-desc"
                                    value={editedTemplate.description || ''}
                                    onChange={(e) => handleDescriptionChange(e.target.value)}
                                    placeholder="Brief description"
                                    className="mt-1"
                                />
                            </div>
                        </div>

                        <Separator />

                        {/* Stages Section */}
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h3 className="font-semibold flex items-center gap-2">
                                        <Layers className="h-4 w-4" />
                                        Workflow Stages
                                    </h3>
                                    <p className="text-sm text-muted-foreground">
                                        {editedTemplate.stages.length} stage(s) configured
                                    </p>
                                </div>
                                <Button onClick={handleAddStage} size="sm">
                                    <Plus className="h-4 w-4 mr-1" />
                                    Add Stage
                                </Button>
                            </div>

                            {editedTemplate.stages.length === 0 ? (
                                <div className="text-center py-8 border-2 border-dashed rounded-lg">
                                    <AlertCircle className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
                                    <p className="text-muted-foreground">No stages defined</p>
                                    <p className="text-sm text-muted-foreground">Click "Add Stage" to create your first stage</p>
                                </div>
                            ) : (
                                <Accordion type="multiple" className="space-y-2">
                                    {editedTemplate.stages
                                        .sort((a, b) => a.order - b.order)
                                        .map((stage, index) => (
                                            <AccordionItem
                                                key={stage.id}
                                                value={stage.id}
                                                className="border rounded-lg px-4"
                                            >
                                                <AccordionTrigger className="hover:no-underline">
                                                    <div className="flex items-center gap-3 flex-1">
                                                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                                                        <Badge variant="outline" className="font-mono">
                                                            {String(index + 1).padStart(2, '0')}
                                                        </Badge>
                                                        <span className="font-medium">{stage.stageName}</span>
                                                        <Badge variant="secondary" className="ml-2">
                                                            {stage.fields.length} field(s)
                                                        </Badge>
                                                    </div>
                                                </AccordionTrigger>
                                                <AccordionContent className="pt-4 pb-6">
                                                    <div className="space-y-4">
                                                        {/* Stage Details */}
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                            <div>
                                                                <Label>Stage Name</Label>
                                                                <Input
                                                                    value={stage.stageName}
                                                                    onChange={(e) =>
                                                                        handleStageNameChange(stage.id, e.target.value)
                                                                    }
                                                                    placeholder="Stage name"
                                                                    className="mt-1"
                                                                />
                                                            </div>
                                                            <div>
                                                                <Label>Description (Optional)</Label>
                                                                <Input
                                                                    value={stage.description || ''}
                                                                    onChange={(e) =>
                                                                        handleStageDescriptionChange(stage.id, e.target.value)
                                                                    }
                                                                    placeholder="Stage description"
                                                                    className="mt-1"
                                                                />
                                                            </div>
                                                        </div>

                                                        <Separator />

                                                        {/* Fields Section */}
                                                        <div>
                                                            <div className="flex items-center justify-between mb-3">
                                                                <Label className="flex items-center gap-2">
                                                                    <FormInput className="h-4 w-4" />
                                                                    Fields
                                                                </Label>
                                                                <Button
                                                                    onClick={() => handleAddField(stage.id)}
                                                                    size="sm"
                                                                    variant="outline"
                                                                >
                                                                    <Plus className="h-3 w-3 mr-1" />
                                                                    Add Field
                                                                </Button>
                                                            </div>

                                                            {stage.fields.length === 0 ? (
                                                                <p className="text-sm text-muted-foreground text-center py-4 border border-dashed rounded">
                                                                    No fields. Click "Add Field" to add input fields.
                                                                </p>
                                                            ) : (
                                                                <div className="space-y-3">
                                                                    {stage.fields.map((field) => (
                                                                        <div
                                                                            key={field.id}
                                                                            className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border"
                                                                        >
                                                                            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 flex-1">
                                                                                <div>
                                                                                    <Label className="text-xs">Field Name</Label>
                                                                                    <Input
                                                                                        value={field.name}
                                                                                        onChange={(e) =>
                                                                                            handleFieldChange(
                                                                                                stage.id,
                                                                                                field.id,
                                                                                                'name',
                                                                                                e.target.value
                                                                                            )
                                                                                        }
                                                                                        placeholder="Field name"
                                                                                        className="mt-1 h-8"
                                                                                    />
                                                                                </div>
                                                                                <div>
                                                                                    <Label className="text-xs">Type</Label>
                                                                                    <Select
                                                                                        value={field.type}
                                                                                        onValueChange={(value) =>
                                                                                            handleFieldChange(
                                                                                                stage.id,
                                                                                                field.id,
                                                                                                'type',
                                                                                                value
                                                                                            )
                                                                                        }
                                                                                    >
                                                                                        <SelectTrigger className="mt-1 h-8">
                                                                                            <SelectValue />
                                                                                        </SelectTrigger>
                                                                                        <SelectContent>
                                                                                            {FIELD_TYPES.map((type) => (
                                                                                                <SelectItem
                                                                                                    key={type.value}
                                                                                                    value={type.value}
                                                                                                >
                                                                                                    {type.label}
                                                                                                </SelectItem>
                                                                                            ))}
                                                                                        </SelectContent>
                                                                                    </Select>
                                                                                </div>
                                                                                <div>
                                                                                    <Label className="text-xs">Unit (Optional)</Label>
                                                                                    <Input
                                                                                        value={field.unit || ''}
                                                                                        onChange={(e) =>
                                                                                            handleFieldChange(
                                                                                                stage.id,
                                                                                                field.id,
                                                                                                'unit',
                                                                                                e.target.value
                                                                                            )
                                                                                        }
                                                                                        placeholder="e.g., cm, kg, %"
                                                                                        className="mt-1 h-8"
                                                                                    />
                                                                                </div>
                                                                                <div>
                                                                                    <Label className="text-xs">Placeholder</Label>
                                                                                    <Input
                                                                                        value={field.placeholder || ''}
                                                                                        onChange={(e) =>
                                                                                            handleFieldChange(
                                                                                                stage.id,
                                                                                                field.id,
                                                                                                'placeholder',
                                                                                                e.target.value
                                                                                            )
                                                                                        }
                                                                                        placeholder="Placeholder text"
                                                                                        className="mt-1 h-8"
                                                                                    />
                                                                                </div>
                                                                            </div>
                                                                            <Button
                                                                                variant="ghost"
                                                                                size="sm"
                                                                                onClick={() =>
                                                                                    handleRemoveField(stage.id, field.id)
                                                                                }
                                                                                className="text-red-500 hover:text-red-700 hover:bg-red-50 mt-5"
                                                                            >
                                                                                <X className="h-4 w-4" />
                                                                            </Button>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Delete Stage Button */}
                                                        <div className="pt-2">
                                                            <Button
                                                                variant="destructive"
                                                                size="sm"
                                                                onClick={() => handleRemoveStage(stage.id)}
                                                            >
                                                                <Trash2 className="h-4 w-4 mr-1" />
                                                                Delete Stage
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </AccordionContent>
                                            </AccordionItem>
                                        ))}
                                </Accordion>
                            )}
                        </div>
                    </div>

                    <DialogFooter className="border-t pt-4 flex-shrink-0">
                        <div className="flex items-center justify-between w-full">
                            <Button
                                variant="outline"
                                onClick={() => setShowResetConfirm(true)}
                                className="text-amber-600 border-amber-300 hover:bg-amber-50"
                            >
                                <RotateCcw className="h-4 w-4 mr-1" />
                                Reset to Default
                            </Button>
                            <div className="flex gap-2">
                                <Button variant="outline" onClick={handleCancel}>
                                    Cancel
                                </Button>
                                <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
                                    <Save className="h-4 w-4 mr-1" />
                                    Save Template
                                </Button>
                            </div>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Reset Confirmation Dialog */}
            <Dialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-amber-600">
                            <AlertCircle className="h-5 w-5" />
                            Reset Template?
                        </DialogTitle>
                        <DialogDescription>
                            This will reset the template to the default 8 stages. All your customizations will be lost. This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowResetConfirm(false)}>
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleReset}
                        >
                            <RotateCcw className="h-4 w-4 mr-1" />
                            Reset Template
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

export default TemplateEditorDialog;
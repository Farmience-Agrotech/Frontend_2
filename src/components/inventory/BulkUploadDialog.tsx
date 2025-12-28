import { useState } from 'react';
import { Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { ProductTemplate } from '@/types/inventory';

interface BulkUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templates: ProductTemplate[];
  onUpload: (data: Record<string, unknown>[], templateId?: string) => void;
}

export function BulkUploadDialog({
                                   open,
                                   onOpenChange,
                                   templates,
                                   onUpload,
                                 }: BulkUploadDialogProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'processing' | 'success' | 'error'>(
      'idle'
  );
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [previewData, setPreviewData] = useState<Record<string, string>[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setUploadStatus('idle');
      setErrorMessage('');
      // Simulate parsing preview
      parseCSVPreview(selectedFile);
    }
  };

  const parseCSVPreview = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter((line) => line.trim());
      if (lines.length > 0) {
        const headers = lines[0].split(',').map((h) => h.trim().replace(/"/g, ''));
        const preview: Record<string, string>[] = [];
        for (let i = 1; i < Math.min(lines.length, 4); i++) {
          const values = lines[i].split(',').map((v) => v.trim().replace(/"/g, ''));
          const row: Record<string, string> = {};
          headers.forEach((header, index) => {
            row[header] = values[index] || '';
          });
          preview.push(row);
        }
        setPreviewData(preview);
      }
    };
    reader.readAsText(file);
  };

  const downloadTemplate = () => {
    const template = templates.find((t) => t.id === selectedTemplate);
    // NEW: Added minOrderLevel to base headers
    const baseHeaders = ['sku', 'name', 'description', 'category', 'stockQuantity', 'minStockLevel', 'minOrderLevel', 'unit'];
    const customHeaders = template?.fields.map((f) => f.name) || [];
    const allHeaders = [...baseHeaders, ...customHeaders];

    // NEW: Added minOrderLevel example value (10)
    const csvContent = allHeaders.join(',') + '\n' +
        'EXAMPLE-SKU-001,Product Name,Product description,Category Name,100,20,10,units' +
        (customHeaders.length > 0 ? ',' + customHeaders.map(() => 'value').join(',') : '');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory-template${template ? `-${template.name.toLowerCase().replace(/\s+/g, '-')}` : ''}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploadStatus('processing');
    setProgress(0);

    // Simulate upload progress
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 10;
      });
    }, 200);

    // Simulate processing
    setTimeout(() => {
      clearInterval(interval);
      setProgress(100);
      setUploadStatus('success');

      // Mock parsed data
      const mockData = previewData.map((row, index) => ({
        ...row,
        id: `bulk-${Date.now()}-${index}`,
      }));

      onUpload(mockData, selectedTemplate || undefined);
    }, 2500);
  };

  const resetState = () => {
    setFile(null);
    setUploadStatus('idle');
    setProgress(0);
    setErrorMessage('');
    setPreviewData([]);
  };

  return (
      <Dialog
          open={open}
          onOpenChange={(open) => {
            if (!open) resetState();
            onOpenChange(open);
          }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Bulk Upload Products</DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Template Selection */}
            <div className="space-y-2">
              <Label>Product Template (Optional)</Label>
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger>
                  <SelectValue placeholder="Select template for field mapping" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Template (Basic Fields Only)</SelectItem>
                  {templates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Download Template */}
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="h-8 w-8 text-muted-foreground" />
                <div>
                  <p className="font-medium">Download CSV Template</p>
                  <p className="text-sm text-muted-foreground">
                    Get a pre-formatted template with all required columns (includes MOQ field)
                  </p>
                </div>
              </div>
              <Button variant="outline" onClick={downloadTemplate}>
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
            </div>

            {/* File Upload */}
            <div className="space-y-2">
              <Label>Upload CSV File</Label>
              <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                      file ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                  }`}
              >
                <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    className="hidden"
                    id="csv-upload"
                />
                <label htmlFor="csv-upload" className="cursor-pointer">
                  <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                  {file ? (
                      <div>
                        <p className="font-medium">{file.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {(file.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                  ) : (
                      <div>
                        <p className="font-medium">Click to upload or drag and drop</p>
                        <p className="text-sm text-muted-foreground">CSV files only</p>
                      </div>
                  )}
                </label>
              </div>
            </div>

            {/* Preview */}
            {previewData.length > 0 && uploadStatus === 'idle' && (
                <div className="space-y-2">
                  <Label>Preview (first 3 rows)</Label>
                  <div className="overflow-x-auto rounded-lg border border-border">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                      <tr>
                        {Object.keys(previewData[0]).map((header) => (
                            <th key={header} className="px-3 py-2 text-left font-medium">
                              {header}
                            </th>
                        ))}
                      </tr>
                      </thead>
                      <tbody>
                      {previewData.map((row, i) => (
                          <tr key={i} className="border-t border-border">
                            {Object.values(row).map((value, j) => (
                                <td key={j} className="px-3 py-2">
                                  {value}
                                </td>
                            ))}
                          </tr>
                      ))}
                      </tbody>
                    </table>
                  </div>
                </div>
            )}

            {/* Upload Progress */}
            {uploadStatus === 'processing' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Processing...</span>
                    <span>{progress}%</span>
                  </div>
                  <Progress value={progress} />
                </div>
            )}

            {/* Success Message */}
            {uploadStatus === 'success' && (
                <Alert className="border-success bg-success/10">
                  <CheckCircle className="h-4 w-4 text-success" />
                  <AlertDescription>
                    Successfully processed {previewData.length} products. They have been added to your
                    inventory.
                  </AlertDescription>
                </Alert>
            )}

            {/* Error Message */}
            {uploadStatus === 'error' && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{errorMessage}</AlertDescription>
                </Alert>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {uploadStatus === 'success' ? 'Close' : 'Cancel'}
            </Button>
            {uploadStatus !== 'success' && (
                <Button onClick={handleUpload} disabled={!file || uploadStatus === 'processing'}>
                  {uploadStatus === 'processing' ? 'Processing...' : 'Upload Products'}
                </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
  );
}
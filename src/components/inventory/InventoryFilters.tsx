import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface InventoryFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  category: string;
  onCategoryChange: (value: string) => void;
  stockStatus: string;
  onStockStatusChange: (value: string) => void;
  categories: string[];
  onClearFilters: () => void;
}

export function InventoryFilters({
  search,
  onSearchChange,
  category,
  onCategoryChange,
  stockStatus,
  onStockStatusChange,
  categories,
  onClearFilters,
}: InventoryFiltersProps) {
  const hasFilters = search || category !== 'all' || stockStatus !== 'all';

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by SKU, name, or description..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      <Select value={category} onValueChange={onCategoryChange}>
        <SelectTrigger className="w-full sm:w-48">
          <SelectValue placeholder="Category" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Categories</SelectItem>
          {categories.map((cat) => (
            <SelectItem key={cat} value={cat}>
              {cat}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={stockStatus} onValueChange={onStockStatusChange}>
        <SelectTrigger className="w-full sm:w-40">
          <SelectValue placeholder="Stock Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Status</SelectItem>
          <SelectItem value="in-stock">In Stock</SelectItem>
          <SelectItem value="low-stock">Low Stock</SelectItem>
          <SelectItem value="out-of-stock">Out of Stock</SelectItem>
        </SelectContent>
      </Select>

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={onClearFilters} className="gap-2">
          <X className="h-4 w-4" />
          Clear
        </Button>
      )}
    </div>
  );
}

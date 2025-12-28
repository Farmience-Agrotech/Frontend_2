import { useNavigate } from 'react-router-dom';
import { MoreHorizontal, Eye, Edit, Trash2, Copy, Package } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { StockBadge } from './StockBadge';
import { Product } from '@/types/inventory';
import { usePermissions } from '@/hooks/usePermissions';

interface ProductsTableProps {
  products: Product[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  onEdit: (product: Product) => void;
  onDelete: (id: string) => void;
  showCheckboxes?: boolean;
}

export function ProductsTable({
                                products,
                                selectedIds,
                                onSelectionChange,
                                onEdit,
                                onDelete,
                                showCheckboxes = true,
                              }: ProductsTableProps) {
  const navigate = useNavigate();
  const { canEdit, canDelete } = usePermissions();

  const showEditAction = canEdit('inventory');
  const showDeleteAction = canDelete('inventory');
  const hasAnyAction = showEditAction || showDeleteAction;

  const toggleAll = () => {
    if (selectedIds.length === products.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(products.map((p) => p.id));
    }
  };

  const toggleOne = (id: string) => {
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter((i) => i !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  };

  // Get product image - check for images array
  const getProductImage = (product: Product): string | null => {
    if (product.images && product.images.length > 0) {
      return product.images[0];
    }
    return null;
  };

  return (
      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {showCheckboxes && (
                  <TableHead className="w-12">
                    <Checkbox
                        checked={selectedIds.length === products.length && products.length > 0}
                        onCheckedChange={toggleAll}
                    />
                  </TableHead>
              )}
              <TableHead className="w-16">Image</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Product Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Stock</TableHead>
              <TableHead>Status</TableHead>
              {hasAnyAction && <TableHead className="w-12"></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={showCheckboxes ? (hasAnyAction ? 8 : 7) : (hasAnyAction ? 7 : 6)} className="h-32 text-center text-muted-foreground">
                    No products found
                  </TableCell>
                </TableRow>
            ) : (
                products.map((product) => {
                  const productImage = getProductImage(product);

                  return (
                      <TableRow
                          key={product.id}
                          className="cursor-pointer"
                          onClick={() => navigate(`/inventory/${product.id}`)}
                      >
                        {showCheckboxes && (
                            <TableCell onClick={(e) => e.stopPropagation()}>
                              <Checkbox
                                  checked={selectedIds.includes(product.id)}
                                  onCheckedChange={() => toggleOne(product.id)}
                              />
                            </TableCell>
                        )}
                        {/* Product Image */}
                        <TableCell>
                          <div className="h-12 w-12 rounded-lg border bg-gray-50 overflow-hidden flex items-center justify-center">
                            {productImage ? (
                                <img
                                    src={productImage}
                                    alt={product.name}
                                    className="h-full w-full object-cover"
                                />
                            ) : (
                                <Package className="h-6 w-6 text-muted-foreground" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{product.sku}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{product.name}</p>
                            <p className="text-xs text-muted-foreground line-clamp-1">
                              {product.description}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>{product.category}</TableCell>
                        <TableCell className="text-right font-medium">
                          {product.stockQuantity.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <StockBadge quantity={product.stockQuantity} minLevel={product.minStockLevel} />
                        </TableCell>
                        {hasAnyAction && (
                            <TableCell onClick={(e) => e.stopPropagation()}>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => navigate(`/inventory/${product.id}`)}>
                                    <Eye className="mr-2 h-4 w-4" />
                                    View Details
                                  </DropdownMenuItem>
                                  {showEditAction && (
                                      <>
                                        <DropdownMenuItem onClick={() => onEdit(product)}>
                                          <Edit className="mr-2 h-4 w-4" />
                                          Edit
                                        </DropdownMenuItem>
                                        <DropdownMenuItem>
                                          <Copy className="mr-2 h-4 w-4" />
                                          Duplicate
                                        </DropdownMenuItem>
                                      </>
                                  )}
                                  {showDeleteAction && (
                                      <>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                            className="text-destructive"
                                            onClick={() => onDelete(product.id)}
                                        >
                                          <Trash2 className="mr-2 h-4 w-4" />
                                          Delete
                                        </DropdownMenuItem>
                                      </>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                        )}
                      </TableRow>
                  );
                })
            )}
          </TableBody>
        </Table>
      </div>
  );
}
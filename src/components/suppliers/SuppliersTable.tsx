import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { MoreHorizontal, Eye, Edit, Ban, Power } from 'lucide-react';
import { Supplier } from '@/types/supplier';
import { SupplierStatusBadge } from './SupplierStatusBadge';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';

interface SuppliersTableProps {
  suppliers: Supplier[];
  selectedSuppliers: string[];
  onSelectionChange: (ids: string[]) => void;
  onEdit: (supplier: Supplier) => void;
  onDeactivate: (supplier: Supplier) => void;
  onBlacklist: (supplier: Supplier) => void;
}

export const SuppliersTable = ({
  suppliers,
  selectedSuppliers,
  onSelectionChange,
  onEdit,
  onDeactivate,
  onBlacklist,
}: SuppliersTableProps) => {
  const navigate = useNavigate();

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange(suppliers.map((s) => s.id));
    } else {
      onSelectionChange([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedSuppliers, id]);
    } else {
      onSelectionChange(selectedSuppliers.filter((sid) => sid !== id));
    }
  };

  const isAllSelected = suppliers.length > 0 && selectedSuppliers.length === suppliers.length;
  const isSomeSelected = selectedSuppliers.length > 0 && selectedSuppliers.length < suppliers.length;

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="w-12">
              <Checkbox
                checked={isAllSelected}
                onCheckedChange={handleSelectAll}
                aria-label="Select all"
                className={isSomeSelected ? 'opacity-50' : ''}
              />
            </TableHead>
            <TableHead>Supplier ID</TableHead>
            <TableHead>Company Name</TableHead>
            <TableHead>Contact Person</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>Categories</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Registered</TableHead>
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {suppliers.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                No suppliers found
              </TableCell>
            </TableRow>
          ) : (
            suppliers.map((supplier) => (
              <TableRow
                key={supplier.id}
                className="cursor-pointer hover:bg-muted/30"
                onClick={() => navigate(`/suppliers/${supplier.id}`)}
              >
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selectedSuppliers.includes(supplier.id)}
                    onCheckedChange={(checked) => handleSelectOne(supplier.id, !!checked)}
                    aria-label={`Select ${supplier.companyName}`}
                  />
                </TableCell>
                <TableCell className="font-mono text-sm">{supplier.id}</TableCell>
                <TableCell className="font-medium">{supplier.companyName}</TableCell>
                <TableCell>{supplier.contactPerson}</TableCell>
                <TableCell>
                  <div className="text-sm">
                    <div>{supplier.phone}</div>
                    <div className="text-muted-foreground">{supplier.email}</div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1 max-w-[200px]">
                    {supplier.productCategories.slice(0, 2).map((cat) => (
                      <Badge key={cat} variant="secondary" className="text-xs">
                        {cat}
                      </Badge>
                    ))}
                    {supplier.productCategories.length > 2 && (
                      <Badge variant="secondary" className="text-xs">
                        +{supplier.productCategories.length - 2}
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <SupplierStatusBadge status={supplier.status} />
                </TableCell>
                <TableCell>{format(new Date(supplier.registrationDate), 'MMM dd, yyyy')}</TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => navigate(`/suppliers/${supplier.id}`)}>
                        <Eye className="mr-2 h-4 w-4" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onEdit(supplier)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {supplier.status !== 'inactive' && supplier.status !== 'blacklisted' && (
                        <DropdownMenuItem onClick={() => onDeactivate(supplier)}>
                          <Power className="mr-2 h-4 w-4" />
                          Deactivate
                        </DropdownMenuItem>
                      )}
                      {supplier.status !== 'blacklisted' && (
                        <DropdownMenuItem
                          onClick={() => onBlacklist(supplier)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Ban className="mr-2 h-4 w-4" />
                          Blacklist
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};

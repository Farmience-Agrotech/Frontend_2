import { useNavigate } from "react-router-dom";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Eye, Edit, Ban } from "lucide-react";
import { Customer, BUSINESS_TYPES } from "@/types/customer";
import CustomerStatusBadge from "./CustomerStatusBadge";

interface CustomersTableProps {
  customers: Customer[];
  selectedCustomers: string[];
  onSelectCustomer: (id: string) => void;
  onSelectAll: () => void;
  onEdit: (customer: Customer) => void;
  onBlock: (customer: Customer) => void;
}

const CustomersTable = ({
  customers,
  selectedCustomers,
  onSelectCustomer,
  onSelectAll,
  onEdit,
  onBlock,
}: CustomersTableProps) => {
  const navigate = useNavigate();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="w-12">
              <Checkbox
                checked={selectedCustomers.length === customers.length && customers.length > 0}
                onCheckedChange={onSelectAll}
              />
            </TableHead>
            <TableHead>Customer ID</TableHead>
            <TableHead>Company Name</TableHead>
            <TableHead>Contact Person</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>City</TableHead>
            <TableHead className="text-right">Orders</TableHead>
            <TableHead className="text-right">Business Value</TableHead>
            <TableHead className="text-right">Credit Limit</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {customers.map((customer) => (
            <TableRow
              key={customer.id}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => navigate(`/customers/${customer.id}`)}
            >
              <TableCell onClick={(e) => e.stopPropagation()}>
                <Checkbox
                  checked={selectedCustomers.includes(customer.id)}
                  onCheckedChange={() => onSelectCustomer(customer.id)}
                />
              </TableCell>
              <TableCell className="font-mono text-sm">{customer.id}</TableCell>
              <TableCell>
                <div>
                  <p className="font-medium">{customer.businessName}</p>
                  <p className="text-xs text-muted-foreground">
                    {BUSINESS_TYPES[customer.businessType]}
                  </p>
                </div>
              </TableCell>
              <TableCell>{customer.contactPerson}</TableCell>
              <TableCell className="text-sm">{customer.primaryPhone}</TableCell>
              <TableCell>{customer.billingAddress.city}</TableCell>
              <TableCell className="text-right">{customer.totalOrders}</TableCell>
              <TableCell className="text-right font-medium">
                {formatCurrency(customer.totalBusinessValue)}
              </TableCell>
              <TableCell className="text-right">
                {formatCurrency(customer.creditLimit)}
              </TableCell>
              <TableCell>
                <CustomerStatusBadge status={customer.status} />
              </TableCell>
              <TableCell onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => navigate(`/customers/${customer.id}`)}>
                      <Eye className="mr-2 h-4 w-4" />
                      View Details
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onEdit(customer)}>
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onBlock(customer)}
                      className="text-destructive"
                    >
                      <Ban className="mr-2 h-4 w-4" />
                      {customer.status === "blocked" ? "Unblock" : "Block"}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default CustomersTable;

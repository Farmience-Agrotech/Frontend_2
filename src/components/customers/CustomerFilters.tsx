import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";
import { CustomerStatus, CUSTOMER_STATUS_CONFIG, INDIAN_STATES } from "@/types/customer";

interface CustomerFiltersProps {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  statusFilter: string;
  setStatusFilter: (value: string) => void;
  cityFilter: string;
  setCityFilter: (value: string) => void;
  onClearFilters: () => void;
}

const CustomerFilters = ({
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
  cityFilter,
  setCityFilter,
  onClearFilters,
}: CustomerFiltersProps) => {
  const hasActiveFilters = searchTerm || statusFilter !== "all" || cityFilter !== "all";

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, ID, phone, email, city..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>
      
      <Select value={statusFilter} onValueChange={setStatusFilter}>
        <SelectTrigger className="w-full sm:w-[180px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Statuses</SelectItem>
          {Object.entries(CUSTOMER_STATUS_CONFIG).map(([key, config]) => (
            <SelectItem key={key} value={key}>
              {config.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={cityFilter} onValueChange={setCityFilter}>
        <SelectTrigger className="w-full sm:w-[180px]">
          <SelectValue placeholder="State" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All States</SelectItem>
          {INDIAN_STATES.map((state) => (
            <SelectItem key={state} value={state}>
              {state}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasActiveFilters && (
        <Button variant="ghost" size="icon" onClick={onClearFilters}>
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
};

export default CustomerFilters;

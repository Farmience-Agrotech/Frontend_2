import { useState } from 'react';
import { Search, Filter, X, Calendar } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
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
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { OrderStatus, ORDER_STATUS_CONFIG } from '@/types/order';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { DateRange } from 'react-day-picker';

interface OrderFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: OrderStatus | 'all';
  onStatusChange: (status: OrderStatus | 'all') => void;
  dateRange: DateRange | undefined;
  onDateRangeChange: (range: DateRange | undefined) => void;
  amountFilter: string;
  onAmountChange: (amount: string) => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
}

export function OrderFilters({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusChange,
  dateRange,
  onDateRangeChange,
  amountFilter,
  onAmountChange,
  onClearFilters,
  hasActiveFilters,
}: OrderFiltersProps) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
        {/* Search */}
        <div className="relative w-full sm:w-64 lg:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search orders, customers..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Status Filter */}
        <Select value={statusFilter} onValueChange={(value) => onStatusChange(value as OrderStatus | 'all')}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {Object.entries(ORDER_STATUS_CONFIG).map(([key, config]) => (
              <SelectItem key={key} value={key}>
                {config.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Date Range */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn('w-full sm:w-56 justify-start text-left font-normal', !dateRange && 'text-muted-foreground')}>
              <Calendar className="mr-2 h-4 w-4" />
              {dateRange?.from ? (
                dateRange.to ? (
                  <>
                    {format(dateRange.from, 'LLL dd')} - {format(dateRange.to, 'LLL dd')}
                  </>
                ) : (
                  format(dateRange.from, 'LLL dd, y')
                )
              ) : (
                <span>Pick a date range</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <CalendarComponent
              initialFocus
              mode="range"
              defaultMonth={dateRange?.from}
              selected={dateRange}
              onSelect={onDateRangeChange}
              numberOfMonths={2}
              className="pointer-events-auto"
            />
          </PopoverContent>
        </Popover>

        {/* Amount Filter */}
        <Select value={amountFilter} onValueChange={onAmountChange}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Any Amount" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any Amount</SelectItem>
            <SelectItem value="0-10000">Under ₹10K</SelectItem>
            <SelectItem value="10000-50000">₹10K - ₹50K</SelectItem>
            <SelectItem value="50000-100000">₹50K - ₹1L</SelectItem>
            <SelectItem value="100000+">Above ₹1L</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={onClearFilters} className="text-muted-foreground">
          <X className="mr-2 h-4 w-4" />
          Clear Filters
        </Button>
      )}
    </div>
  );
}
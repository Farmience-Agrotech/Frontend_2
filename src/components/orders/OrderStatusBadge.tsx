import { OrderStatus, ORDER_STATUS_CONFIG } from '@/types/order';
import { cn } from '@/lib/utils';

interface OrderStatusBadgeProps {
  status: OrderStatus | string;
  className?: string;
}

// Default config for unknown statuses
const DEFAULT_CONFIG = {
  label: 'Unknown',
  bgColor: 'bg-gray-100',
  color: 'text-gray-800',
};

export function OrderStatusBadge({ status, className }: OrderStatusBadgeProps) {
  // Convert to lowercase to handle AWS uppercase statuses (PENDING -> pending)
  const normalizedStatus = (status || '').toLowerCase() as OrderStatus;
  const config = ORDER_STATUS_CONFIG[normalizedStatus] || DEFAULT_CONFIG;

  return (
      <span
          className={cn(
              'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
              config.bgColor,
              config.color,
              className
          )}
      >
      {config.label}
    </span>
  );
}
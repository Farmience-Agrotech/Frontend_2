import { Badge } from '@/components/ui/badge';
import { getStockStatus } from '@/types/inventory';

interface StockBadgeProps {
  quantity: number;
  minLevel: number;
}

export function StockBadge({ quantity, minLevel }: StockBadgeProps) {
  const status = getStockStatus(quantity, minLevel);

  return (
    <Badge className={status.color}>
      {status.label}
    </Badge>
  );
}

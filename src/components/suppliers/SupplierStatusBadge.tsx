import { Badge } from '@/components/ui/badge';
import { SupplierStatus, SUPPLIER_STATUS_CONFIG } from '@/types/supplier';

interface SupplierStatusBadgeProps {
  status: SupplierStatus;
}

export const SupplierStatusBadge = ({ status }: SupplierStatusBadgeProps) => {
  const config = SUPPLIER_STATUS_CONFIG[status];

  return (
    <Badge variant="outline" className={`${config.color} font-medium`}>
      {config.label}
    </Badge>
  );
};

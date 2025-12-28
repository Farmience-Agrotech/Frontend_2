import { Badge } from "@/components/ui/badge";
import { CustomerStatus, CUSTOMER_STATUS_CONFIG } from "@/types/customer";

interface CustomerStatusBadgeProps {
  status: CustomerStatus;
}

const CustomerStatusBadge = ({ status }: CustomerStatusBadgeProps) => {
  const config = CUSTOMER_STATUS_CONFIG[status];
  
  return (
    <Badge className={`${config.color} border-0`}>
      {config.label}
    </Badge>
  );
};

export default CustomerStatusBadge;

import { Card, CardContent } from '@/components/ui/card';
import { Building2, CheckCircle, Clock, Ban } from 'lucide-react';

interface SupplierStatsProps {
  stats: {
    total: number;
    active: number;
    pending: number;
    inactive: number;
    blacklisted: number;
  };
}

export const SupplierStats = ({ stats }: SupplierStatsProps) => {
  const statCards = [
    {
      title: 'Total Suppliers',
      value: stats.total,
      icon: Building2,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: 'Active Suppliers',
      value: stats.active,
      icon: CheckCircle,
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
    {
      title: 'Pending Approval',
      value: stats.pending,
      icon: Clock,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
    },
    {
      title: 'Inactive / Blacklisted',
      value: stats.inactive + stats.blacklisted,
      icon: Ban,
      color: 'text-destructive',
      bgColor: 'bg-destructive/10',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {statCards.map((stat) => (
        <Card key={stat.title}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{stat.title}</p>
                <p className="text-2xl font-bold mt-1">{stat.value}</p>
              </div>
              <div className={`p-3 rounded-full ${stat.bgColor}`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

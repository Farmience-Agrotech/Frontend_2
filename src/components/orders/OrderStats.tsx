import { Package, Clock, Truck, CheckCircle, IndianRupee } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface OrderStatsProps {
  stats: {
    total: number;
    pending: number;
    processing: number;
    shipped: number;
    completed: number;
    totalValue: number;
  };
}

export function OrderStats({ stats }: OrderStatsProps) {
  const formatCurrency = (amount: number) => {
    if (amount >= 10000000) {
      return `₹${(amount / 10000000).toFixed(1)}Cr`;
    } else if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(1)}L`;
    } else if (amount >= 1000) {
      return `₹${(amount / 1000).toFixed(1)}K`;
    }
    return `₹${amount}`;
  };

  const statCards = [
    {
      title: 'Total Orders',
      value: stats.total,
      icon: Package,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: 'Pending',
      value: stats.pending,
      icon: Clock,
      color: 'text-amber-600',
      bgColor: 'bg-amber-100',
    },
    {
      title: 'Processing',
      value: stats.processing,
      icon: Package,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Shipped',
      value: stats.shipped,
      icon: Truck,
      color: 'text-cyan-600',
      bgColor: 'bg-cyan-100',
    },
    {
      title: 'Completed',
      value: stats.completed,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: 'Total Value',
      value: formatCurrency(stats.totalValue),
      icon: IndianRupee,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100',
      isValue: true,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {statCards.map((stat) => (
        <Card key={stat.title} className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{stat.title}</p>
                <p className={`text-xl font-bold ${stat.isValue ? stat.color : 'text-foreground'}`}>
                  {stat.value}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
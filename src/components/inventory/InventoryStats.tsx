import { Package, PackageCheck, PackageX, AlertTriangle, Layers, FolderOpen } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface InventoryStatsProps {
  stats: {
    totalProducts: number;
    inStock: number;
    lowStock: number;
    outOfStock: number;
    totalTemplates: number;
    categories: number;
  };
}

export function InventoryStats({ stats }: InventoryStatsProps) {
  const statItems = [
    {
      label: 'Total Products',
      value: stats.totalProducts,
      icon: Package,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      label: 'In Stock',
      value: stats.inStock,
      icon: PackageCheck,
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
    {
      label: 'Low Stock',
      value: stats.lowStock,
      icon: AlertTriangle,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
    },
    {
      label: 'Out of Stock',
      value: stats.outOfStock,
      icon: PackageX,
      color: 'text-destructive',
      bgColor: 'bg-destructive/10',
    },
    {
      label: 'Templates',
      value: stats.totalTemplates,
      icon: Layers,
      color: 'text-info',
      bgColor: 'bg-info/10',
    },
    {
      label: 'Categories',
      value: stats.categories,
      icon: FolderOpen,
      color: 'text-muted-foreground',
      bgColor: 'bg-muted',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {statItems.map((stat) => (
        <Card key={stat.label} className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

import { Card, CardContent } from "@/components/ui/card";
import { Users, UserCheck, UserPlus, UserX } from "lucide-react";

interface CustomerStatsProps {
  stats: {
    total: number;
    active: number;
    newThisMonth: number;
    blockedInactive: number;
  };
}

const CustomerStats = ({ stats }: CustomerStatsProps) => {
  const statCards = [
    {
      title: "Total Customers",
      value: stats.total,
      icon: Users,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Active Customers",
      value: stats.active,
      icon: UserCheck,
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
      title: "New This Month",
      value: stats.newThisMonth,
      icon: UserPlus,
      color: "text-info",
      bgColor: "bg-info/10",
    },
    {
      title: "Blocked/Inactive",
      value: stats.blockedInactive,
      icon: UserX,
      color: "text-destructive",
      bgColor: "bg-destructive/10",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {statCards.map((stat) => (
        <Card key={stat.title} className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{stat.title}</p>
                <p className="text-2xl font-bold mt-1">{stat.value}</p>
              </div>
              <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default CustomerStats;

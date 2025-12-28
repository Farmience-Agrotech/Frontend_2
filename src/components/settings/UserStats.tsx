import { Card, CardContent } from '@/components/ui/card';
import { Users, UserCheck, UserX } from 'lucide-react';
import { useUsers } from '@/contexts/UsersContext';

export function UserStats() {
  const { users } = useUsers();

  const totalUsers = users.length;
  const activeUsers = users.filter((u) => u.status === 'active').length;
  const inactiveUsers = users.filter((u) => u.status === 'inactive').length;

  const stats = [
    {
      title: 'Total Users',
      value: totalUsers,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    },
    {
      title: 'Active Users',
      value: activeUsers,
      icon: UserCheck,
      color: 'text-green-600',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
    },
    {
      title: 'Inactive Users',
      value: inactiveUsers,
      icon: UserX,
      color: 'text-gray-600',
      bgColor: 'bg-gray-50 dark:bg-gray-900/20',
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {stats.map((stat) => (
        <Card key={stat.title}>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </p>
                <p className="text-2xl font-bold">{stat.value}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

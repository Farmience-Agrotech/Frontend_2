import { Badge } from '@/components/ui/badge';

interface UserStatusBadgeProps {
  status: 'active' | 'inactive';
}

export function UserStatusBadge({ status }: UserStatusBadgeProps) {
  if (status === 'active') {
    return (
      <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-0">
        Active
      </Badge>
    );
  }

  return (
    <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400 border-0">
      Inactive
    </Badge>
  );
}

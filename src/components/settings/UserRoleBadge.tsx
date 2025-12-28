import { Badge } from '@/components/ui/badge';
import { ROLE_BADGE_COLORS, DEFAULT_ROLE_COLORS } from '@/types/user';
import { useRoles } from '@/contexts/RolesContext';

interface UserRoleBadgeProps {
  roleId: string;
}

export function UserRoleBadge({ roleId }: UserRoleBadgeProps) {
  const { roles } = useRoles();
  const role = roles.find((r) => r.id === roleId);
  
  if (!role) {
    return <Badge variant="outline">Unknown</Badge>;
  }

  // Get color based on role name or creation order
  let colorClasses = ROLE_BADGE_COLORS[role.name];
  
  if (!colorClasses) {
    // Find role index (excluding Admin which is at index 0)
    const roleIndex = roles.findIndex((r) => r.id === roleId);
    const colorIndex = Math.max(0, roleIndex - 1) % DEFAULT_ROLE_COLORS.length;
    colorClasses = DEFAULT_ROLE_COLORS[colorIndex];
  }

  return (
    <Badge className={`${colorClasses} border-0 font-medium`}>
      {role.name}
    </Badge>
  );
}

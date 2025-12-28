import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RolesTab } from './RolesTab';
import { UsersTab } from './UsersTab';
import { Shield, Users } from 'lucide-react';

export function UsersRolesTab() {
  return (
    <Tabs defaultValue="roles" className="space-y-4">
      <TabsList>
        <TabsTrigger value="roles" className="gap-2">
          <Shield className="h-4 w-4" />
          Roles
        </TabsTrigger>
        <TabsTrigger value="users" className="gap-2">
          <Users className="h-4 w-4" />
          Users
        </TabsTrigger>
      </TabsList>

      <TabsContent value="roles">
        <RolesTab />
      </TabsContent>

      <TabsContent value="users">
        <UsersTab />
      </TabsContent>
    </Tabs>
  );
}

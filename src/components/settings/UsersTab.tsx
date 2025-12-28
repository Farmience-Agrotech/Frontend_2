import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { UserStats } from './UserStats';
import { UsersTable } from './UsersTable';
import { AddEditUserDialog } from './AddEditUserDialog';

export function UsersTab() {
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Users</h3>
        <Button onClick={() => setAddDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add User
        </Button>
      </div>

      <UserStats />
      <UsersTable />

      <AddEditUserDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
      />
    </div>
  );
}

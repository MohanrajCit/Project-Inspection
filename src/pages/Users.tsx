import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { 
  Users as UsersIcon,
  UserPlus,
  Shield,
  Loader2
} from 'lucide-react';
import { Profile, AppRole, ROLE_LABELS } from '@/types/database.types';
import { format } from 'date-fns';

interface UserWithRole extends Profile {
  role?: AppRole | null;
}

export default function Users() {
  const navigate = useNavigate();
  const { profile, role } = useAuth();
  const { toast } = useToast();

  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingUser, setUpdatingUser] = useState<string | null>(null);

  // Redirect if not quality head
  useEffect(() => {
    if (role && role !== 'quality_head') {
      navigate('/dashboard');
    }
  }, [role, navigate]);

  const fetchUsers = async () => {
    setIsLoading(true);

    try {
      // Fetch all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch all user roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*');

      if (rolesError) throw rolesError;

      // Combine profiles with roles
      const usersWithRoles: UserWithRole[] = (profiles as Profile[]).map((p) => {
        const userRole = (roles as any[]).find((r) => r.user_id === p.id);
        return {
          ...p,
          role: userRole?.role || null,
        };
      });

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: 'Error',
        description: 'Failed to load users.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRoleChange = async (userId: string, newRole: AppRole | 'none') => {
    setUpdatingUser(userId);

    try {
      if (newRole === 'none') {
        // Remove role
        const { error } = await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', userId);

        if (error) throw error;
      } else {
        // Check if user already has a role
        const existingRole = users.find((u) => u.id === userId)?.role;

        if (existingRole) {
          // Update existing role
          const { error } = await supabase
            .from('user_roles')
            .update({ role: newRole })
            .eq('user_id', userId);

          if (error) throw error;
        } else {
          // Insert new role
          const { error } = await supabase
            .from('user_roles')
            .insert({ user_id: userId, role: newRole });

          if (error) throw error;
        }
      }

      toast({
        title: 'Role Updated',
        description: 'User role has been updated successfully.',
      });

      fetchUsers();
    } catch (error) {
      console.error('Error updating role:', error);
      toast({
        title: 'Error',
        description: 'Failed to update user role.',
        variant: 'destructive',
      });
    } finally {
      setUpdatingUser(null);
    }
  };

  const getRoleBadgeClass = (role: AppRole | null | undefined) => {
    switch (role) {
      case 'auditor':
        return 'role-auditor';
      case 'team_leader':
        return 'role-team-leader';
      case 'hof_auditor':
        return 'role-hof-auditor';
      case 'quality_head':
        return 'role-quality-head';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage user roles and permissions
          </p>
        </div>
      </div>

      {/* Users List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UsersIcon className="h-5 w-5" />
            All Users
          </CardTitle>
          <CardDescription>
            {users.length} user{users.length !== 1 ? 's' : ''} registered
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
              ))}
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-12">
              <UsersIcon className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-lg font-medium">No users yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Users will appear here after they sign up.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Email</th>
                    <th>Current Role</th>
                    <th>Joined</th>
                    <th>Assign Role</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted font-medium">
                            {user.full_name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
                          </div>
                          <span className="font-medium">
                            {user.full_name || 'No name'}
                          </span>
                        </div>
                      </td>
                      <td className="text-muted-foreground">{user.email}</td>
                      <td>
                        <span className={`role-badge ${getRoleBadgeClass(user.role)}`}>
                          {user.role ? ROLE_LABELS[user.role] : 'No Role'}
                        </span>
                      </td>
                      <td className="text-muted-foreground">
                        {format(new Date(user.created_at), 'MMM d, yyyy')}
                      </td>
                      <td>
                        {user.id === profile?.id ? (
                          <span className="text-sm text-muted-foreground italic">
                            (You - Cannot modify own role)
                          </span>
                        ) : user.role === 'quality_head' ? (
                          <span className="text-sm text-muted-foreground italic">
                            (Quality Head - Protected)
                          </span>
                        ) : (
                          <Select
                            value={user.role || 'none'}
                            onValueChange={(value) =>
                              handleRoleChange(user.id, value as AppRole | 'none')
                            }
                            disabled={updatingUser === user.id}
                          >
                            <SelectTrigger className="w-[180px]">
                              {updatingUser === user.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <SelectValue />
                              )}
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">No Role</SelectItem>
                              <SelectItem value="auditor">Auditor</SelectItem>
                              <SelectItem value="team_leader">Team Leader</SelectItem>
                              <SelectItem value="hof_auditor">H.O.F Auditor</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

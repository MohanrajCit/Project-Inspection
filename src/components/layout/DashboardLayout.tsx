import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Sidebar } from './Sidebar';
import { Loader2 } from 'lucide-react';

export function DashboardLayout() {
  const { user, role, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!role) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="max-w-md text-center p-8">
          <h1 className="text-2xl font-bold mb-4">No Role Assigned</h1>
          <p className="text-muted-foreground mb-4">
            Your account does not have a role assigned yet. Please contact your Quality Head or administrator to assign you a role.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="text-primary hover:underline"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="ml-64 min-h-screen transition-all duration-300">
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

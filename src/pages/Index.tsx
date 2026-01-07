import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

const Index = () => {
  const { user, role, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading) {
      if (user && role) {
        navigate('/dashboard', { replace: true });
      } else if (user && !role) {
        navigate('/dashboard', { replace: true });
      } else {
        navigate('/auth', { replace: true });
      }
    }
  }, [user, role, isLoading, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
};

export default Index;

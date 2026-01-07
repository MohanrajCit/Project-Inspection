import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { MetricCard } from '@/components/ui/metric-card';
import { StatusBadge } from '@/components/ui/status-badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  ClipboardCheck, 
  CheckCircle, 
  Clock, 
  XCircle, 
  TrendingUp,
  Package,
  Users,
  FileText,
  Plus,
  ArrowRight
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Inspection, InspectionStatus, ROLE_LABELS } from '@/types/database.types';
import { format } from 'date-fns';

interface DashboardStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}

export default function Dashboard() {
  const { profile, role } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({ total: 0, pending: 0, approved: 0, rejected: 0 });
  const [recentInspections, setRecentInspections] = useState<Inspection[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setIsLoading(true);
      
      try {
        // Fetch all inspections for stats
        const { data: inspections, error } = await supabase
          .from('inspections')
          .select(`
            *,
            product:products(name, part_number),
            creator:profiles!inspections_created_by_fkey(full_name, email)
          `)
          .order('created_at', { ascending: false });

        if (error) throw error;

        if (inspections) {
          // Calculate stats based on role
          let filteredInspections = inspections;
          
          if (role === 'auditor') {
            filteredInspections = inspections.filter(i => i.created_by === profile?.id);
          } else if (role === 'team_leader') {
            filteredInspections = inspections.filter(i => 
              i.status === 'pending_team_leader' || 
              inspections.some(ins => ins.id === i.id)
            );
          } else if (role === 'hof_auditor') {
            filteredInspections = inspections.filter(i => 
              i.status === 'pending_hof_auditor' || 
              inspections.some(ins => ins.id === i.id)
            );
          }

          const stats: DashboardStats = {
            total: filteredInspections.length,
            pending: filteredInspections.filter(i => 
              i.status.startsWith('pending_')
            ).length,
            approved: filteredInspections.filter(i => i.status === 'approved').length,
            rejected: filteredInspections.filter(i => i.status === 'rejected').length,
          };

          setStats(stats);
          setRecentInspections(filteredInspections.slice(0, 5) as Inspection[]);
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (profile && role) {
      fetchDashboardData();
    }
  }, [profile, role]);

  const getPendingLabel = () => {
    switch (role) {
      case 'auditor':
        return 'Awaiting Review';
      case 'team_leader':
        return 'Awaiting Your Review';
      case 'hof_auditor':
        return 'Awaiting Your Review';
      case 'quality_head':
        return 'Awaiting Final Approval';
      default:
        return 'Pending';
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome back, {profile?.full_name?.split(' ')[0] || 'User'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {role && ROLE_LABELS[role]} Dashboard • Here's your overview
          </p>
        </div>
        
        {role === 'auditor' && (
          <Link to="/inspections/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              New Inspection
            </Button>
          </Link>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Inspections"
          value={stats.total}
          icon={ClipboardCheck}
          variant="primary"
        />
        <MetricCard
          title={getPendingLabel()}
          value={stats.pending}
          icon={Clock}
          variant="warning"
        />
        <MetricCard
          title="Approved"
          value={stats.approved}
          icon={CheckCircle}
          variant="success"
        />
        <MetricCard
          title="Rejected"
          value={stats.rejected}
          icon={XCircle}
          variant="danger"
        />
      </div>

      {/* Quick Actions for Quality Head */}
      {role === 'quality_head' && (
        <div className="grid gap-4 md:grid-cols-3">
          <Link to="/products">
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="flex items-center gap-4 p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Package className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-semibold">Manage Products</h3>
                  <p className="text-sm text-muted-foreground">Add or edit products & specs</p>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link to="/users">
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="flex items-center gap-4 p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-info/10 text-info">
                  <Users className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-semibold">Manage Users</h3>
                  <p className="text-sm text-muted-foreground">Assign roles & permissions</p>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link to="/reports">
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="flex items-center gap-4 p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-success/10 text-success">
                  <FileText className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-semibold">View Reports</h3>
                  <p className="text-sm text-muted-foreground">Quality metrics & exports</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      )}

      {/* Recent Inspections */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent Inspections</CardTitle>
            <CardDescription>Latest inspection activity</CardDescription>
          </div>
          <Link to="/inspections">
            <Button variant="ghost" className="gap-2">
              View All
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
              ))}
            </div>
          ) : recentInspections.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ClipboardCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No inspections found</p>
              {role === 'auditor' && (
                <Link to="/inspections/new">
                  <Button variant="link" className="mt-2">
                    Create your first inspection
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {recentInspections.map((inspection) => (
                <Link
                  key={inspection.id}
                  to={`/inspections/${inspection.id}`}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                      <ClipboardCheck className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">{inspection.inspection_number}</p>
                      <p className="text-sm text-muted-foreground">
                        {(inspection.product as any)?.name || 'Unknown Product'} • {(inspection.product as any)?.part_number}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <StatusBadge status={inspection.status} />
                    <span className="text-sm text-muted-foreground hidden md:block">
                      {format(new Date(inspection.created_at), 'MMM d, yyyy')}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

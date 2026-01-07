import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MetricCard } from '@/components/ui/metric-card';
import { 
  FileText,
  Download,
  TrendingUp,
  ClipboardCheck,
  CheckCircle,
  XCircle,
  Clock,
  BarChart3,
  Loader2
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';

interface MonthlyData {
  month: string;
  approved: number;
  rejected: number;
  pending: number;
}

interface StatusBreakdown {
  name: string;
  value: number;
  color: string;
}

export default function Reports() {
  const navigate = useNavigate();
  const { role } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [totalInspections, setTotalInspections] = useState(0);
  const [approvalRate, setApprovalRate] = useState(0);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [statusBreakdown, setStatusBreakdown] = useState<StatusBreakdown[]>([]);

  // Redirect if not quality head
  useEffect(() => {
    if (role && role !== 'quality_head') {
      navigate('/dashboard');
    }
  }, [role, navigate]);

  useEffect(() => {
    const fetchReportData = async () => {
      setIsLoading(true);

      try {
        // Fetch all inspections
        const { data: inspections, error } = await supabase
          .from('inspections')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;

        // Calculate totals
        const total = inspections.length;
        const approved = inspections.filter((i) => i.status === 'approved').length;
        const rejected = inspections.filter((i) => i.status === 'rejected').length;
        const pending = inspections.filter((i) => i.status.startsWith('pending_')).length;

        setTotalInspections(total);
        setApprovalRate(total > 0 ? Math.round((approved / total) * 100) : 0);

        // Status breakdown for pie chart
        setStatusBreakdown([
          { name: 'Approved', value: approved, color: 'hsl(142, 71%, 45%)' },
          { name: 'Rejected', value: rejected, color: 'hsl(0, 72%, 51%)' },
          { name: 'Pending', value: pending, color: 'hsl(38, 92%, 50%)' },
        ]);

        // Monthly data for bar chart (last 6 months)
        const months: MonthlyData[] = [];
        for (let i = 5; i >= 0; i--) {
          const date = subMonths(new Date(), i);
          const monthStart = startOfMonth(date);
          const monthEnd = endOfMonth(date);
          
          const monthInspections = inspections.filter((ins) => {
            const insDate = new Date(ins.created_at);
            return insDate >= monthStart && insDate <= monthEnd;
          });

          months.push({
            month: format(date, 'MMM'),
            approved: monthInspections.filter((i) => i.status === 'approved').length,
            rejected: monthInspections.filter((i) => i.status === 'rejected').length,
            pending: monthInspections.filter((i) => i.status.startsWith('pending_')).length,
          });
        }

        setMonthlyData(months);
      } catch (error) {
        console.error('Error fetching report data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchReportData();
  }, []);

  const handleExportCSV = async () => {
    try {
      const { data: inspections, error } = await supabase
        .from('inspections')
        .select(`
          *,
          product:products(name, part_number),
          creator:profiles!inspections_created_by_fkey(full_name, email)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Create CSV content
      const headers = ['Inspection #', 'Product', 'Part Number', 'Status', 'Created By', 'Date'];
      const rows = inspections.map((i) => [
        i.inspection_number,
        (i.product as any)?.name || '',
        (i.product as any)?.part_number || '',
        i.status,
        (i.creator as any)?.full_name || (i.creator as any)?.email || '',
        format(new Date(i.created_at), 'yyyy-MM-dd HH:mm'),
      ]);

      const csvContent = [headers, ...rows]
        .map((row) => row.map((cell) => `"${cell}"`).join(','))
        .join('\n');

      // Download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `inspections_${format(new Date(), 'yyyy-MM-dd')}.csv`;
      link.click();
    } catch (error) {
      console.error('Error exporting CSV:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground mt-1">
            Quality metrics and inspection analytics
          </p>
        </div>
        
        <Button className="gap-2" onClick={handleExportCSV}>
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Summary Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Inspections"
          value={totalInspections}
          icon={ClipboardCheck}
          variant="primary"
        />
        <MetricCard
          title="Approval Rate"
          value={`${approvalRate}%`}
          icon={TrendingUp}
          variant="success"
        />
        <MetricCard
          title="Approved"
          value={statusBreakdown.find((s) => s.name === 'Approved')?.value || 0}
          icon={CheckCircle}
          variant="success"
        />
        <MetricCard
          title="Rejected"
          value={statusBreakdown.find((s) => s.name === 'Rejected')?.value || 0}
          icon={XCircle}
          variant="danger"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Monthly Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Monthly Trend
            </CardTitle>
            <CardDescription>Inspection status over the last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                  <Bar dataKey="approved" name="Approved" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="rejected" name="Rejected" fill="hsl(0, 72%, 51%)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="pending" name="Pending" fill="hsl(38, 92%, 50%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Status Breakdown Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Status Breakdown
            </CardTitle>
            <CardDescription>Current distribution of inspection statuses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {statusBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

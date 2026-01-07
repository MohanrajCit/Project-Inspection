import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { StatusBadge } from '@/components/ui/status-badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  ClipboardCheck, 
  Plus, 
  Search,
  Filter,
  ChevronRight
} from 'lucide-react';
import { Inspection, InspectionStatus, STATUS_LABELS } from '@/types/database.types';
import { format } from 'date-fns';

export default function Inspections() {
  const { profile, role } = useAuth();
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [filteredInspections, setFilteredInspections] = useState<Inspection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    const fetchInspections = async () => {
      setIsLoading(true);
      
      try {
        const { data, error } = await supabase
          .from('inspections')
          .select(`
            *,
            product:products(name, part_number),
            creator:profiles!inspections_created_by_fkey(full_name, email)
          `)
          .order('created_at', { ascending: false });

        if (error) throw error;

        if (data) {
          // Filter based on role
          let filtered = data;
          
          if (role === 'auditor') {
            filtered = data.filter(i => i.created_by === profile?.id);
          } else if (role === 'team_leader') {
            // Team leaders see all + pending their review
            filtered = data;
          } else if (role === 'hof_auditor') {
            // HOF auditors see all + pending their review
            filtered = data;
          }

          setInspections(filtered as Inspection[]);
          setFilteredInspections(filtered as Inspection[]);
        }
      } catch (error) {
        console.error('Error fetching inspections:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (profile && role) {
      fetchInspections();
    }
  }, [profile, role]);

  useEffect(() => {
    let filtered = [...inspections];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (i) =>
          i.inspection_number.toLowerCase().includes(query) ||
          (i.product as any)?.name?.toLowerCase().includes(query) ||
          (i.product as any)?.part_number?.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((i) => i.status === statusFilter);
    }

    setFilteredInspections(filtered);
  }, [searchQuery, statusFilter, inspections]);

  const getActionableInspections = () => {
    switch (role) {
      case 'team_leader':
        return filteredInspections.filter(i => i.status === 'pending_team_leader');
      case 'hof_auditor':
        return filteredInspections.filter(i => i.status === 'pending_hof_auditor');
      case 'quality_head':
        return filteredInspections.filter(i => i.status === 'pending_quality_head');
      case 'auditor':
        return filteredInspections.filter(i => i.status === 'rejected');
      default:
        return [];
    }
  };

  const actionableInspections = getActionableInspections();

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inspections</h1>
          <p className="text-muted-foreground mt-1">
            View and manage quality inspections
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

      {/* Actionable Items Alert */}
      {actionableInspections.length > 0 && role !== 'auditor' && (
        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20">
                <ClipboardCheck className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">
                  {actionableInspections.length} inspection{actionableInspections.length !== 1 ? 's' : ''} awaiting your review
                </p>
                <p className="text-sm text-muted-foreground">
                  Click on an inspection to review and approve/reject
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {role === 'auditor' && actionableInspections.length > 0 && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/20">
                <ClipboardCheck className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="font-medium">
                  {actionableInspections.length} inspection{actionableInspections.length !== 1 ? 's' : ''} rejected
                </p>
                <p className="text-sm text-muted-foreground">
                  Review rejection reasons and create new inspections after corrections
                </p>
              </div>
            </div>
            <Link to="/inspections/new">
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                New Inspection
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-col gap-4 md:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search inspections..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full md:w-[200px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending_team_leader">Pending Team Leader</SelectItem>
            <SelectItem value="pending_hof_auditor">Pending H.O.F Auditor</SelectItem>
            <SelectItem value="pending_quality_head">Pending Quality Head</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Inspections List */}
      <Card>
        <CardHeader>
          <CardTitle>All Inspections</CardTitle>
          <CardDescription>
            {filteredInspections.length} inspection{filteredInspections.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />
              ))}
            </div>
          ) : filteredInspections.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ClipboardCheck className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No inspections found</p>
              <p className="text-sm mt-1">
                {searchQuery || statusFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Create your first inspection to get started'}
              </p>
              {role === 'auditor' && !searchQuery && statusFilter === 'all' && (
                <Link to="/inspections/new">
                  <Button className="mt-4">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Inspection
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Inspection #</th>
                    <th>Product</th>
                    <th>Batch</th>
                    <th>Status</th>
                    <th>Created By</th>
                    <th>Date</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInspections.map((inspection) => (
                    <tr key={inspection.id}>
                      <td className="font-medium">{inspection.inspection_number}</td>
                      <td>
                        <div>
                          <p className="font-medium">{(inspection.product as any)?.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {(inspection.product as any)?.part_number}
                          </p>
                        </div>
                      </td>
                      <td>{inspection.batch_number || '-'}</td>
                      <td>
                        <StatusBadge status={inspection.status} />
                      </td>
                      <td className="text-muted-foreground">
                        {(inspection.creator as any)?.full_name || (inspection.creator as any)?.email}
                      </td>
                      <td className="text-muted-foreground">
                        {format(new Date(inspection.created_at), 'MMM d, yyyy')}
                      </td>
                      <td>
                        <Link to={`/inspections/${inspection.id}`}>
                          <Button variant="ghost" size="sm">
                            View
                            <ChevronRight className="h-4 w-4 ml-1" />
                          </Button>
                        </Link>
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

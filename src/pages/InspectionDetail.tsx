import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { StatusBadge } from '@/components/ui/status-badge';
import { WorkflowTimeline } from '@/components/ui/workflow-timeline';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  ArrowLeft, 
  CheckCircle, 
  XCircle, 
  FileText,
  Package,
  User,
  Calendar,
  Loader2,
  Image as ImageIcon,
  Plus,
  Ruler,
  Eye,
  Zap,
  ClipboardCheck
} from 'lucide-react';
import { 
  Inspection, 
  InspectionResult, 
  InspectionImage, 
  ApprovalHistory,
  InspectionStatus,
  AppRole,
  SpecificationType,
  SPECIFICATION_TYPE_LABELS
} from '@/types/database.types';
import { format } from 'date-fns';

const SPEC_TYPE_ICONS: Record<SpecificationType, React.ReactNode> = {
  dimensional: <Ruler className="h-3.5 w-3.5" />,
  visual: <Eye className="h-3.5 w-3.5" />,
  functional: <Zap className="h-3.5 w-3.5" />,
  compliance: <ClipboardCheck className="h-3.5 w-3.5" />,
};

const SPEC_TYPE_COLORS: Record<SpecificationType, string> = {
  dimensional: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  visual: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  functional: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  compliance: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
};

export default function InspectionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile, role } = useAuth();
  const { toast } = useToast();

  const [inspection, setInspection] = useState<Inspection | null>(null);
  const [results, setResults] = useState<InspectionResult[]>([]);
  const [images, setImages] = useState<InspectionImage[]>([]);
  const [approvalHistory, setApprovalHistory] = useState<ApprovalHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [comments, setComments] = useState('');

  useEffect(() => {
    const fetchInspectionData = async () => {
      if (!id) return;
      
      setIsLoading(true);
      
      try {
        // Fetch inspection
        const { data: inspectionData, error: inspectionError } = await supabase
          .from('inspections')
          .select(`
            *,
            product:products(*),
            creator:profiles!inspections_created_by_fkey(*)
          `)
          .eq('id', id)
          .single();

        if (inspectionError) throw inspectionError;
        setInspection(inspectionData as Inspection);

        // Fetch results with specifications
        const { data: resultsData, error: resultsError } = await supabase
          .from('inspection_results')
          .select(`
            *,
            specification:specifications(*)
          `)
          .eq('inspection_id', id);

        if (resultsError) throw resultsError;
        setResults(resultsData as InspectionResult[]);

        // Fetch images
        const { data: imagesData, error: imagesError } = await supabase
          .from('inspection_images')
          .select('*')
          .eq('inspection_id', id);

        if (imagesError) throw imagesError;
        setImages(imagesData as InspectionImage[]);

        // Fetch approval history
        const { data: historyData, error: historyError } = await supabase
          .from('approval_history')
          .select(`
            *,
            approver:profiles!approval_history_approver_id_fkey(*)
          `)
          .eq('inspection_id', id)
          .order('created_at', { ascending: true });

        if (historyError) throw historyError;
        setApprovalHistory(historyData as ApprovalHistory[]);
      } catch (error) {
        console.error('Error fetching inspection:', error);
        toast({
          title: 'Error',
          description: 'Failed to load inspection details.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchInspectionData();
  }, [id]);

  const canApprove = () => {
    if (!inspection || !role) return false;

    // Auditors cannot approve/resubmit - rejected inspections are READ-ONLY
    // They must create a NEW inspection after correction
    if (role === 'auditor') return false;

    const roleStatusMap: Record<AppRole, InspectionStatus> = {
      auditor: 'rejected', // Not used - auditors cannot modify rejected inspections
      team_leader: 'pending_team_leader',
      hof_auditor: 'pending_hof_auditor',
      quality_head: 'pending_quality_head',
    };

    return inspection.status === roleStatusMap[role];
  };

  const getNextStatus = (action: 'approved' | 'rejected'): InspectionStatus => {
    if (action === 'rejected') return 'rejected';

    switch (inspection?.status) {
      case 'pending_team_leader':
        return 'pending_hof_auditor';
      case 'pending_hof_auditor':
        return 'pending_quality_head';
      case 'pending_quality_head':
        return 'approved';
      default:
        return inspection?.status || 'pending_team_leader';
    }
  };

  const handleApproval = async (action: 'approved' | 'rejected') => {
    if (!inspection || !profile || !role || !comments.trim()) {
      toast({
        title: 'Comment Required',
        description: 'Please provide a comment before submitting.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const newStatus = getNextStatus(action);

      // Insert approval history
      const { error: historyError } = await supabase
        .from('approval_history')
        .insert({
          inspection_id: inspection.id,
          approver_id: profile.id,
          approver_role: role,
          action,
          previous_status: inspection.status,
          new_status: newStatus,
          comments: comments.trim(),
        });

      if (historyError) throw historyError;

      // Update inspection status
      const { error: updateError } = await supabase
        .from('inspections')
        .update({ status: newStatus })
        .eq('id', inspection.id);

      if (updateError) throw updateError;

      toast({
        title: action === 'approved' ? 'Approved' : 'Rejected',
        description: `Inspection has been ${action}.`,
      });

      // Refresh data
      navigate('/inspections');
    } catch (error) {
      console.error('Error updating inspection:', error);
      toast({
        title: 'Error',
        description: 'Failed to update inspection.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!inspection) {
    return (
      <div className="text-center py-12">
        <p className="text-lg text-muted-foreground">Inspection not found</p>
        <Button variant="link" onClick={() => navigate('/inspections')}>
          Back to Inspections
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/inspections')}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{inspection.inspection_number}</h1>
            <StatusBadge status={inspection.status} />
          </div>
          <p className="text-muted-foreground mt-1">
            Created on {format(new Date(inspection.created_at), 'MMMM d, yyyy')}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Inspection Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Inspection Details
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="flex items-start gap-3">
                <Package className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Product</p>
                  <p className="font-medium">{(inspection.product as any)?.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(inspection.product as any)?.part_number}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Created By</p>
                  <p className="font-medium">
                    {(inspection.creator as any)?.full_name || (inspection.creator as any)?.email}
                  </p>
                </div>
              </div>
              {inspection.batch_number && (
                <div className="flex items-start gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Batch Number</p>
                    <p className="font-medium">{inspection.batch_number}</p>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Last Updated</p>
                  <p className="font-medium">
                    {format(new Date(inspection.updated_at), 'MMM d, yyyy HH:mm')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Inspection Results */}
          <Card>
            <CardHeader>
              <CardTitle>Inspection Results</CardTitle>
              <CardDescription>
                Measured values vs. specifications
              </CardDescription>
            </CardHeader>
            <CardContent>
              {results.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  No results recorded
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Type</th>
                        <th>Parameter</th>
                        <th>Standard</th>
                        <th>Tolerance / Requirement</th>
                        <th>Actual</th>
                        <th>Result</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.map((result) => {
                        const spec = result.specification as any;
                        const specType: SpecificationType = spec?.specification_type || 'dimensional';
                        
                        const getStandard = () => {
                          switch (specType) {
                            case 'visual':
                              return spec?.condition_description || spec?.standard_value;
                            case 'functional':
                              return spec?.test_description || spec?.standard_value;
                            case 'compliance':
                              return spec?.check_method || spec?.standard_value;
                            default:
                              return spec?.standard_value + (spec?.unit ? ` ${spec.unit}` : '');
                          }
                        };
                        
                        const getTolerance = () => {
                          switch (specType) {
                            case 'dimensional':
                              return spec?.tolerance_min !== null 
                                ? `${spec.tolerance_min} - ${spec.tolerance_max}` 
                                : '-';
                            case 'visual':
                              return spec?.photo_required ? 'Photo Required' : '-';
                            case 'functional':
                              return spec?.remarks_required ? 'Remarks Required' : '-';
                            case 'compliance':
                              return spec?.evidence_required ? 'Evidence Required' : '-';
                            default:
                              return '-';
                          }
                        };
                        
                        return (
                          <tr key={result.id}>
                            <td>
                              <Badge className={`gap-1 text-[10px] ${SPEC_TYPE_COLORS[specType]}`}>
                                {SPEC_TYPE_ICONS[specType]}
                                {SPECIFICATION_TYPE_LABELS[specType]}
                              </Badge>
                            </td>
                            <td className="font-medium">
                              {spec?.parameter_name}
                            </td>
                            <td className="max-w-xs text-sm">
                              <span className="line-clamp-2">{getStandard()}</span>
                            </td>
                            <td className="text-muted-foreground text-sm">
                              {getTolerance()}
                            </td>
                            <td className="font-mono">{result.actual_value}</td>
                            <td>
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                                  result.is_pass
                                    ? 'bg-success/15 text-success'
                                    : 'bg-destructive/15 text-destructive'
                                }`}
                              >
                                {result.is_pass ? (
                                  <>
                                    <CheckCircle className="h-3 w-3" />
                                    {specType === 'compliance' ? 'Yes' : 'Pass'}
                                  </>
                                ) : (
                                  <>
                                    <XCircle className="h-3 w-3" />
                                    {specType === 'compliance' ? 'No' : 'Fail'}
                                  </>
                                )}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Images */}
          {images.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="h-5 w-5" />
                  Proof Images
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {images.map((image) => (
                    <div key={image.id} className="relative group">
                      <img
                        src={image.image_url}
                        alt={image.description || 'Inspection image'}
                        className="w-full h-32 object-cover rounded-lg border"
                      />
                      {image.description && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {image.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Remarks */}
          {inspection.remarks && (
            <Card>
              <CardHeader>
                <CardTitle>Remarks</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{inspection.remarks}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Approval Workflow */}
          <Card>
            <CardHeader>
              <CardTitle>Approval Workflow</CardTitle>
              <CardDescription>Track inspection progress</CardDescription>
            </CardHeader>
            <CardContent>
              <WorkflowTimeline
                currentStatus={inspection.status}
                approvalHistory={approvalHistory.map(h => ({
                  ...h,
                  approver: h.approver as any
                }))}
              />
            </CardContent>
          </Card>

          {/* Rejection Notice for Auditors */}
          {role === 'auditor' && inspection.status === 'rejected' && (
            <Card className="border-destructive/50 bg-destructive/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <XCircle className="h-5 w-5" />
                  Inspection Rejected
                </CardTitle>
                <CardDescription>
                  This inspection has been rejected and is now read-only.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Review the rejection reason in the workflow history above. After making the necessary corrections, create a new inspection for this product.
                </p>
                <Button 
                  className="w-full gap-2"
                  onClick={() => navigate('/inspections/new')}
                >
                  <Plus className="h-4 w-4" />
                  Create New Inspection After Correction
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Approval Actions */}
          {canApprove() && (
            <Card>
              <CardHeader>
                <CardTitle>Review & Approve</CardTitle>
                <CardDescription>
                  Provide your review and decision
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="comments">Comments *</Label>
                  <Textarea
                    id="comments"
                    placeholder="Enter your review comments..."
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    className="mt-1"
                    rows={4}
                  />
                </div>
                <div className="flex gap-3">
                  <Button
                    className="flex-1 gap-2"
                    onClick={() => handleApproval('approved')}
                    disabled={isSubmitting || !comments.trim()}
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle className="h-4 w-4" />
                    )}
                    Approve
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1 gap-2"
                    onClick={() => handleApproval('rejected')}
                    disabled={isSubmitting || !comments.trim()}
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <XCircle className="h-4 w-4" />
                    )}
                    Reject
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

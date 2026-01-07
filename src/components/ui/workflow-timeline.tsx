import { cn } from '@/lib/utils';
import { InspectionStatus, AppRole, ROLE_LABELS } from '@/types/database.types';
import { Check, Clock, X, User } from 'lucide-react';
import { format } from 'date-fns';

interface WorkflowStep {
  role: AppRole;
  status: 'complete' | 'active' | 'pending' | 'rejected';
  approverName?: string;
  timestamp?: string;
  comments?: string;
}

interface WorkflowTimelineProps {
  currentStatus: InspectionStatus;
  approvalHistory?: Array<{
    approver_role: AppRole;
    approver?: { full_name: string | null };
    action: 'approved' | 'rejected';
    comments: string;
    created_at: string;
  }>;
}

const workflowOrder: AppRole[] = ['auditor', 'team_leader', 'hof_auditor', 'quality_head'];

const statusToActiveStep: Record<InspectionStatus, number> = {
  pending_team_leader: 1,
  pending_hof_auditor: 2,
  pending_quality_head: 3,
  approved: 4,
  rejected: -1,
};

export function WorkflowTimeline({ currentStatus, approvalHistory = [] }: WorkflowTimelineProps) {
  const activeStep = statusToActiveStep[currentStatus];
  
  const getStepStatus = (index: number): WorkflowStep['status'] => {
    if (currentStatus === 'rejected') {
      const rejection = approvalHistory.find(h => h.action === 'rejected');
      if (rejection && workflowOrder.indexOf(rejection.approver_role) === index) {
        return 'rejected';
      }
    }
    if (index < activeStep) return 'complete';
    if (index === activeStep) return 'active';
    return 'pending';
  };

  return (
    <div className="workflow-timeline">
      {workflowOrder.map((role, index) => {
        const status = getStepStatus(index);
        const historyEntry = approvalHistory.find(h => h.approver_role === role);
        
        return (
          <div key={role} className="workflow-step">
            <div
              className={cn(
                'workflow-icon',
                status === 'complete' && 'workflow-icon-complete',
                status === 'active' && 'workflow-icon-active',
                status === 'pending' && 'workflow-icon-pending',
                status === 'rejected' && 'workflow-icon-rejected'
              )}
            >
              {status === 'complete' && <Check className="h-4 w-4" />}
              {status === 'active' && <Clock className="h-4 w-4" />}
              {status === 'pending' && <User className="h-4 w-4" />}
              {status === 'rejected' && <X className="h-4 w-4" />}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">{ROLE_LABELS[role]}</h4>
                {historyEntry && (
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(historyEntry.created_at), 'MMM d, yyyy HH:mm')}
                  </span>
                )}
              </div>
              
              {historyEntry && (
                <div className="mt-1">
                  <p className="text-sm text-muted-foreground">
                    {historyEntry.approver?.full_name || 'Unknown'}
                    {' • '}
                    <span className={cn(
                      'font-medium',
                      historyEntry.action === 'approved' ? 'text-success' : 'text-destructive'
                    )}>
                      {historyEntry.action === 'approved' ? 'Approved' : 'Rejected'}
                    </span>
                  </p>
                  {historyEntry.comments && (
                    <p className="text-sm text-muted-foreground mt-1 italic">
                      "{historyEntry.comments}"
                    </p>
                  )}
                </div>
              )}
              
              {status === 'active' && (
                <p className="text-sm text-primary mt-1 font-medium">
                  Awaiting review...
                </p>
              )}
              
              {status === 'pending' && !historyEntry && (
                <p className="text-sm text-muted-foreground mt-1">
                  Pending
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

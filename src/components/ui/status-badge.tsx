import { cn } from '@/lib/utils';
import { InspectionStatus, STATUS_LABELS } from '@/types/database.types';
import { Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface StatusBadgeProps {
  status: InspectionStatus;
  className?: string;
}

const statusConfig: Record<InspectionStatus, { class: string; icon: React.ElementType }> = {
  pending_team_leader: { class: 'status-pending', icon: Clock },
  pending_hof_auditor: { class: 'status-pending', icon: Clock },
  pending_quality_head: { class: 'status-pending', icon: AlertCircle },
  approved: { class: 'status-approved', icon: CheckCircle },
  rejected: { class: 'status-rejected', icon: XCircle },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <span className={cn('status-badge', config.class, className)}>
      <Icon className="h-3.5 w-3.5" />
      {STATUS_LABELS[status]}
    </span>
  );
}

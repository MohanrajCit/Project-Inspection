export type AppRole = 'auditor' | 'team_leader' | 'hof_auditor' | 'quality_head';

export type InspectionStatus = 
  | 'pending_team_leader'
  | 'pending_hof_auditor'
  | 'pending_quality_head'
  | 'approved'
  | 'rejected';

export type SpecificationType = 'dimensional' | 'visual' | 'functional' | 'compliance';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
}

export interface Product {
  id: string;
  name: string;
  part_number: string;
  description: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Specification {
  id: string;
  product_id: string;
  parameter_name: string;
  standard_value: string;
  tolerance_min: number | null;
  tolerance_max: number | null;
  unit: string | null;
  check_method: string | null;
  created_at: string;
  specification_type: SpecificationType;
  condition_description: string | null;
  result_type: string | null;
  photo_required: boolean;
  remarks_required: boolean;
  evidence_required: boolean;
  test_description: string | null;
}

export interface Inspection {
  id: string;
  inspection_number: string;
  product_id: string;
  created_by: string;
  status: InspectionStatus;
  batch_number: string | null;
  remarks: string | null;
  created_at: string;
  updated_at: string;
  product?: Product;
  creator?: Profile;
}

export interface InspectionResult {
  id: string;
  inspection_id: string;
  specification_id: string;
  actual_value: string;
  is_pass: boolean;
  remarks: string | null;
  created_at: string;
  specification?: Specification;
}

export interface InspectionImage {
  id: string;
  inspection_id: string;
  image_url: string;
  description: string | null;
  created_at: string;
}

export interface ApprovalHistory {
  id: string;
  inspection_id: string;
  approver_id: string;
  approver_role: AppRole;
  action: 'approved' | 'rejected';
  previous_status: InspectionStatus;
  new_status: InspectionStatus;
  comments: string;
  created_at: string;
  approver?: Profile;
}

export const ROLE_LABELS: Record<AppRole, string> = {
  auditor: 'Auditor',
  team_leader: 'Team Leader',
  hof_auditor: 'H.O.F Auditor',
  quality_head: 'Quality Head',
};

export const STATUS_LABELS: Record<InspectionStatus, string> = {
  pending_team_leader: 'Pending Team Leader Review',
  pending_hof_auditor: 'Pending H.O.F Auditor Review',
  pending_quality_head: 'Pending Quality Head Approval',
  approved: 'Approved',
  rejected: 'Rejected',
};

export const ROLE_DASHBOARD_ROUTES: Record<AppRole, string> = {
  auditor: '/auditor',
  team_leader: '/team-leader',
  hof_auditor: '/hof-auditor',
  quality_head: '/quality-head',
};

export const SPECIFICATION_TYPE_LABELS: Record<SpecificationType, string> = {
  dimensional: 'Dimensional',
  visual: 'Visual',
  functional: 'Functional',
  compliance: 'Compliance',
};

export const SPECIFICATION_TYPE_DESCRIPTIONS: Record<SpecificationType, string> = {
  dimensional: 'Measurement-based checks (length, weight, thickness)',
  visual: 'Appearance-based checks (scratches, alignment, finish)',
  functional: 'Working/performance tests (camera, speaker, buttons)',
  compliance: 'Process/regulatory checks (IMEI, labels, SOPs)',
};

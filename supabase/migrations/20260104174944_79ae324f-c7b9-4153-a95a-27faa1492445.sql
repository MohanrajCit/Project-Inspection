-- Drop existing UPDATE policies
DROP POLICY IF EXISTS "Auditors can update own rejected inspections" ON public.inspections;
DROP POLICY IF EXISTS "Team leaders can update pending inspections" ON public.inspections;
DROP POLICY IF EXISTS "HOF auditors can update pending inspections" ON public.inspections;
DROP POLICY IF EXISTS "Quality head can update pending inspections" ON public.inspections;

-- Recreate with proper WITH CHECK clauses for status transitions

-- Auditors can update their own rejected inspections and resubmit
CREATE POLICY "Auditors can update own rejected inspections" 
ON public.inspections 
FOR UPDATE 
USING (has_role(auth.uid(), 'auditor'::app_role) AND (created_by = auth.uid()) AND (status = 'rejected'::inspection_status))
WITH CHECK (has_role(auth.uid(), 'auditor'::app_role) AND (created_by = auth.uid()) AND (status = 'pending_team_leader'::inspection_status));

-- Team leaders can update pending_team_leader inspections to pending_hof_auditor or rejected
CREATE POLICY "Team leaders can update pending inspections" 
ON public.inspections 
FOR UPDATE 
USING (has_role(auth.uid(), 'team_leader'::app_role) AND (status = 'pending_team_leader'::inspection_status))
WITH CHECK (has_role(auth.uid(), 'team_leader'::app_role) AND (status IN ('pending_hof_auditor'::inspection_status, 'rejected'::inspection_status)));

-- HOF auditors can update pending_hof_auditor inspections to pending_quality_head or rejected
CREATE POLICY "HOF auditors can update pending inspections" 
ON public.inspections 
FOR UPDATE 
USING (has_role(auth.uid(), 'hof_auditor'::app_role) AND (status = 'pending_hof_auditor'::inspection_status))
WITH CHECK (has_role(auth.uid(), 'hof_auditor'::app_role) AND (status IN ('pending_quality_head'::inspection_status, 'rejected'::inspection_status)));

-- Quality head can update pending_quality_head inspections to approved or rejected
CREATE POLICY "Quality head can update pending inspections" 
ON public.inspections 
FOR UPDATE 
USING (has_role(auth.uid(), 'quality_head'::app_role) AND (status = 'pending_quality_head'::inspection_status))
WITH CHECK (has_role(auth.uid(), 'quality_head'::app_role) AND (status IN ('approved'::inspection_status, 'rejected'::inspection_status)));
-- Add specification_type enum
CREATE TYPE public.specification_type AS ENUM ('dimensional', 'visual', 'functional', 'compliance');

-- Add new columns to specifications table for universal QA support
ALTER TABLE public.specifications
ADD COLUMN specification_type public.specification_type NOT NULL DEFAULT 'dimensional',
ADD COLUMN condition_description text,
ADD COLUMN result_type text,
ADD COLUMN photo_required boolean DEFAULT false,
ADD COLUMN remarks_required boolean DEFAULT false,
ADD COLUMN evidence_required boolean DEFAULT false,
ADD COLUMN test_description text;

-- Add comment explaining each type
COMMENT ON COLUMN public.specifications.specification_type IS 'Type of specification: dimensional (measurement), visual (appearance), functional (working test), compliance (process check)';
COMMENT ON COLUMN public.specifications.condition_description IS 'For visual type: describes expected appearance condition';
COMMENT ON COLUMN public.specifications.result_type IS 'For non-dimensional types: pass_fail or yes_no';
COMMENT ON COLUMN public.specifications.photo_required IS 'Whether photo evidence is required for this check';
COMMENT ON COLUMN public.specifications.remarks_required IS 'Whether remarks are mandatory';
COMMENT ON COLUMN public.specifications.evidence_required IS 'For compliance type: whether evidence is needed';
COMMENT ON COLUMN public.specifications.test_description IS 'For functional type: describes the test procedure';
-- FIX 1: Remove auditor update policy for rejected inspections (IMMUTABILITY)
-- Rejected inspections must be READ-ONLY
DROP POLICY IF EXISTS "Auditors can update own rejected inspections" ON public.inspections;

-- FIX 3: Add soft-delete column to products table
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true NOT NULL;

-- FIX 4: Create trigger to prevent deletion of specifications that are used in inspections
CREATE OR REPLACE FUNCTION public.prevent_used_specification_deletion()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.inspection_results 
    WHERE specification_id = OLD.id
  ) THEN
    RAISE EXCEPTION 'Cannot delete specification that is referenced by existing inspection results';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS prevent_specification_deletion ON public.specifications;
CREATE TRIGGER prevent_specification_deletion
  BEFORE DELETE ON public.specifications
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_used_specification_deletion();

-- FIX 3 continued: Create trigger to prevent hard deletion of products with inspections
CREATE OR REPLACE FUNCTION public.prevent_used_product_deletion()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.inspections 
    WHERE product_id = OLD.id
  ) THEN
    RAISE EXCEPTION 'Cannot delete product that has inspection history. Use soft-delete (deactivate) instead.';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
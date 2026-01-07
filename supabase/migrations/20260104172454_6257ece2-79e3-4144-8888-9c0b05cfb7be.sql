-- Function to check if a quality_head exists in the system
CREATE OR REPLACE FUNCTION public.quality_head_exists()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE role = 'quality_head'
  )
$$;

-- Function to handle user registration with bootstrap code
-- Returns the role to assign based on registration code
CREATE OR REPLACE FUNCTION public.get_role_for_registration_code(
  _registration_code text
)
RETURNS app_role
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  bootstrap_code text := 'QA-BOOTSTRAP-2024';
  qh_exists boolean;
BEGIN
  -- Check if quality_head exists
  SELECT public.quality_head_exists() INTO qh_exists;
  
  -- If bootstrap code matches and no quality_head exists, return quality_head role
  IF _registration_code = bootstrap_code AND NOT qh_exists THEN
    RETURN 'quality_head'::app_role;
  END IF;
  
  -- For all other cases, return auditor as default role
  RETURN 'auditor'::app_role;
END;
$$;

-- Function to validate registration code before signup
-- Returns: 'valid_bootstrap' | 'valid_regular' | 'invalid_bootstrap_exists' | 'invalid_code'
CREATE OR REPLACE FUNCTION public.validate_registration_code(
  _registration_code text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  bootstrap_code text := 'QA-BOOTSTRAP-2024';
  qh_exists boolean;
BEGIN
  -- Check if quality_head exists
  SELECT public.quality_head_exists() INTO qh_exists;
  
  -- If bootstrap code is used
  IF _registration_code = bootstrap_code THEN
    IF qh_exists THEN
      -- Quality head already exists, reject bootstrap
      RETURN 'invalid_bootstrap_exists';
    ELSE
      -- Valid bootstrap registration
      RETURN 'valid_bootstrap';
    END IF;
  END IF;
  
  -- For regular registration codes (empty or any other value)
  -- In production, you might want to validate against a list of valid codes
  IF _registration_code = '' OR _registration_code IS NULL THEN
    IF NOT qh_exists THEN
      -- System not initialized yet
      RETURN 'system_not_initialized';
    END IF;
    RETURN 'valid_regular';
  END IF;
  
  -- Unknown code - treat as invalid
  RETURN 'invalid_code';
END;
$$;

-- Function to assign role after successful registration
CREATE OR REPLACE FUNCTION public.assign_role_after_registration(
  _user_id uuid,
  _registration_code text
)
RETURNS app_role
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  assigned_role app_role;
BEGIN
  -- Get the role to assign based on registration code
  SELECT public.get_role_for_registration_code(_registration_code) INTO assigned_role;
  
  -- Insert the role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (_user_id, assigned_role)
  ON CONFLICT (user_id) DO UPDATE SET role = assigned_role;
  
  RETURN assigned_role;
END;
$$;

-- Add unique constraint on user_id in user_roles if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'user_roles_user_id_unique'
  ) THEN
    ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_unique UNIQUE (user_id);
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('auditor', 'team_leader', 'hof_auditor', 'quality_head');

-- Create inspection_status enum
CREATE TYPE public.inspection_status AS ENUM (
  'pending_team_leader',
  'pending_hof_auditor', 
  'pending_quality_head',
  'approved',
  'rejected'
);

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create user_roles table (separate for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Create products table (managed by Quality Head)
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  part_number TEXT UNIQUE NOT NULL,
  description TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create specifications table
CREATE TABLE public.specifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  parameter_name TEXT NOT NULL,
  standard_value TEXT NOT NULL,
  tolerance_min NUMERIC,
  tolerance_max NUMERIC,
  unit TEXT,
  check_method TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create inspections table
CREATE TABLE public.inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_number TEXT UNIQUE NOT NULL,
  product_id UUID NOT NULL REFERENCES public.products(id),
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  status inspection_status NOT NULL DEFAULT 'pending_team_leader',
  batch_number TEXT,
  remarks TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create inspection_results table (actual measured values)
CREATE TABLE public.inspection_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID NOT NULL REFERENCES public.inspections(id) ON DELETE CASCADE,
  specification_id UUID NOT NULL REFERENCES public.specifications(id),
  actual_value TEXT NOT NULL,
  is_pass BOOLEAN NOT NULL,
  remarks TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create inspection_images table (proof uploads)
CREATE TABLE public.inspection_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID NOT NULL REFERENCES public.inspections(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create approval_history table (audit trail)
CREATE TABLE public.approval_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID NOT NULL REFERENCES public.inspections(id) ON DELETE CASCADE,
  approver_id UUID NOT NULL REFERENCES public.profiles(id),
  approver_role app_role NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('approved', 'rejected')),
  previous_status inspection_status NOT NULL,
  new_status inspection_status NOT NULL,
  comments TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.specifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspection_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspection_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_history ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- Generate inspection number function
CREATE OR REPLACE FUNCTION public.generate_inspection_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  new_number TEXT;
  counter INTEGER;
BEGIN
  SELECT COUNT(*) + 1 INTO counter FROM public.inspections;
  new_number := 'INS-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(counter::TEXT, 4, '0');
  RETURN new_number;
END;
$$;

-- Profiles policies
CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- User roles policies (view only for authenticated users)
CREATE POLICY "Users can view own role"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Quality head can manage roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'quality_head'));

-- Products policies
CREATE POLICY "All authenticated users can view products"
  ON public.products FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Quality head can manage products"
  ON public.products FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'quality_head'));

-- Specifications policies
CREATE POLICY "All authenticated users can view specifications"
  ON public.specifications FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Quality head can manage specifications"
  ON public.specifications FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'quality_head'));

-- Inspections policies
CREATE POLICY "Users can view inspections"
  ON public.inspections FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Auditors can create inspections"
  ON public.inspections FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'auditor') AND
    created_by = auth.uid()
  );

CREATE POLICY "Auditors can update own rejected inspections"
  ON public.inspections FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'auditor') AND
    created_by = auth.uid() AND
    status = 'rejected'
  );

CREATE POLICY "Team leaders can update pending inspections"
  ON public.inspections FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'team_leader') AND
    status = 'pending_team_leader'
  );

CREATE POLICY "HOF auditors can update pending inspections"
  ON public.inspections FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'hof_auditor') AND
    status = 'pending_hof_auditor'
  );

CREATE POLICY "Quality head can update pending inspections"
  ON public.inspections FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'quality_head') AND
    status = 'pending_quality_head'
  );

-- Inspection results policies
CREATE POLICY "Users can view inspection results"
  ON public.inspection_results FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Auditors can manage inspection results"
  ON public.inspection_results FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.inspections i
      WHERE i.id = inspection_id
        AND i.created_by = auth.uid()
        AND (i.status = 'pending_team_leader' OR i.status = 'rejected')
    )
  );

-- Inspection images policies
CREATE POLICY "Users can view inspection images"
  ON public.inspection_images FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Auditors can manage inspection images"
  ON public.inspection_images FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.inspections i
      WHERE i.id = inspection_id
        AND i.created_by = auth.uid()
    )
  );

-- Approval history policies
CREATE POLICY "Users can view approval history"
  ON public.approval_history FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Approvers can insert approval history"
  ON public.approval_history FOR INSERT
  TO authenticated
  WITH CHECK (approver_id = auth.uid());

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_inspections_updated_at
  BEFORE UPDATE ON public.inspections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create profile on signup trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create storage bucket for inspection images
INSERT INTO storage.buckets (id, name, public)
VALUES ('inspection-images', 'inspection-images', true);

-- Storage policies
CREATE POLICY "Anyone can view inspection images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'inspection-images');

CREATE POLICY "Authenticated users can upload inspection images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'inspection-images');

CREATE POLICY "Users can update own inspection images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'inspection-images');
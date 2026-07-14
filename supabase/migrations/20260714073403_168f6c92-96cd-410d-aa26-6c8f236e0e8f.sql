
-- Fix profiles: restrict SELECT to own row or admin
DROP POLICY IF EXISTS "Profiles readable by all authenticated" ON public.profiles;
CREATE POLICY "Users read own profile" ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));

-- Switch has_role to SECURITY INVOKER (all call sites check auth.uid() == _user_id,
-- and user_roles SELECT policy allows users to read their own roles).
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

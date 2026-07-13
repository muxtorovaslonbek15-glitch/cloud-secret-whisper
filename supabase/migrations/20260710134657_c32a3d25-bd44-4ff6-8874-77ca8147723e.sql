
-- Rol enum
CREATE TYPE public.app_role AS ENUM ('admin', 'fermer', 'usta', 'texnika_egasi');

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  viloyat TEXT,
  tuman TEXT,
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles readable by all authenticated" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- User roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- has_role security definer
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Auto-create profile + default role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.phone,
    NEW.raw_user_meta_data->>'avatar_url'
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'fermer');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Technique categories
CREATE TABLE public.technique_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  icon TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.technique_categories TO anon, authenticated;
GRANT ALL ON public.technique_categories TO service_role;
ALTER TABLE public.technique_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Categories public read" ON public.technique_categories FOR SELECT TO anon, authenticated USING (true);

-- Techniques (ijaraga qo'yilgan)
CREATE TABLE public.techniques (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  category_id UUID REFERENCES public.technique_categories ON DELETE SET NULL,
  name TEXT NOT NULL,
  brand TEXT,
  year INTEGER,
  description TEXT,
  image_url TEXT,
  daily_price NUMERIC(12,2),
  hourly_price NUMERIC(12,2),
  viloyat TEXT NOT NULL,
  tuman TEXT,
  is_available BOOLEAN NOT NULL DEFAULT true,
  rating NUMERIC(3,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.techniques TO authenticated;
GRANT SELECT ON public.techniques TO anon;
GRANT ALL ON public.techniques TO service_role;
ALTER TABLE public.techniques ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Techniques public read" ON public.techniques FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Owners manage techniques" ON public.techniques FOR ALL TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

-- Masters (ustalar)
CREATE TABLE public.masters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users ON DELETE CASCADE,
  specialty TEXT NOT NULL,
  experience_years INTEGER DEFAULT 0,
  hourly_rate NUMERIC(12,2),
  viloyat TEXT NOT NULL,
  tuman TEXT,
  bio TEXT,
  is_available BOOLEAN NOT NULL DEFAULT true,
  rating NUMERIC(3,2) DEFAULT 0,
  completed_jobs INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.masters TO authenticated;
GRANT SELECT ON public.masters TO anon;
GRANT ALL ON public.masters TO service_role;
ALTER TABLE public.masters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Masters public read" ON public.masters FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Master manages own profile" ON public.masters FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Orders
CREATE TYPE public.order_status AS ENUM ('yaratildi', 'jarayonda', 'yolda', 'bajarildi', 'bekor');
CREATE TYPE public.order_type AS ENUM ('texnika_ijarasi', 'usta_chaqirish');

CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  provider_id UUID REFERENCES auth.users ON DELETE SET NULL,
  technique_id UUID REFERENCES public.techniques ON DELETE SET NULL,
  master_id UUID REFERENCES public.masters ON DELETE SET NULL,
  type order_type NOT NULL,
  status order_status NOT NULL DEFAULT 'yaratildi',
  problem_description TEXT,
  address TEXT,
  scheduled_date TIMESTAMPTZ,
  price NUMERIC(12,2),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "See own orders" ON public.orders FOR SELECT TO authenticated USING (auth.uid() = customer_id OR auth.uid() = provider_id);
CREATE POLICY "Customer creates orders" ON public.orders FOR INSERT TO authenticated WITH CHECK (auth.uid() = customer_id);
CREATE POLICY "Parties update orders" ON public.orders FOR UPDATE TO authenticated USING (auth.uid() = customer_id OR auth.uid() = provider_id);

-- AI diagnostics
CREATE TABLE public.ai_diagnostics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  image_url TEXT,
  problem_input TEXT,
  ai_diagnosis TEXT NOT NULL,
  recommended_specialty TEXT,
  estimated_cost NUMERIC(12,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.ai_diagnostics TO authenticated;
GRANT ALL ON public.ai_diagnostics TO service_role;
ALTER TABLE public.ai_diagnostics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "See own diagnostics" ON public.ai_diagnostics FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Create own diagnostics" ON public.ai_diagnostics FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
CREATE TRIGGER tr_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER tr_techniques_updated BEFORE UPDATE ON public.techniques FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER tr_masters_updated BEFORE UPDATE ON public.masters FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER tr_orders_updated BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed categories
INSERT INTO public.technique_categories (name, icon) VALUES
  ('Traktor', 'tractor'),
  ('Kombayn', 'combine'),
  ('Seyalka', 'seedling'),
  ('Purkagich', 'spray-can'),
  ('Ekskavator', 'construction'),
  ('Buldozer', 'construction'),
  ('Yuk mashinasi', 'truck'),
  ('Traktor tirkamasi', 'container');

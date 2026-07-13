CREATE TYPE public.app_role AS ENUM ('admin', 'fermer', 'usta', 'texnika_egasi');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  full_name TEXT, phone TEXT, viloyat TEXT, tuman TEXT, avatar_url TEXT, bio TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles readable by all authenticated" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

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

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, avatar_url)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)), NEW.phone, NEW.raw_user_meta_data->>'avatar_url');
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'fermer');
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE public.technique_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE, icon TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.technique_categories TO anon, authenticated;
GRANT ALL ON public.technique_categories TO service_role;
ALTER TABLE public.technique_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Categories public read" ON public.technique_categories FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.techniques (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  category_id UUID REFERENCES public.technique_categories ON DELETE SET NULL,
  name TEXT NOT NULL, brand TEXT, year INTEGER, description TEXT, image_url TEXT,
  daily_price NUMERIC(12,2), hourly_price NUMERIC(12,2),
  viloyat TEXT NOT NULL, tuman TEXT,
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

CREATE TABLE public.masters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users ON DELETE CASCADE,
  specialty TEXT NOT NULL, experience_years INTEGER DEFAULT 0,
  hourly_rate NUMERIC(12,2),
  viloyat TEXT NOT NULL, tuman TEXT, bio TEXT,
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
  problem_description TEXT, address TEXT,
  scheduled_date TIMESTAMPTZ, price NUMERIC(12,2), notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "See own orders" ON public.orders FOR SELECT TO authenticated USING (auth.uid() = customer_id OR auth.uid() = provider_id);
CREATE POLICY "Customer creates orders" ON public.orders FOR INSERT TO authenticated WITH CHECK (auth.uid() = customer_id);
CREATE POLICY "Parties update orders" ON public.orders FOR UPDATE TO authenticated USING (auth.uid() = customer_id OR auth.uid() = provider_id);

CREATE TABLE public.ai_diagnostics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  image_url TEXT, problem_input TEXT,
  ai_diagnosis TEXT NOT NULL,
  recommended_specialty TEXT, estimated_cost NUMERIC(12,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.ai_diagnostics TO authenticated;
GRANT ALL ON public.ai_diagnostics TO service_role;
ALTER TABLE public.ai_diagnostics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "See own diagnostics" ON public.ai_diagnostics FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Create own diagnostics" ON public.ai_diagnostics FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
CREATE TRIGGER tr_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER tr_techniques_updated BEFORE UPDATE ON public.techniques FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER tr_masters_updated BEFORE UPDATE ON public.masters FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER tr_orders_updated BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.technique_categories (name, icon) VALUES
  ('Traktor', 'tractor'),('Kombayn', 'combine'),('Seyalka', 'seedling'),
  ('Purkagich', 'spray-can'),('Ekskavator', 'construction'),('Buldozer', 'construction'),
  ('Yuk mashinasi', 'truck'),('Traktor tirkamasi', 'container');

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;

CREATE TABLE public.market_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL, description TEXT,
  price NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'UZS',
  image_url TEXT, category TEXT,
  stock INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.market_products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.market_products TO authenticated;
GRANT ALL ON public.market_products TO service_role;
ALTER TABLE public.market_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active products" ON public.market_products FOR SELECT USING (is_active = true OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins insert products" ON public.market_products FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update products" ON public.market_products FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete products" ON public.market_products FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_market_products_updated BEFORE UPDATE ON public.market_products FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL, body TEXT,
  type TEXT NOT NULL DEFAULT 'info', link TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own notifications" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_notifications_user_created ON public.notifications(user_id, created_at DESC);

CREATE TABLE public.telegram_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  telegram_id BIGINT UNIQUE,
  telegram_username TEXT,
  link_code TEXT UNIQUE,
  code_expires_at TIMESTAMPTZ,
  linked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.telegram_links TO authenticated;
GRANT ALL ON public.telegram_links TO service_role;
ALTER TABLE public.telegram_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own telegram link" ON public.telegram_links FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_telegram_links_code ON public.telegram_links(link_code);

CREATE TABLE public.market_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.market_products(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  total_price numeric(12,2) NOT NULL DEFAULT 0,
  phone text NOT NULL, address text NOT NULL, notes text,
  status text NOT NULL DEFAULT 'yangi',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.market_orders TO authenticated;
GRANT ALL ON public.market_orders TO service_role;
ALTER TABLE public.market_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Customer inserts own market order" ON public.market_orders FOR INSERT TO authenticated WITH CHECK (auth.uid() = customer_id);
CREATE POLICY "Customer or admin views" ON public.market_orders FOR SELECT TO authenticated USING (auth.uid() = customer_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin updates market orders" ON public.market_orders FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin deletes market orders" ON public.market_orders FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_market_orders_updated BEFORE UPDATE ON public.market_orders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.contact_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name text NOT NULL, phone text NOT NULL,
  subject text NOT NULL, message text NOT NULL,
  kind text NOT NULL DEFAULT 'murojaat',
  status text NOT NULL DEFAULT 'yangi',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contact_messages TO authenticated;
GRANT ALL ON public.contact_messages TO service_role;
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User inserts own message" ON public.contact_messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "User or admin views messages" ON public.contact_messages FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin updates messages" ON public.contact_messages FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin deletes messages" ON public.contact_messages FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_contact_messages_updated BEFORE UPDATE ON public.contact_messages FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
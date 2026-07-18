
-- is_staff helper
CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role::text IN ('admin','yordamchi_admin')
  )
$$;

-- contact_replies (chat thread)
CREATE TABLE IF NOT EXISTS public.contact_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.contact_messages(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  sender_role text NOT NULL CHECK (sender_role IN ('user','admin')),
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.contact_replies TO authenticated;
GRANT ALL ON public.contact_replies TO service_role;
ALTER TABLE public.contact_replies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Thread parties view replies" ON public.contact_replies;
CREATE POLICY "Thread parties view replies" ON public.contact_replies FOR SELECT TO authenticated USING (
  public.is_staff(auth.uid()) OR EXISTS(SELECT 1 FROM public.contact_messages m WHERE m.id = message_id AND m.user_id = auth.uid())
);
DROP POLICY IF EXISTS "Owner or staff reply" ON public.contact_replies;
CREATE POLICY "Owner or staff reply" ON public.contact_replies FOR INSERT TO authenticated WITH CHECK (
  sender_id = auth.uid() AND (
    (sender_role = 'admin' AND public.is_staff(auth.uid())) OR
    (sender_role = 'user' AND EXISTS(SELECT 1 FROM public.contact_messages m WHERE m.id = message_id AND m.user_id = auth.uid()))
  )
);
CREATE INDEX IF NOT EXISTS idx_contact_replies_message ON public.contact_replies(message_id, created_at);

-- contact_messages policies (include yordamchi_admin via is_staff)
DROP POLICY IF EXISTS "Admin deletes messages" ON public.contact_messages;
DROP POLICY IF EXISTS "Admin updates messages" ON public.contact_messages;
DROP POLICY IF EXISTS "User or admin views messages" ON public.contact_messages;
CREATE POLICY "User or staff views messages" ON public.contact_messages FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_staff(auth.uid()));
CREATE POLICY "Staff updates messages" ON public.contact_messages FOR UPDATE TO authenticated
  USING (public.is_staff(auth.uid()));
CREATE POLICY "Admin deletes messages" ON public.contact_messages FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Moderation columns
ALTER TABLE public.masters ADD COLUMN IF NOT EXISTS moderation_status text NOT NULL DEFAULT 'kutilmoqda';
ALTER TABLE public.masters ADD COLUMN IF NOT EXISTS moderation_note text;
ALTER TABLE public.techniques ADD COLUMN IF NOT EXISTS moderation_status text NOT NULL DEFAULT 'kutilmoqda';
ALTER TABLE public.techniques ADD COLUMN IF NOT EXISTS moderation_note text;

-- Existing rows: keep visible
UPDATE public.masters SET moderation_status = 'tasdiqlangan' WHERE moderation_status = 'kutilmoqda';
UPDATE public.techniques SET moderation_status = 'tasdiqlangan' WHERE moderation_status = 'kutilmoqda';

-- Masters visibility
DROP POLICY IF EXISTS "Masters public read" ON public.masters;
DROP POLICY IF EXISTS "Masters approved public read" ON public.masters;
CREATE POLICY "Masters approved public read" ON public.masters FOR SELECT TO anon, authenticated
  USING (moderation_status = 'tasdiqlangan' OR auth.uid() = user_id OR public.is_staff(auth.uid()));
DROP POLICY IF EXISTS "Staff moderates masters" ON public.masters;
CREATE POLICY "Staff moderates masters" ON public.masters FOR UPDATE TO authenticated
  USING (public.is_staff(auth.uid()) OR auth.uid() = user_id)
  WITH CHECK (public.is_staff(auth.uid()) OR auth.uid() = user_id);
DROP POLICY IF EXISTS "Admin deletes masters" ON public.masters;
CREATE POLICY "Admin deletes masters" ON public.masters FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR auth.uid() = user_id);

-- Techniques visibility
DROP POLICY IF EXISTS "Techniques public read" ON public.techniques;
DROP POLICY IF EXISTS "Techniques approved public read" ON public.techniques;
CREATE POLICY "Techniques approved public read" ON public.techniques FOR SELECT TO anon, authenticated
  USING (moderation_status = 'tasdiqlangan' OR auth.uid() = owner_id OR public.is_staff(auth.uid()));
DROP POLICY IF EXISTS "Staff moderates techniques" ON public.techniques;
CREATE POLICY "Staff moderates techniques" ON public.techniques FOR UPDATE TO authenticated
  USING (public.is_staff(auth.uid()) OR auth.uid() = owner_id)
  WITH CHECK (public.is_staff(auth.uid()) OR auth.uid() = owner_id);
DROP POLICY IF EXISTS "Admin deletes techniques" ON public.techniques;
CREATE POLICY "Admin deletes techniques" ON public.techniques FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR auth.uid() = owner_id);

-- Profiles settings
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS notification_prefs jsonb NOT NULL DEFAULT '{"admin_reply":true,"order_updates":true,"broadcast":true,"moderation":true}'::jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bg_choice text NOT NULL DEFAULT 'agro';

-- user_roles: staff can view; only admin can manage admin roles; yordamchi_admin can manage basic roles
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
DROP POLICY IF EXISTS "Staff views roles" ON public.user_roles;
CREATE POLICY "Staff views roles" ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_staff(auth.uid()));
DROP POLICY IF EXISTS "Admin manages roles" ON public.user_roles;
CREATE POLICY "Admin manages roles" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "Yordamchi assigns basic roles" ON public.user_roles;
CREATE POLICY "Yordamchi assigns basic roles" ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'yordamchi_admin') AND role::text NOT IN ('admin','yordamchi_admin'));
DROP POLICY IF EXISTS "Yordamchi deletes basic roles" ON public.user_roles;
CREATE POLICY "Yordamchi deletes basic roles" ON public.user_roles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'yordamchi_admin') AND role::text NOT IN ('admin','yordamchi_admin'));

-- Notifications: staff can insert for anyone (broadcast, replies, moderation)
DROP POLICY IF EXISTS "Users insert own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users or staff insert notifications" ON public.notifications;
CREATE POLICY "Users or staff insert notifications" ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id OR public.is_staff(auth.uid()));

-- Auto-notify: order status change
CREATE OR REPLACE FUNCTION public.notify_order_status_change() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.notifications(user_id, title, body, type, link)
    VALUES (NEW.customer_id, 'Buyurtma statusi yangilandi',
      'Yangi holat: '||NEW.status::text, 'order', '/buyurtmalar');
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_notify_order_status ON public.orders;
CREATE TRIGGER trg_notify_order_status AFTER UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.notify_order_status_change();

-- Auto-notify: master moderation
CREATE OR REPLACE FUNCTION public.notify_master_moderation() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.moderation_status IS DISTINCT FROM OLD.moderation_status THEN
    INSERT INTO public.notifications(user_id, title, body, type, link)
    VALUES (NEW.user_id,
      CASE WHEN NEW.moderation_status='tasdiqlangan' THEN 'Usta arizangiz tasdiqlandi ✅'
           WHEN NEW.moderation_status='rad_etildi' THEN 'Usta arizangiz rad etildi ❌'
           ELSE 'Usta arizangiz holati: '||NEW.moderation_status END,
      COALESCE(NEW.moderation_note,''), 'moderation', '/ustalar');
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_notify_master_moderation ON public.masters;
CREATE TRIGGER trg_notify_master_moderation AFTER UPDATE ON public.masters
FOR EACH ROW EXECUTE FUNCTION public.notify_master_moderation();

-- Auto-notify: technique moderation
CREATE OR REPLACE FUNCTION public.notify_technique_moderation() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.moderation_status IS DISTINCT FROM OLD.moderation_status THEN
    INSERT INTO public.notifications(user_id, title, body, type, link)
    VALUES (NEW.owner_id,
      CASE WHEN NEW.moderation_status='tasdiqlangan' THEN 'Texnikangiz tasdiqlandi ✅'
           WHEN NEW.moderation_status='rad_etildi' THEN 'Texnika arizangiz rad etildi ❌'
           ELSE 'Texnika arizangiz holati: '||NEW.moderation_status END,
      COALESCE(NEW.moderation_note,''), 'moderation', '/texnika');
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_notify_technique_moderation ON public.techniques;
CREATE TRIGGER trg_notify_technique_moderation AFTER UPDATE ON public.techniques
FOR EACH ROW EXECUTE FUNCTION public.notify_technique_moderation();

-- Auto-notify: admin reply to contact
CREATE OR REPLACE FUNCTION public.notify_contact_reply() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _user uuid; _subj text;
BEGIN
  IF NEW.sender_role = 'admin' THEN
    SELECT user_id, subject INTO _user, _subj FROM public.contact_messages WHERE id = NEW.message_id;
    IF _user IS NOT NULL THEN
      INSERT INTO public.notifications(user_id, title, body, type, link)
      VALUES (_user, 'Admin javob yozdi 💬',
        COALESCE(_subj,'')||': '||left(NEW.body, 140), 'contact', '/murojaat');
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_notify_contact_reply ON public.contact_replies;
CREATE TRIGGER trg_notify_contact_reply AFTER INSERT ON public.contact_replies
FOR EACH ROW EXECUTE FUNCTION public.notify_contact_reply();

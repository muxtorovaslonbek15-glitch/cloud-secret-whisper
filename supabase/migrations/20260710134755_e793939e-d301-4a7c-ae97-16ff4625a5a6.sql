
-- set_updated_at ga search_path qo'shish
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- handle_new_user faqat trigger ichida ishlaydi, EXECUTE ni ochiq foydalanuvchilardan olib tashlaymiz
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- has_role RLS ichida ishlatiladi; ochiq foydalanuvchilardan EXECUTE ni olib tashlaymiz
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;

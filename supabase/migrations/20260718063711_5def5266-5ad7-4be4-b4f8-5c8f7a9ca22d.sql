
REVOKE ALL ON FUNCTION public.notify_order_status_change() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_master_moderation() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_technique_moderation() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_contact_reply() FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.confirm_customer_email_change(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.confirm_customer_email_change(uuid, text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_customer_email_change(uuid, text) TO service_role;

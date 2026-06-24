-- Onboarding links are short lived. Existing open links receive a seven-day
-- expiry based on their creation time and can no longer be used indefinitely.
UPDATE public.onboarding_tokens
SET expires_at = created_at + interval '7 days'
WHERE used = false AND expires_at IS NULL;

CREATE INDEX IF NOT EXISTS onboarding_tokens_customer_open_idx
ON public.onboarding_tokens (customer_id, created_at DESC)
WHERE used = false;

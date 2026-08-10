-- Falsch importierte SevDesk-Kunden: Onboarding zurücksetzen

UPDATE public.contacts
SET
  onboarding_completed = false,
  status = 'pending',
  contract_signed = false,
  datenschutz = false,
  updated_at = timezone('utc'::text, now())
WHERE contact_type = 'customer'
  AND service = 'import'
  AND onboarding_completed = true
  AND user_id IS NULL;

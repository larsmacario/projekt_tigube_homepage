-- Rasse und Farbe für Tiere (Onboarding / Portal / Admin)
ALTER TABLE public.pets
  ADD COLUMN IF NOT EXISTS rasse character varying,
  ADD COLUMN IF NOT EXISTS farbe character varying;

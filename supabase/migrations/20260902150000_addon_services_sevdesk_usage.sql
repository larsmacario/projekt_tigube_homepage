-- SevDesk-Nutzungszähler (Rechnungspositionen) für verknüpfte Artikel

ALTER TABLE public.addon_services
  ADD COLUMN IF NOT EXISTS sevdesk_usage_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sevdesk_usage_synced_at TIMESTAMPTZ;

ALTER TABLE public.prices
  ADD COLUMN IF NOT EXISTS sevdesk_usage_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sevdesk_usage_synced_at TIMESTAMPTZ;

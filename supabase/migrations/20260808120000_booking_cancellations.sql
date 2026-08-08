-- Strukturierte Stornierungsbedingungen und Buchungs-Storno-Felder

CREATE TABLE IF NOT EXISTS public.cancellation_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version INT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  config JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_cancellation_policies_version
  ON public.cancellation_policies (version);

CREATE UNIQUE INDEX IF NOT EXISTS idx_cancellation_policies_active
  ON public.cancellation_policies (is_active)
  WHERE is_active = true;

ALTER TABLE public.cancellation_policies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow admin full access to cancellation_policies" ON public.cancellation_policies;
CREATE POLICY "Allow admin full access to cancellation_policies"
  ON public.cancellation_policies
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Allow authenticated read active cancellation policy" ON public.cancellation_policies;
CREATE POLICY "Allow authenticated read active cancellation policy"
  ON public.cancellation_policies
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Buchungs-Storno-Felder
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cancellation_charge_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS cancellation_refund_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS cancellation_policy_snapshot JSONB,
  ADD COLUMN IF NOT EXISTS cancellation_rule_set_id TEXT,
  ADD COLUMN IF NOT EXISTS cancellation_tier_label TEXT,
  ADD COLUMN IF NOT EXISTS cancellation_financial_status TEXT NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS cancelled_dates TEXT[] NOT NULL DEFAULT '{}';

ALTER TABLE public.bookings
  DROP CONSTRAINT IF EXISTS bookings_cancellation_financial_status_check;

ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_cancellation_financial_status_check
  CHECK (cancellation_financial_status IN ('none', 'pending', 'processed'));

ALTER TABLE public.bookings
  DROP CONSTRAINT IF EXISTS bookings_status_check;

ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_status_check
  CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled'));

-- Standard-Regeln aus CMS-Defaults
INSERT INTO public.cancellation_policies (version, is_active, config)
SELECT
  1,
  true,
  '{
    "title": "Stornierungsbedingungen",
    "cutoffHour": 18,
    "generalNotes": [
      "Absagen werden jeweils bis 18 Uhr berücksichtigt – auch an Sonn-/Feiertagen oder in Betriebsferien.",
      "Die Stornierung erfolgt über das Kundenportal in schriftlicher Form."
    ],
    "ruleSets": [
      {
        "id": "standard",
        "name": "Standard",
        "condition": { "type": "default" },
        "priority": 0,
        "tiers": [
          { "minDaysBefore": 15, "maxDaysBefore": null, "chargePercent": 0, "label": "15 Tage und mehr vor Check-In" },
          { "minDaysBefore": 7, "maxDaysBefore": 14, "chargePercent": 50, "label": "14 - 7 Tage vor Check-In" },
          { "minDaysBefore": 0, "maxDaysBefore": 6, "chargePercent": 100, "label": "6 Tage und weniger vor Check-In" }
        ],
        "notes": []
      },
      {
        "id": "school_holidays_bw",
        "name": "Schulferien Baden-Württemberg",
        "condition": { "type": "school_holidays_bw" },
        "priority": 10,
        "tiers": [
          { "minDaysBefore": 56, "maxDaysBefore": null, "chargePercent": 0, "label": "56 Tage und mehr vor Check-In" },
          { "minDaysBefore": 21, "maxDaysBefore": 55, "chargePercent": 50, "label": "55 - 21 Tage vor Check-In" },
          { "minDaysBefore": 0, "maxDaysBefore": 20, "chargePercent": 100, "label": "20 Tage und weniger vor Check-In" }
        ],
        "notes": []
      }
    ]
  }'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.cancellation_policies);

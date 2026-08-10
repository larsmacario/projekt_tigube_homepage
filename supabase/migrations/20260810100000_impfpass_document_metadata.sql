-- Impfpass-Fotos: Kategorie und optionale Beschreibung pro Dokument

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS page_category text,
  ADD COLUMN IF NOT EXISTS description text;

CREATE INDEX IF NOT EXISTS documents_pet_id_document_type_idx
  ON public.documents (pet_id, document_type)
  WHERE pet_id IS NOT NULL;

COMMENT ON COLUMN public.documents.page_category IS
  'Impfpass-Seitenkategorie: angaben_tier_besitzer, kennzeichnung, impfung, sonstiges';

COMMENT ON COLUMN public.documents.description IS
  'Optionale Zusatzbeschreibung zum hochgeladenen Dokument';

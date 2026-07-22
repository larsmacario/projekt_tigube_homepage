-- Bereinigt veraltete file_path-Werte mit Bucket-Prefix in documents.
-- Idempotent: nur Zeilen mit Prefix customer-documents/ werden angepasst.

UPDATE public.documents
SET file_path = regexp_replace(file_path, '^customer-documents/', '')
WHERE file_path LIKE 'customer-documents/%';

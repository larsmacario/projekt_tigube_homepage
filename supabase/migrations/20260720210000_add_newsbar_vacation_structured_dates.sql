-- Strukturierte Datumsfelder für Betriebsferien (NewsBar)
ALTER TABLE newsbar_vacation_dates
  ADD COLUMN IF NOT EXISTS start_date date,
  ADD COLUMN IF NOT EXISTS end_date date;

COMMENT ON COLUMN newsbar_vacation_dates.start_date IS 'Start der Betriebsferien (inklusive)';
COMMENT ON COLUMN newsbar_vacation_dates.end_date IS 'Ende der Betriebsferien (inklusive)';

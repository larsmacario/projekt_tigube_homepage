-- Add column letzte_stuhlprobe to pets table
ALTER TABLE pets ADD COLUMN IF NOT EXISTS letzte_stuhlprobe DATE;

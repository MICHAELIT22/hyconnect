-- Add notes JSONB array to Employee table
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'Employee' AND column_name = 'notes'
  ) THEN
    ALTER TABLE "Employee" ADD COLUMN "notes" JSONB DEFAULT '[]'::JSONB;
  END IF;
END $$;

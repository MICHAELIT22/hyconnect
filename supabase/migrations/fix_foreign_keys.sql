-- Fix: ensure all foreign keys exist so PostgREST can resolve relations
-- Run this in Supabase Dashboard > SQL Editor
-- Safe to run multiple times (IF NOT EXISTS / DO $$ checks)

-- ─── Attendance → Employee ────────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_type = 'FOREIGN KEY'
      AND table_name = 'Attendance'
      AND constraint_name = 'Attendance_employeeId_fkey'
  ) THEN
    ALTER TABLE "Attendance"
      ADD CONSTRAINT "Attendance_employeeId_fkey"
      FOREIGN KEY ("employeeId") REFERENCES "Employee"(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ─── Contract → Employee ──────────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_type = 'FOREIGN KEY'
      AND table_name = 'Contract'
      AND constraint_name = 'Contract_employeeId_fkey'
  ) THEN
    ALTER TABLE "Contract"
      ADD CONSTRAINT "Contract_employeeId_fkey"
      FOREIGN KEY ("employeeId") REFERENCES "Employee"(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ─── Leave → Employee ─────────────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_type = 'FOREIGN KEY'
      AND table_name = 'Leave'
      AND constraint_name = 'Leave_employeeId_fkey'
  ) THEN
    ALTER TABLE "Leave"
      ADD CONSTRAINT "Leave_employeeId_fkey"
      FOREIGN KEY ("employeeId") REFERENCES "Employee"(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ─── Training → Employee ──────────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_type = 'FOREIGN KEY'
      AND table_name = 'Training'
      AND constraint_name = 'Training_employeeId_fkey'
  ) THEN
    ALTER TABLE "Training"
      ADD CONSTRAINT "Training_employeeId_fkey"
      FOREIGN KEY ("employeeId") REFERENCES "Employee"(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ─── MedicalVisit → Employee ──────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_type = 'FOREIGN KEY'
      AND table_name = 'MedicalVisit'
      AND constraint_name = 'MedicalVisit_employeeId_fkey'
  ) THEN
    ALTER TABLE "MedicalVisit"
      ADD CONSTRAINT "MedicalVisit_employeeId_fkey"
      FOREIGN KEY ("employeeId") REFERENCES "Employee"(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ─── Document → Employee ──────────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_type = 'FOREIGN KEY'
      AND table_name = 'Document'
      AND constraint_name = 'Document_employeeId_fkey'
  ) THEN
    ALTER TABLE "Document"
      ADD CONSTRAINT "Document_employeeId_fkey"
      FOREIGN KEY ("employeeId") REFERENCES "Employee"(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ─── PayrollCycleEntry → PayrollCycle ────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_type = 'FOREIGN KEY'
      AND table_name = 'PayrollCycleEntry'
      AND constraint_name = 'PayrollCycleEntry_cycleId_fkey'
  ) THEN
    ALTER TABLE "PayrollCycleEntry"
      ADD CONSTRAINT "PayrollCycleEntry_cycleId_fkey"
      FOREIGN KEY ("cycleId") REFERENCES "PayrollCycle"(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ─── Force PostgREST schema cache reload ────────────────────────────────────
NOTIFY pgrst, 'reload schema';

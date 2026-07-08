-- Migration: add PayrollCycle and PayrollCycleEntry tables
-- Run this in Supabase Dashboard > SQL Editor

CREATE TABLE IF NOT EXISTS "PayrollCycle" (
  "id"         SERIAL PRIMARY KEY,
  "month"      INTEGER NOT NULL,
  "year"       INTEGER NOT NULL,
  "status"     TEXT NOT NULL DEFAULT 'DRAFT',
  "totalGross" FLOAT NOT NULL DEFAULT 0,
  "totalCnss"  FLOAT NOT NULL DEFAULT 0,
  "totalTax"   FLOAT NOT NULL DEFAULT 0,
  "totalNet"   FLOAT NOT NULL DEFAULT 0,
  "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE ("month", "year")
);

CREATE TABLE IF NOT EXISTS "PayrollCycleEntry" (
  "id"                SERIAL PRIMARY KEY,
  "cycleId"           INTEGER NOT NULL REFERENCES "PayrollCycle"("id") ON DELETE CASCADE,
  "employeeId"        INTEGER NOT NULL,
  "matricule"         TEXT NOT NULL,
  "firstName"         TEXT NOT NULL,
  "lastName"          TEXT NOT NULL,
  "department"        TEXT NOT NULL DEFAULT '',
  "position"          TEXT NOT NULL DEFAULT '',
  "base"              FLOAT NOT NULL DEFAULT 0,
  "transport"         FLOAT NOT NULL DEFAULT 0,
  "housing"           FLOAT NOT NULL DEFAULT 0,
  "positionAllowance" FLOAT NOT NULL DEFAULT 0,
  "gross"             FLOAT NOT NULL DEFAULT 0,
  "cnss"              FLOAT NOT NULL DEFAULT 0,
  "tax"               FLOAT NOT NULL DEFAULT 0,
  "net"               FLOAT NOT NULL DEFAULT 0,
  "createdAt"         TIMESTAMPTZ NOT NULL DEFAULT now()
);

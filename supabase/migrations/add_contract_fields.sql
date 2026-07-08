-- Migration: add language, payFrequency, workDaysPerWeek to Contract table
-- Run this in Supabase Dashboard > SQL Editor

ALTER TABLE "Contract"
  ADD COLUMN IF NOT EXISTS "language"        TEXT,
  ADD COLUMN IF NOT EXISTS "payFrequency"    TEXT,
  ADD COLUMN IF NOT EXISTS "workDaysPerWeek" INTEGER;

-- Migration: add taxId to Employee table
-- Run this in Supabase Dashboard > SQL Editor

ALTER TABLE "Employee"
  ADD COLUMN IF NOT EXISTS "taxId" TEXT;

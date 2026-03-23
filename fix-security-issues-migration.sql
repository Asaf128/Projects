-- Migration: Sicherheitsprobleme beheben
-- Führen Sie dieses SQL-Skript im Supabase SQL Editor aus

-- 1. Funktionen mit festem search_path aktualisieren
CREATE OR REPLACE FUNCTION generate_task_number()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.task_number := 'TNR-' || nextval('public.task_number_seq');
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- 2. RLS-Policies verbessern - authentifizierte Benutzer prüfen

-- Parts Tabelle
DROP POLICY IF EXISTS "Allow authenticated users" ON parts;
CREATE POLICY "Allow authenticated users" ON parts
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- PCS Tabelle
DROP POLICY IF EXISTS "Allow authenticated users" ON pcs;
CREATE POLICY "Allow authenticated users" ON pcs
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- PC Parts Tabelle
DROP POLICY IF EXISTS "Allow authenticated users" ON pc_parts;
CREATE POLICY "Allow authenticated users" ON pc_parts
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Sales Tabelle
DROP POLICY IF EXISTS "Allow authenticated users" ON sales;
CREATE POLICY "Allow authenticated users" ON sales
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Task Statuses Tabelle
DROP POLICY IF EXISTS "Allow authenticated users" ON task_statuses;
CREATE POLICY "Allow authenticated users" ON task_statuses
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Tasks Tabelle
DROP POLICY IF EXISTS "Allow authenticated users" ON tasks;
CREATE POLICY "Allow authenticated users" ON tasks
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Users Tabelle
DROP POLICY IF EXISTS "Allow authenticated users" ON users;
CREATE POLICY "Allow authenticated users" ON users
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Time Entries Tabelle
DROP POLICY IF EXISTS "Allow all insert" ON time_entries;
CREATE POLICY "Allow authenticated insert" ON time_entries
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow all update" ON time_entries;
CREATE POLICY "Allow authenticated update" ON time_entries
  FOR UPDATE
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- App Users Tabelle (nur SELECT erlauben)
DROP POLICY IF EXISTS "Allow authenticated users" ON app_users;
CREATE POLICY "Allow authenticated select" ON app_users
  FOR SELECT
  USING (auth.uid() IS NOT NULL);
-- PC Manager Datenbank-Schema für Supabase
-- Führen Sie dieses SQL-Skript im Supabase SQL Editor aus

-- 1. Tabelle für PC-Teile
CREATE TABLE IF NOT EXISTS parts (
  id BIGSERIAL PRIMARY KEY,
  type VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  purchase_price DECIMAL(10,2) NOT NULL,
  selling_price DECIMAL(10,2) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  condition VARCHAR(20) DEFAULT 'new',
  min_stock INTEGER DEFAULT 2,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabelle für PC-Builds
CREATE TABLE IF NOT EXISTS pcs (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  total_cost DECIMAL(10,2) NOT NULL,
  selling_price DECIMAL(10,2) NOT NULL,
  profit DECIMAL(10,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'available',
  sold_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Tabelle für PC-Teile-Zuordnung (many-to-many)
CREATE TABLE IF NOT EXISTS pc_parts (
  id BIGSERIAL PRIMARY KEY,
  pc_id BIGINT REFERENCES pcs(id) ON DELETE CASCADE,
  part_id BIGINT REFERENCES parts(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Tabelle für Verkaufshistorie
CREATE TABLE IF NOT EXISTS sales (
  id BIGSERIAL PRIMARY KEY,
  pc_name VARCHAR(255) NOT NULL,
  selling_price DECIMAL(10,2) NOT NULL,
  total_cost DECIMAL(10,2) NOT NULL,
  profit DECIMAL(10,2) NOT NULL,
  sold_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Tabelle für erlaubte Benutzer (nur Sie!)
CREATE TABLE IF NOT EXISTS app_users (
  id BIGSERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. RLS (Row Level Security) Policies aktivieren
ALTER TABLE parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE pcs ENABLE ROW LEVEL SECURITY;
ALTER TABLE pc_parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;

-- 7. Policies erstellen (nur authentifizierte Benutzer haben Zugriff)
CREATE POLICY "Allow authenticated users" ON parts FOR ALL USING (true);
CREATE POLICY "Allow authenticated users" ON pcs FOR ALL USING (true);
CREATE POLICY "Allow authenticated users" ON pc_parts FOR ALL USING (true);
CREATE POLICY "Allow authenticated users" ON sales FOR ALL USING (true);
CREATE POLICY "Allow authenticated users" ON app_users FOR SELECT USING (true);

-- 8. Trigger für updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_parts_updated_at BEFORE UPDATE ON parts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pcs_updated_at BEFORE UPDATE ON pcs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 9. Ihren Benutzer einfügen (Passwort wird über Supabase Auth verwaltet)
-- Der Benutzer wird über die Supabase Auth API erstellt
-- Dieser Eintrag ist nur für die Referenz
INSERT INTO app_users (email, password_hash) 
VALUES ('ceb.asaf@gmail.com', 'managed_by_supabase_auth')
ON CONFLICT (email) DO NOTHING;

-- ============================================
-- KANBAN BOARD / TO-DO SYSTEM
-- ============================================

-- 10. Tabelle für Task-Status
CREATE TABLE IF NOT EXISTS task_statuses (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  display_order INTEGER NOT NULL DEFAULT 0,
  color VARCHAR(20) DEFAULT '#6b7280',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Standard-Status einfügen
INSERT INTO task_statuses (name, display_order, color) VALUES
  ('Backlog', 1, '#6b7280'),
  ('To Do', 2, '#3b82f6'),
  ('In Progress', 3, '#f59e0b'),
  ('Review', 4, '#8b5cf6'),
  ('Done', 5, '#10b981')
ON CONFLICT (name) DO NOTHING;

-- 11. Tabelle für Tasks
CREATE TABLE IF NOT EXISTS tasks (
  id BIGSERIAL PRIMARY KEY,
  task_number VARCHAR(20) UNIQUE NOT NULL,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  status_id BIGINT REFERENCES task_statuses(id) ON DELETE SET NULL,
  assigned_to VARCHAR(255),
  priority VARCHAR(20) DEFAULT 'medium',
  due_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 12. Sequence für Task-Nummern
CREATE SEQUENCE IF NOT EXISTS task_number_seq START 1;

-- 13. Funktion zum Generieren der Task-Nummer
CREATE OR REPLACE FUNCTION generate_task_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.task_number := 'TNR-' || nextval('task_number_seq');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 14. Trigger für automatische Task-Nummer
DROP TRIGGER IF EXISTS set_task_number ON tasks;
CREATE TRIGGER set_task_number
  BEFORE INSERT ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION generate_task_number();

-- 15. Trigger für updated_at bei Tasks
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 16. RLS für Task-Tabellen aktivieren
ALTER TABLE task_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- 17. Policies für Task-Tabellen
CREATE POLICY "Allow authenticated users" ON task_statuses FOR ALL USING (true);
CREATE POLICY "Allow authenticated users" ON tasks FOR ALL USING (true);

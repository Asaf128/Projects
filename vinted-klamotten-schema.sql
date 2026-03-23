-- Vinted Klamotten Datenbank-Schema
-- Führen Sie dieses SQL-Skript im Supabase SQL Editor aus

-- 1. Tabelle für Kategorien
CREATE TABLE IF NOT EXISTS categories (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Standard-Kategorien einfügen
INSERT INTO categories (name) VALUES
  ('Oberteile'),
  ('Hosen'),
  ('Kleider'),
  ('Jacken'),
  ('Schuhe'),
  ('Accessoires')
ON CONFLICT (name) DO NOTHING;

-- 2. Tabelle für Größen
CREATE TABLE IF NOT EXISTS sizes (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(20) NOT NULL UNIQUE,
  category_type VARCHAR(20), -- 'clothing', 'shoes', 'accessories'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Standard-Größen einfügen
INSERT INTO sizes (name, category_type) VALUES
  -- Kleidungsgrößen
  ('XS', 'clothing'),
  ('S', 'clothing'),
  ('M', 'clothing'),
  ('L', 'clothing'),
  ('XL', 'clothing'),
  ('XXL', 'clothing'),
  -- Schuhgrößen
  ('36', 'shoes'),
  ('37', 'shoes'),
  ('38', 'shoes'),
  ('39', 'shoes'),
  ('40', 'shoes'),
  ('41', 'shoes'),
  ('42', 'shoes'),
  ('43', 'shoes'),
  ('44', 'shoes'),
  ('45', 'shoes')
ON CONFLICT (name) DO NOTHING;

-- 3. Tabelle für Kleidungsstücke
CREATE TABLE IF NOT EXISTS clothes (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  category_id BIGINT REFERENCES categories(id) ON DELETE SET NULL,
  size_id BIGINT REFERENCES sizes(id) ON DELETE SET NULL,
  condition VARCHAR(20) DEFAULT 'neuwertig',
  purchase_price DECIMAL(10,2) NOT NULL,
  selling_price DECIMAL(10,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'verfügbar',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Tabelle für Verkäufe (falls noch nicht vorhanden)
CREATE TABLE IF NOT EXISTS sales (
  id BIGSERIAL PRIMARY KEY,
  item_name VARCHAR(255) NOT NULL,
  selling_price DECIMAL(10,2) NOT NULL,
  purchase_price DECIMAL(10,2) NOT NULL,
  profit DECIMAL(10,2) NOT NULL,
  sold_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. RLS aktivieren
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE sizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE clothes ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

-- 6. Policies erstellen
CREATE POLICY "Allow authenticated users" ON categories
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated users" ON sizes
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated users" ON clothes
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated users" ON sales
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- 7. Trigger für updated_at
CREATE TRIGGER update_clothes_updated_at BEFORE UPDATE ON clothes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- Migration: Investment nur aus Bestand berechnen
-- Diese Migration stellt sicher, dass das Investment nur aus Kleidung im Bestand berechnet wird
-- und aktualisiert die Sales-Tabelle für die korrekte Gewinnberechnung

-- 1. Überprüfe ob die brands Tabelle existiert
CREATE TABLE IF NOT EXISTS brands (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Füge brand_id zur clothes Tabelle hinzu (falls noch nicht vorhanden)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'clothes' AND column_name = 'brand_id'
  ) THEN
    ALTER TABLE clothes ADD COLUMN brand_id BIGINT REFERENCES brands(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 3. Aktualisiere die Sales-Tabelle um item_name zu haben (falls noch nicht vorhanden)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'sales' AND column_name = 'item_name'
  ) THEN
    ALTER TABLE sales ADD COLUMN item_name VARCHAR(255);
  END IF;
END $$;

-- 4. Aktualisiere die Sales-Tabelle um purchase_price zu haben (falls noch nicht vorhanden)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'sales' AND column_name = 'purchase_price'
  ) THEN
    ALTER TABLE sales ADD COLUMN purchase_price DECIMAL(10,2);
  END IF;
END $$;

-- 5. Aktualisiere die Sales-Tabelle um profit zu haben (falls noch nicht vorhanden)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'sales' AND column_name = 'profit'
  ) THEN
    ALTER TABLE sales ADD COLUMN profit DECIMAL(10,2);
  END IF;
END $$;

-- 6. RLS für brands Tabelle aktivieren
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;

-- 7. Policy für brands Tabelle erstellen
DROP POLICY IF EXISTS "Allow authenticated users" ON brands;
CREATE POLICY "Allow authenticated users" ON brands
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- 8. Trigger für updated_at auf clothes Tabelle
DROP TRIGGER IF EXISTS update_clothes_updated_at ON clothes;
CREATE TRIGGER update_clothes_updated_at 
  BEFORE UPDATE ON clothes
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- 9. View für Investment-Übersicht erstellen (optional, für spätere Reports)
CREATE OR REPLACE VIEW vinted_investment_overview AS
SELECT 
  COUNT(*) as total_items,
  COUNT(CASE WHEN status = 'verfügbar' THEN 1 END) as available_items,
  COUNT(CASE WHEN status = 'verkauft' THEN 1 END) as sold_items,
  COALESCE(SUM(CASE WHEN status = 'verfügbar' THEN purchase_price ELSE 0 END), 0) as current_investment,
  COALESCE(SUM(CASE WHEN status = 'verkauft' THEN selling_price ELSE 0 END), 0) as total_revenue,
  COALESCE(SUM(CASE WHEN status = 'verkauft' THEN profit ELSE 0 END), 0) as total_profit
FROM clothes;

-- 10. View für Kategorie-Statistiken erstellen
CREATE OR REPLACE VIEW vinted_category_stats AS
SELECT 
  c.id as category_id,
  c.name as category_name,
  COUNT(cl.id) as item_count,
  COUNT(CASE WHEN cl.status = 'verfügbar' THEN 1 END) as available_count,
  COUNT(CASE WHEN cl.status = 'verkauft' THEN 1 END) as sold_count,
  COALESCE(SUM(CASE WHEN cl.status = 'verfügbar' THEN cl.purchase_price ELSE 0 END), 0) as investment_value
FROM categories c
LEFT JOIN clothes cl ON c.id = cl.category_id
GROUP BY c.id, c.name;

-- 11. View für Marken-Statistiken erstellen
CREATE OR REPLACE VIEW vinted_brand_stats AS
SELECT 
  b.id as brand_id,
  b.name as brand_name,
  COUNT(cl.id) as item_count,
  COUNT(CASE WHEN cl.status = 'verfügbar' THEN 1 END) as available_count,
  COUNT(CASE WHEN cl.status = 'verkauft' THEN 1 END) as sold_count
FROM brands b
LEFT JOIN clothes cl ON b.id = cl.brand_id
GROUP BY b.id, b.name;

-- 12. RLS für Views aktivieren (falls gewünscht)
-- ALTER VIEW vinted_investment_overview OWNER TO authenticated;
-- ALTER VIEW vinted_category_stats OWNER TO authenticated;
-- ALTER VIEW vinted_brand_stats OWNER TO authenticated;

-- Hinweis: Die Investment-Berechnung erfolgt in der Anwendung wie folgt:
-- totalInvestment = SUM(purchase_price) WHERE status = 'verfügbar'
-- Dies stellt sicher, dass nur Kleidung im Bestand als Investment gezählt wird.
-- Wenn etwas verkauft wird, wird es automatisch aus dem Investment entfernt.
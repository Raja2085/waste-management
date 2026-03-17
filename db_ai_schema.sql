-- =============================================
-- AI Classification Columns on products table
-- =============================================

ALTER TABLE products ADD COLUMN IF NOT EXISTS material_type TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS quality TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS recyclability_score INT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS ai_keywords JSONB DEFAULT '[]'::jsonb;
ALTER TABLE products ADD COLUMN IF NOT EXISTS ai_confidence INT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS ai_processed_at TIMESTAMPTZ;

-- =============================================
-- Consumer Requirements Table
-- =============================================

CREATE TABLE IF NOT EXISTS consumer_requirements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  consumer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  material_types TEXT[] DEFAULT '{}',
  min_quantity NUMERIC DEFAULT 0,
  max_quantity NUMERIC DEFAULT 999999,
  min_quality TEXT DEFAULT 'low',
  keywords JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE consumer_requirements ENABLE ROW LEVEL SECURITY;

-- Consumers can read all requirements (for matching visibility)
CREATE POLICY "Authenticated users can read consumer_requirements"
  ON consumer_requirements FOR SELECT
  TO authenticated
  USING (true);

-- Consumers can insert their own requirements
CREATE POLICY "Users can insert own requirements"
  ON consumer_requirements FOR INSERT
  WITH CHECK (auth.uid() = consumer_id);

-- Consumers can update their own requirements
CREATE POLICY "Users can update own requirements"
  ON consumer_requirements FOR UPDATE
  USING (auth.uid() = consumer_id);

-- Consumers can delete their own requirements
CREATE POLICY "Users can delete own requirements"
  ON consumer_requirements FOR DELETE
  USING (auth.uid() = consumer_id);

-- Index for faster matching queries
CREATE INDEX IF NOT EXISTS idx_consumer_req_consumer ON consumer_requirements(consumer_id);
CREATE INDEX IF NOT EXISTS idx_consumer_req_materials ON consumer_requirements USING GIN(material_types);
CREATE INDEX IF NOT EXISTS idx_products_material_type ON products(material_type);

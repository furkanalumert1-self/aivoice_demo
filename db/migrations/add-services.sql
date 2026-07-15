-- Run this in Neon SQL console (neon.tech → project → SQL Editor)
CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER DEFAULT 30,
  price NUMERIC,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now()
);

-- Seed default services
INSERT INTO services (name, description, duration_minutes, price, active) VALUES
  ('Dahiliye',    'İç hastalıkları muayene ve tedavi', 30, 350, true),
  ('Kardiyoloji', 'Kalp ve damar hastalıkları',        45, 500, true),
  ('Pediatri',    'Çocuk sağlığı ve hastalıkları',     30, 300, true),
  ('Dermatoloji', 'Cilt hastalıkları ve tedavisi',     30, 400, true),
  ('Ortopedi',    'Kemik ve eklem hastalıkları',        45, 450, true),
  ('Nöroloji',    'Sinir sistemi hastalıkları',         60, 600, true)
ON CONFLICT DO NOTHING;

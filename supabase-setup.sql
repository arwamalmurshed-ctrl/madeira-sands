-- Run this SQL in your Supabase SQL Editor at:
-- https://supabase.com/dashboard/project/lizvqhpzfmrynekwvrxx/sql/new

-- Bookings table
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'available')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Date statuses table
CREATE TABLE IF NOT EXISTS date_statuses (
  date DATE PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'pending', 'confirmed')),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Prices table
CREATE TABLE IF NOT EXISTS prices (
  type TEXT PRIMARY KEY,
  amount INTEGER NOT NULL,
  label TEXT,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Site content table for all editable text
CREATE TABLE IF NOT EXISTS site_content (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Facilities table for the features section
CREATE TABLE IF NOT EXISTS facilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  icon TEXT NOT NULL,
  title TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE date_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE facilities ENABLE ROW LEVEL SECURITY;

-- Public read policies for visitor-facing tables
CREATE POLICY "Public read date_statuses" ON date_statuses FOR SELECT USING (true);
CREATE POLICY "Public read prices" ON prices FOR SELECT USING (true);
CREATE POLICY "Public read site_content" ON site_content FOR SELECT USING (true);
CREATE POLICY "Public read facilities" ON facilities FOR SELECT USING (true);

-- Admin write policies
CREATE POLICY "Public write date_statuses" ON date_statuses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public write prices" ON prices FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public write site_content" ON site_content FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public write facilities" ON facilities FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public write bookings" ON bookings FOR ALL USING (true) WITH CHECK (true);

-- Insert default prices
INSERT INTO prices (type, amount, label, description) VALUES
  ('weekday', 450, 'أيام الأسبوع', 'السبت - الأربعاء'),
  ('weekend', 680, 'نهاية الأسبوع', 'الخميس والجمعة والعطلات'),
  ('weekly', 2500, 'أسبوعي', 'حجز أسبوع كامل'),
  ('monthly', 8000, 'شهري', 'حجز شهر كامل')
ON CONFLICT (type) DO NOTHING;

-- Insert default site content
INSERT INTO site_content (key, value) VALUES
  ('chalet_name', 'Madeira Sands'),
  ('hero_title', 'ملاذ صيفي فاخر'),
  ('hero_subtitle', 'أجواء استجمام استثنائية'),
  ('hero_description', 'استمتع بتجربة إقامة لا تُنسى في شاليه Madeira Sands، حيث يلتقي الفخامة بالراحة في أجمل المناطق.'),
  ('hero_button', 'احجز الآن'),
  ('hero_location', 'بريدة، القصيم'),
  ('facilities_title', 'المرافق والخدمات'),
  ('facilities_subtitle', 'كل ما تحتاجه لإقامة مريحة'),
  ('pricing_title', 'الأسعار'),
  ('pricing_subtitle', 'أسعار تنافسية تناسب جميع المناسبات'),
  ('pricing_currency', 'ريال'),
  ('pricing_night', 'لليلة'),
  ('contact_whatsapp', '966501234567'),
  ('contact_instagram', 'https://instagram.com/madeirasands'),
  ('contact_tiktok', 'https://tiktok.com/@madeirasands'),
  ('footer_rights', 'جميع الحقوق محفوظة'),
  ('location_title', 'الموقع'),
  ('location_address', 'بريدة، القصيم، المملكة العربية السعودية'),
  ('map_embed_url', 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3579.9774985417876!2d43.96894241503385!3d26.32595198338438!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x157f7b0e1e4d6f2f%3A0x3e5f8e2a9d6c7b4a!2sBuraydah%2C%20Saudi%20Arabia!5e0!3m2!1sen!2s!4v1234567890')
ON CONFLICT (key) DO NOTHING;

-- Insert default facilities
INSERT INTO facilities (icon, title, sort_order) VALUES
  ('pool', 'مسبح خاص', 1),
  ('bedroom', 'غرفة نوم رئيسية', 2),
  ('bathroom', 'دورة مياه', 3),
  ('kitchen', 'مطبخ مجهز', 4),
  ('wifi', 'واي فاي مجاني', 5),
  ('parking', 'موقف سيارات', 6),
  ('ac', 'تكييف مركزي', 7),
  ('garden', 'حديقة خارجية', 8)
ON CONFLICT DO NOTHING;

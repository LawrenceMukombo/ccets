-- Add missing columns to spareparts table matches the expected schema
ALTER TABLE public.spareparts
ADD COLUMN IF NOT EXISTS category character varying(100),
    ADD COLUMN IF NOT EXISTS manufacturer character varying(255),
    ADD COLUMN IF NOT EXISTS model character varying(255),
    ADD COLUMN IF NOT EXISTS compatible_equipment character varying(255),
    ADD COLUMN IF NOT EXISTS storage_location character varying(255),
    ADD COLUMN IF NOT EXISTS is_critical boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS reorder_level integer DEFAULT 0,
    ADD COLUMN IF NOT EXISTS last_updated timestamp without time zone DEFAULT now(),
    ADD COLUMN IF NOT EXISTS currency character varying(10) DEFAULT 'USD',
    ADD COLUMN IF NOT EXISTS remarks text;
-- Create index for category if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_spareparts_category ON public.spareparts(category);
-- Update existing records to have a default category
UPDATE public.spareparts
SET category = 'General'
WHERE category IS NULL;
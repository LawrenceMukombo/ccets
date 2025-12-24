-- Location: supabase/migrations/20251215120953_iga_facilities_equipment.sql
-- Schema Analysis: Creating fresh schema for IGA facility and equipment management
-- Integration Type: New module - Complete facility and equipment tracking system
-- Dependencies: None (fresh start)

-- ==================================================================================
-- 1. CUSTOM TYPES
-- ==================================================================================

-- ==================================================================================
-- 2. CORE TABLES (No foreign keys)
-- ==================================================================================

-- Provinces table
CREATE TABLE public.provinces (
    province_id INTEGER PRIMARY KEY,
    province_name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ==================================================================================
-- 3. DEPENDENT TABLES (With foreign keys)
-- ==================================================================================

-- Districts table (depends on provinces)
CREATE TABLE public.districts (
    district_id SERIAL PRIMARY KEY,
    district_name TEXT NOT NULL,
    province_id INTEGER REFERENCES public.provinces(province_id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Facilities table (depends on provinces and districts)
CREATE TABLE public.facilities (
    facility_id INTEGER PRIMARY KEY,
    facility_name TEXT NOT NULL,
    facility_code TEXT,
    province_id INTEGER REFERENCES public.provinces(province_id) ON DELETE SET NULL,
    district_id INTEGER REFERENCES public.districts(district_id) ON DELETE SET NULL,
    gps_coordinates TEXT,
    level INTEGER DEFAULT 0,
    type TEXT,
    is_functioning BOOLEAN DEFAULT true,
    ownership TEXT,
    population_number INTEGER DEFAULT 0,
    children_number INTEGER DEFAULT 0,
    transport_mode TEXT,
    power_source TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Equipment/Items table (depends on facilities)
CREATE TABLE public.equipment (
    equipment_id INTEGER PRIMARY KEY,
    facility_id INTEGER REFERENCES public.facilities(facility_id) ON DELETE CASCADE,
    item_class TEXT,
    item_type TEXT,
    manufacturer TEXT,
    model TEXT,
    serial_number TEXT,
    year_installed INTEGER,
    is_functioning BOOLEAN DEFAULT true,
    item_code TEXT,
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ==================================================================================
-- 4. INDEXES
-- ==================================================================================

-- Districts indexes
CREATE INDEX idx_districts_province_id ON public.districts(province_id);
CREATE INDEX idx_districts_name ON public.districts(district_name);

-- Facilities indexes
CREATE INDEX idx_facilities_province_id ON public.facilities(province_id);
CREATE INDEX idx_facilities_district_id ON public.facilities(district_id);
CREATE INDEX idx_facilities_code ON public.facilities(facility_code);
CREATE INDEX idx_facilities_level ON public.facilities(level);
CREATE INDEX idx_facilities_type ON public.facilities(type);

-- Equipment indexes
CREATE INDEX idx_equipment_facility_id ON public.equipment(facility_id);
CREATE INDEX idx_equipment_item_class ON public.equipment(item_class);
CREATE INDEX idx_equipment_item_type ON public.equipment(item_type);
CREATE INDEX idx_equipment_is_deleted ON public.equipment(is_deleted);

-- ==================================================================================
-- 5. RLS (Row Level Security) Setup
-- ==================================================================================

ALTER TABLE public.provinces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.districts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;

-- ==================================================================================
-- 6. RLS POLICIES
-- ==================================================================================

-- Public read access for provinces (reference data)
CREATE POLICY "public_read_provinces"
ON public.provinces
FOR SELECT
TO public
USING (true);

-- Public read access for districts (reference data)
CREATE POLICY "public_read_districts"
ON public.districts
FOR SELECT
TO public
USING (true);

-- Public read access for facilities
CREATE POLICY "public_read_facilities"
ON public.facilities
FOR SELECT
TO public
USING (true);

-- Public read access for equipment
CREATE POLICY "public_read_equipment"
ON public.equipment
FOR SELECT
TO public
USING (true);

-- Admin users can manage all data (for data sync operations)
-- Note: This assumes an admin role will be set up for sync operations
CREATE POLICY "admin_manage_provinces"
ON public.provinces
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "admin_manage_districts"
ON public.districts
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "admin_manage_facilities"
ON public.facilities
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "admin_manage_equipment"
ON public.equipment
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- ==================================================================================
-- 7. FUNCTIONS FOR DATA SYNCHRONIZATION
-- ==================================================================================

-- Function to get or create province
CREATE OR REPLACE FUNCTION public.get_or_create_province(p_province_id INTEGER, p_province_name TEXT DEFAULT NULL)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_province_id INTEGER;
BEGIN
    -- Check if province exists
    SELECT province_id INTO v_province_id
    FROM public.provinces
    WHERE province_id = p_province_id;
    
    -- If not found, create placeholder
    IF v_province_id IS NULL THEN
        INSERT INTO public.provinces (province_id, province_name)
        VALUES (
            p_province_id,
            COALESCE(p_province_name, 'Province ' || p_province_id::TEXT)
        )
        ON CONFLICT (province_id) DO NOTHING
        RETURNING province_id INTO v_province_id;
    END IF;
    
    RETURN v_province_id;
END;
$$;

-- Function to get or create district
CREATE OR REPLACE FUNCTION public.get_or_create_district(p_district_name TEXT, p_province_id INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_district_id INTEGER;
BEGIN
    -- Check if district exists
    SELECT district_id INTO v_district_id
    FROM public.districts
    WHERE district_name = p_district_name
    AND province_id = p_province_id;
    
    -- If not found, create new district
    IF v_district_id IS NULL THEN
        INSERT INTO public.districts (district_name, province_id)
        VALUES (p_district_name, p_province_id)
        RETURNING district_id INTO v_district_id;
    END IF;
    
    RETURN v_district_id;
END;
$$;

-- Function to upsert facility
CREATE OR REPLACE FUNCTION public.upsert_facility(
    p_facility_id INTEGER,
    p_facility_name TEXT,
    p_facility_code TEXT,
    p_province_id INTEGER,
    p_district_id INTEGER,
    p_gps_coordinates TEXT,
    p_level INTEGER,
    p_type TEXT,
    p_is_functioning BOOLEAN,
    p_ownership TEXT,
    p_population_number INTEGER,
    p_children_number INTEGER,
    p_transport_mode TEXT,
    p_power_source TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.facilities (
        facility_id, facility_name, facility_code,
        province_id, district_id, gps_coordinates,
        level, type, is_functioning, ownership,
        population_number, children_number,
        transport_mode, power_source, updated_at
    ) VALUES (
        p_facility_id, p_facility_name, p_facility_code,
        p_province_id, p_district_id, p_gps_coordinates,
        p_level, p_type, p_is_functioning, p_ownership,
        p_population_number, p_children_number,
        p_transport_mode, p_power_source, CURRENT_TIMESTAMP
    )
    ON CONFLICT (facility_id) DO UPDATE SET
        facility_name = EXCLUDED.facility_name,
        facility_code = EXCLUDED.facility_code,
        province_id = EXCLUDED.province_id,
        district_id = EXCLUDED.district_id,
        gps_coordinates = EXCLUDED.gps_coordinates,
        level = EXCLUDED.level,
        type = EXCLUDED.type,
        is_functioning = EXCLUDED.is_functioning,
        ownership = EXCLUDED.ownership,
        population_number = EXCLUDED.population_number,
        children_number = EXCLUDED.children_number,
        transport_mode = EXCLUDED.transport_mode,
        power_source = EXCLUDED.power_source,
        updated_at = CURRENT_TIMESTAMP;
END;
$$;

-- Function to upsert equipment
CREATE OR REPLACE FUNCTION public.upsert_equipment(
    p_equipment_id INTEGER,
    p_facility_id INTEGER,
    p_item_class TEXT,
    p_item_type TEXT,
    p_manufacturer TEXT,
    p_model TEXT,
    p_serial_number TEXT,
    p_year_installed INTEGER,
    p_is_functioning BOOLEAN,
    p_item_code TEXT,
    p_is_deleted BOOLEAN
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.equipment (
        equipment_id, facility_id, item_class, item_type,
        manufacturer, model, serial_number, year_installed,
        is_functioning, item_code, is_deleted, updated_at
    ) VALUES (
        p_equipment_id, p_facility_id, p_item_class, p_item_type,
        p_manufacturer, p_model, p_serial_number, p_year_installed,
        p_is_functioning, p_item_code, p_is_deleted, CURRENT_TIMESTAMP
    )
    ON CONFLICT (equipment_id) DO UPDATE SET
        facility_id = EXCLUDED.facility_id,
        item_class = EXCLUDED.item_class,
        item_type = EXCLUDED.item_type,
        manufacturer = EXCLUDED.manufacturer,
        model = EXCLUDED.model,
        serial_number = EXCLUDED.serial_number,
        year_installed = EXCLUDED.year_installed,
        is_functioning = EXCLUDED.is_functioning,
        item_code = EXCLUDED.item_code,
        is_deleted = EXCLUDED.is_deleted,
        updated_at = CURRENT_TIMESTAMP;
END;
$$;

-- ==================================================================================
-- 8. SAMPLE/MOCK DATA
-- ==================================================================================

DO $$
DECLARE
    province1_id INTEGER := 1;
    province2_id INTEGER := 2;
    district1_id INTEGER;
    district2_id INTEGER;
    district3_id INTEGER;
    facility1_id INTEGER := 1001;
    facility2_id INTEGER := 1002;
    facility3_id INTEGER := 1003;
BEGIN
    -- Insert sample provinces
    INSERT INTO public.provinces (province_id, province_name) VALUES
        (province1_id, 'Eastern Cape'),
        (province2_id, 'Western Cape')
    ON CONFLICT (province_id) DO NOTHING;

    -- Insert sample districts (fixed: separate INSERT statements to avoid multiple row error)
    INSERT INTO public.districts (district_name, province_id) 
    VALUES ('Nelson Mandela Bay', province1_id)
    ON CONFLICT DO NOTHING
    RETURNING district_id INTO district1_id;
    
    -- If district already exists, get its ID
    IF district1_id IS NULL THEN
        SELECT district_id INTO district1_id 
        FROM public.districts 
        WHERE district_name = 'Nelson Mandela Bay' AND province_id = province1_id
        LIMIT 1;
    END IF;

    INSERT INTO public.districts (district_name, province_id) 
    VALUES ('Sarah Baartman', province1_id)
    ON CONFLICT DO NOTHING
    RETURNING district_id INTO district2_id;
    
    IF district2_id IS NULL THEN
        SELECT district_id INTO district2_id 
        FROM public.districts 
        WHERE district_name = 'Sarah Baartman' AND province_id = province1_id
        LIMIT 1;
    END IF;

    INSERT INTO public.districts (district_name, province_id) 
    VALUES ('City of Cape Town', province2_id)
    ON CONFLICT DO NOTHING
    RETURNING district_id INTO district3_id;
    
    IF district3_id IS NULL THEN
        SELECT district_id INTO district3_id 
        FROM public.districts 
        WHERE district_name = 'City of Cape Town' AND province_id = province2_id
        LIMIT 1;
    END IF;

    -- Insert sample facilities
    INSERT INTO public.facilities (
        facility_id, facility_name, facility_code,
        province_id, district_id, gps_coordinates,
        level, type, is_functioning, ownership,
        population_number, children_number,
        transport_mode, power_source
    ) VALUES
        (
            facility1_id, 'Livingstone Hospital', 'LH001',
            province1_id, district1_id, '-33.9608, 25.6022',
            3, 'Regional Hospital', true, 'Provincial',
            150000, 25000,
            'Road', 'Grid'
        ),
        (
            facility2_id, 'Uitenhage Provincial Hospital', 'UPH001',
            province1_id, district1_id, '-33.7576, 25.3971',
            2, 'District Hospital', true, 'Provincial',
            80000, 15000,
            'Road', 'Grid'
        ),
        (
            facility3_id, 'Groote Schuur Hospital', 'GSH001',
            province2_id, district3_id, '-33.9400, 18.4644',
            4, 'Tertiary Hospital', true, 'Provincial',
            500000, 80000,
            'Road/Air', 'Grid'
        )
    ON CONFLICT (facility_id) DO NOTHING;

    -- Insert sample equipment
    INSERT INTO public.equipment (
        equipment_id, facility_id, item_class, item_type,
        manufacturer, model, serial_number, year_installed,
        is_functioning, item_code, is_deleted
    ) VALUES
        (
            10001, facility1_id, 'Diagnostic', 'X-Ray Machine',
            'Siemens', 'Multix Pro', 'XR-2023-001', 2023,
            true, 'DIAG-XR-001', false
        ),
        (
            10002, facility1_id, 'Laboratory', 'Blood Analyzer',
            'Abbott', 'Alinity ci-series', 'AB-2022-045', 2022,
            true, 'LAB-BA-002', false
        ),
        (
            10003, facility2_id, 'Diagnostic', 'Ultrasound',
            'GE Healthcare', 'LOGIQ E10', 'US-2023-078', 2023,
            true, 'DIAG-US-003', false
        ),
        (
            10004, facility3_id, 'Surgical', 'Anesthesia Machine',
            'Dräger', 'Fabius GS Premium', 'AN-2021-156', 2021,
            true, 'SURG-AN-004', false
        ),
        (
            10005, facility3_id, 'Diagnostic', 'CT Scanner',
            'Philips', 'Ingenuity CT', 'CT-2022-089', 2022,
            true, 'DIAG-CT-005', false
        )
    ON CONFLICT (equipment_id) DO NOTHING;

END $$;

-- ==================================================================================
-- 9. COMMENTS
-- ==================================================================================

COMMENT ON TABLE public.provinces IS 'Stores province information for facility geographical organization';
COMMENT ON TABLE public.districts IS 'Stores district information within provinces';
COMMENT ON TABLE public.facilities IS 'Stores healthcare facility information synchronized from IGA API';
COMMENT ON TABLE public.equipment IS 'Stores equipment/item information for each facility';

COMMENT ON FUNCTION public.get_or_create_province IS 'Helper function to get existing province or create placeholder';
COMMENT ON FUNCTION public.get_or_create_district IS 'Helper function to get existing district or create new one';
COMMENT ON FUNCTION public.upsert_facility IS 'Insert or update facility information';
COMMENT ON FUNCTION public.upsert_equipment IS 'Insert or update equipment information';
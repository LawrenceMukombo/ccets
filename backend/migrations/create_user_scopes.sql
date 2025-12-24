CREATE TABLE IF NOT EXISTS user_scopes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    region_id INTEGER REFERENCES regions(region_id),
    province_id INTEGER REFERENCES provinces(province_id),
    district_id INTEGER REFERENCES districts(district_id),
    facility_id INTEGER REFERENCES facilities(facility_id),
    created_at TIMESTAMP DEFAULT NOW(),
    -- Constraint to ensure only one scope level is set per row
    CONSTRAINT one_scope_per_row CHECK (
        (
            region_id IS NOT NULL
            AND province_id IS NULL
            AND district_id IS NULL
            AND facility_id IS NULL
        )
        OR (
            region_id IS NULL
            AND province_id IS NOT NULL
            AND district_id IS NULL
            AND facility_id IS NULL
        )
        OR (
            region_id IS NULL
            AND province_id IS NULL
            AND district_id IS NOT NULL
            AND facility_id IS NULL
        )
        OR (
            region_id IS NULL
            AND province_id IS NULL
            AND district_id IS NULL
            AND facility_id IS NOT NULL
        )
    )
);
-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_scopes_user_id ON user_scopes(user_id);
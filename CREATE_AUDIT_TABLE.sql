-- Create Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id),
    action VARCHAR(50) NOT NULL,
    -- Created, Updated, Deleted, Viewed, Login, Logout
    entity_type VARCHAR(50) NOT NULL,
    -- Ticket, User, Facility, Equipment, etc.
    entity_id INTEGER,
    -- ID of the affected entity
    details JSONB,
    -- Flexible details about the change (old vs new values)
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
-- Index for faster filtering
CREATE INDEX IF NOT EXISTS idx_audit_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id);
-- Insert some initial mock data for testing
INSERT INTO audit_logs (
        user_id,
        action,
        entity_type,
        entity_id,
        details,
        ip_address,
        created_at
    )
SELECT u.user_id,
    'Login',
    'User',
    u.user_id,
    '{"status": "Success"}'::jsonb,
    '127.0.0.1',
    NOW() - (random() * interval '7 days')
FROM users u
LIMIT 20;
INSERT INTO audit_logs (
        user_id,
        action,
        entity_type,
        entity_id,
        details,
        ip_address,
        created_at
    )
SELECT u.user_id,
    'Created',
    'Ticket',
    floor(random() * 100 + 1)::int,
    '{"priority": "High"}'::jsonb,
    '127.0.0.1',
    NOW() - (random() * interval '7 days')
FROM users u
WHERE u.role_id IN (5, 6, 7) -- Officers/Techs/Managers
LIMIT 30;
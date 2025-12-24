-- Drop table if exists (or rename if you want to keep data, but for now we reset to match app)
DROP TABLE IF EXISTS audit_trail;
CREATE TABLE audit_trail (
    id SERIAL PRIMARY KEY,
    user_id INT,
    action VARCHAR(50),
    entity_type VARCHAR(50),
    entity_id VARCHAR(50),
    details TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- Index for faster filtering
CREATE INDEX idx_audit_created_at ON audit_trail(created_at);
CREATE INDEX idx_audit_user_id ON audit_trail(user_id);
CREATE INDEX idx_audit_action ON audit_trail(action);
CREATE INDEX idx_audit_entity ON audit_trail(entity_type, entity_id);
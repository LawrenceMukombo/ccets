-- Migration: Add Technician Workspace Features
-- Created: 2025-12-21
-- Description: Adds tables and columns needed for technician workspace functionality
-- ============================================================================
-- STEP 1: Add columns to tickets table for work tracking
-- ============================================================================
-- Add work tracking columns
ALTER TABLE tickets
ADD COLUMN IF NOT EXISTS work_started_at TIMESTAMP;
ALTER TABLE tickets
ADD COLUMN IF NOT EXISTS work_paused_at TIMESTAMP;
ALTER TABLE tickets
ADD COLUMN IF NOT EXISTS work_duration_seconds INTEGER DEFAULT 0;
ALTER TABLE tickets
ADD COLUMN IF NOT EXISTS resolution_notes TEXT;
ALTER TABLE tickets
ADD COLUMN IF NOT EXISTS work_performed TEXT;
ALTER TABLE tickets
ADD COLUMN IF NOT EXISTS closed_at TIMESTAMP;
-- Add index for faster queries on assigned tickets
CREATE INDEX IF NOT EXISTS idx_tickets_assigned_to ON tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
-- ============================================================================
-- STEP 2: Create spare_parts_requests table
-- ============================================================================
CREATE TABLE IF NOT EXISTS spare_parts_requests (
    request_id SERIAL PRIMARY KEY,
    ticket_id INTEGER NOT NULL REFERENCES tickets(ticket_id) ON DELETE CASCADE,
    requested_by INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    parts_list JSONB NOT NULL,
    -- Array of {name: string, quantity: number}
    notes TEXT,
    status VARCHAR(50) DEFAULT 'Pending',
    approved_by INTEGER REFERENCES users(user_id),
    approved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- Create indexes for spare parts requests
CREATE INDEX IF NOT EXISTS idx_spare_parts_ticket ON spare_parts_requests(ticket_id);
CREATE INDEX IF NOT EXISTS idx_spare_parts_requested_by ON spare_parts_requests(requested_by);
CREATE INDEX IF NOT EXISTS idx_spare_parts_status ON spare_parts_requests(status);
-- Add comment
COMMENT ON TABLE spare_parts_requests IS 'Tracks spare parts requests made by technicians for ticket repairs';
-- ============================================================================
-- STEP 3: Create ticket_escalations table
-- ============================================================================
CREATE TABLE IF NOT EXISTS ticket_escalations (
    escalation_id SERIAL PRIMARY KEY,
    ticket_id INTEGER NOT NULL REFERENCES tickets(ticket_id) ON DELETE CASCADE,
    escalated_by INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    escalated_to INTEGER REFERENCES users(user_id),
    -- Supervisor/manager
    reason VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'Pending',
    -- Pending, Acknowledged, Resolved
    resolved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- Create indexes for escalations
CREATE INDEX IF NOT EXISTS idx_escalations_ticket ON ticket_escalations(ticket_id);
CREATE INDEX IF NOT EXISTS idx_escalations_escalated_by ON ticket_escalations(escalated_by);
CREATE INDEX IF NOT EXISTS idx_escalations_escalated_to ON ticket_escalations(escalated_to);
CREATE INDEX IF NOT EXISTS idx_escalations_status ON ticket_escalations(status);
-- Add comment
COMMENT ON TABLE ticket_escalations IS 'Tracks ticket escalations from technicians to supervisors';
-- ============================================================================
-- STEP 4: Create ticket_work_notes table (optional but recommended)
-- ============================================================================
CREATE TABLE IF NOT EXISTS ticket_work_notes (
    note_id SERIAL PRIMARY KEY,
    ticket_id INTEGER NOT NULL REFERENCES tickets(ticket_id) ON DELETE CASCADE,
    created_by INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    note_text TEXT NOT NULL,
    note_type VARCHAR(50) DEFAULT 'work_log',
    -- work_log, internal, resolution
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- Create indexes for work notes
CREATE INDEX IF NOT EXISTS idx_work_notes_ticket ON ticket_work_notes(ticket_id);
CREATE INDEX IF NOT EXISTS idx_work_notes_created_by ON ticket_work_notes(created_by);
-- Add comment
COMMENT ON TABLE ticket_work_notes IS 'Stores work notes and logs added by technicians during ticket resolution';
-- ============================================================================
-- STEP 5: Create updated_at trigger function (if not exists)
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = CURRENT_TIMESTAMP;
RETURN NEW;
END;
$$ language 'plpgsql';
-- ============================================================================
-- STEP 6: Add triggers for updated_at columns
-- ============================================================================
-- Trigger for spare_parts_requests
DROP TRIGGER IF EXISTS update_spare_parts_requests_updated_at ON spare_parts_requests;
CREATE TRIGGER update_spare_parts_requests_updated_at BEFORE
UPDATE ON spare_parts_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- Trigger for ticket_escalations
DROP TRIGGER IF EXISTS update_ticket_escalations_updated_at ON ticket_escalations;
CREATE TRIGGER update_ticket_escalations_updated_at BEFORE
UPDATE ON ticket_escalations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- ============================================================================
-- STEP 7: Grant permissions (adjust role names as needed)
-- ============================================================================
-- Grant permissions to application role (adjust 'postgres' to your app role)
GRANT SELECT,
    INSERT,
    UPDATE,
    DELETE ON spare_parts_requests TO postgres;
GRANT SELECT,
    INSERT,
    UPDATE,
    DELETE ON ticket_escalations TO postgres;
GRANT SELECT,
    INSERT,
    UPDATE,
    DELETE ON ticket_work_notes TO postgres;
GRANT USAGE,
    SELECT ON SEQUENCE spare_parts_requests_request_id_seq TO postgres;
GRANT USAGE,
    SELECT ON SEQUENCE ticket_escalations_escalation_id_seq TO postgres;
GRANT USAGE,
    SELECT ON SEQUENCE ticket_work_notes_note_id_seq TO postgres;
-- ============================================================================
-- VERIFICATION QUERIES (uncomment to test)
-- ============================================================================
-- Check if columns were added
-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'tickets' 
-- AND column_name IN ('work_started_at', 'work_paused_at', 'work_duration_seconds', 'resolution_notes', 'work_performed');
-- Check if tables were created
-- SELECT tablename FROM pg_tables 
-- WHERE schemaname = 'public' 
-- AND tablename IN ('spare_parts_requests', 'ticket_escalations', 'ticket_work_notes');
-- Check indexes
-- SELECT indexname FROM pg_indexes 
-- WHERE tablename IN ('tickets', 'spare_parts_requests', 'ticket_escalations', 'ticket_work_notes');
COMMIT;
-- ============================================================================
-- ROLLBACK SCRIPT (if needed - save separately)
-- ============================================================================
-- ROLLBACK COMMANDS (DO NOT RUN UNLESS ROLLING BACK):
/*
 DROP TABLE IF EXISTS ticket_work_notes CASCADE;
 DROP TABLE IF EXISTS ticket_escalations CASCADE;
 DROP TABLE IF EXISTS spare_parts_requests CASCADE;
 
 ALTER TABLE tickets DROP COLUMN IF EXISTS work_started_at;
 ALTER TABLE tickets DROP COLUMN IF EXISTS work_paused_at;
 ALTER TABLE tickets DROP COLUMN IF EXISTS work_duration_seconds;
 ALTER TABLE tickets DROP COLUMN IF EXISTS resolution_notes;
 ALTER TABLE tickets DROP COLUMN IF EXISTS work_performed;
 ALTER TABLE tickets DROP COLUMN IF EXISTS closed_at;
 
 DROP INDEX IF EXISTS idx_tickets_assigned_to;
 DROP INDEX IF EXISTS idx_tickets_status;
 */
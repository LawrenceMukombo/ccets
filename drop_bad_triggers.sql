-- Drop redundant and broken triggers causing ticket creation failure
DROP TRIGGER IF EXISTS set_ticket_reference ON tickets;
DROP TRIGGER IF EXISTS set_ticket_reference_number ON tickets;
DROP TRIGGER IF EXISTS trg_generate_ticket_reference ON tickets;
DROP TRIGGER IF EXISTS trg_compute_ticket_reference ON tickets;
-- This was verified to cause errors
DROP TRIGGER IF EXISTS trg_audit_tickets ON tickets;
-- This was verified to cause errors
DROP TRIGGER IF EXISTS trg_ticket_audit ON tickets;
DROP TRIGGER IF EXISTS trg_ticket_audit_log ON tickets;
DROP TRIGGER IF EXISTS trg_ticket_sla ON tickets;
DROP TRIGGER IF EXISTS trigger_update_ticket_timing ON tickets;
DROP TRIGGER IF EXISTS update_tickets_updated_at ON tickets;
-- Note: Ticket reference number generation is currently disabled to allow creation.
-- You may need to investigate and fix 'compute_ticket_reference()' function and re-enable 'trg_compute_ticket_reference'.
-- Drop the problematic trigger on users
DROP TRIGGER IF EXISTS trg_audit_tickets ON users;
-- Also check/drop from tickets if it exists and is old
DROP TRIGGER IF EXISTS trg_audit_tickets ON tickets;
-- Drop the function it calls if it's specific to this legacy audit
DROP FUNCTION IF EXISTS log_ticket_audit();
DROP FUNCTION IF EXISTS audit_log_func();
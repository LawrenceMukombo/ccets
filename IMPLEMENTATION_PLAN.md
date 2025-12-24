# Implementation Plan: Ticket Actions & Technician Workspace

## Phase 1: Add Ticket Actions Column to Tickets Page

### 1.1 Update Tickets.jsx
- Add "Actions" column header to the table
- Create Actions dropdown/menu component for each row
- Implement action handlers:
  - **Assign**: Open modal to select technician
  - **Reassign**: Open modal to change assigned technician
  - **View**: Navigate to ticket detail view or open modal
  - **Edit**: Open edit modal
  - **Delete**: Show confirmation and delete ticket

### 1.2 Create Modals/Components
- `AssignTicketModal.jsx`: Dropdown to select technician from list
- `TicketDetailsModal.jsx`: Full ticket details in modal
- `EditTicketModal.jsx`: Form to edit ticket fields
- `DeleteConfirmationModal.jsx`: Confirm delete action

---

## Phase 2: Create Technician Workspace Page

### 2.1 New Page: TechnicianWorkspace.jsx

#### Features:
- Show only tickets assigned to logged-in technician
- Ticket card view with actions
- Search and filter capabilities

#### Actions per Ticket:
1. **View Details**: Full ticket information
2. **Start Work**: Begin work timer
3. **Pause Work**: Pause timer
4. **Request Spare Parts**: Form to list parts
5. **Escalate**: Escalation form
6. **Add Notes**: Work notes
7. **Resolve**: Mark resolved
8. **Close**: Final closure

### 2.2 Components
- `TechnicianWorkspace.jsx`
- `TechnicianTicketCard.jsx`
- `SparePartsRequestModal.jsx`
- `EscalateTicketModal.jsx`
- `ResolveTicketModal.jsx`

---

## Implementation Order:
1. Add Actions column to Tickets page
2. Create basic modals
3. Create Technician Workspace page
4. Add backend API endpoints
5. Test functionality

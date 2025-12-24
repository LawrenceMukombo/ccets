# CCETS End-to-End (E2E) Testing Guide

Use this checklist to validate the system functionality with your colleagues.

## 1. User Authentication
- [ ] **Login**: Successfully log in with a valid Technician and Admin account.
- [ ] **Invalid Login**: Try logging in with incorrect password (should show error).
- [ ] **Logout**: Verify logging out redirects to login page and clears session.

## 2. Dashboard (Operations Overview)
- [ ] **KPI Cards**: Verify "Total Open", "New", "Avg Response" cards show non-zero data.
- [ ] **Filtering**:
    - [ ] Change **Date Range** (e.g., Last 12 Months) -> Verify spinners appear and numbers update.
    - [ ] Change **Location** (e.g., select a Region) -> Verify map and charts update.
- [ ] **Charts**: Hover over "Ticket Trends" and "Backlog" charts to see tooltips.
- [ ] **Interactive Drill-down**: Click a "High Risk Facility" in the bottom right table -> Verify dashboard filters to that facility.

## 3. Geospatial View
- [ ] **Map Loading**: Verify map loads with markers.
- [ ] **Interactivity**: Click a marker -> Verify popup shows facility name and equipment details.
- [ ] **Map Controls**: Test Zoom, Fullscreen, and "Reset View" buttons.

## 4. Ticket Management
- [ ] **Create Ticket**:
    - Navigate to equipment list or "New Ticket".
    - Submit form -> Verify success message.
- [ ] **View Ticket**: Open the new ticket from the "Ticket List" tab.
- [ ] **Assign Ticket**:
    - Open details -> Click "Assign".
    - Select a user -> Confirm.
    - Verify status changes to "Assigned".
- [ ] **Edit Ticket**: Update priority or description.
- [ ] **Resolve/Close**: Move status to Resolved, then Closed.

## 5. Reports & Analytics
- [ ] **Export**: Try exporting a report (if enabled) or viewing the "Analytics" tab tables.
- [ ] **Data Consistency**: Ensure the numbers on the "Reports" page match the Dashboard.

## 6. Feedback Loop
- **Bugs**: Record any console errors (F12) or UI glitches.
- **Usability**: Note any confusing workflow steps.

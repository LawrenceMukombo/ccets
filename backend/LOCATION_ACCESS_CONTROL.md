# Location-Based Access Control (LBAC) System

## Overview
The CCETS platform implements strict **location-based access control** to ensure users can ONLY access resources within their assigned geographical scope.

## Security Principle
**Users can ONLY view and interact with tickets, facilities, and resources based on:**
1. Their assigned location(s) (Region, Province, District, Facility)
2. Their granted permissions/user rights

## Access Hierarchy

### 1. **National Level**
- **Who**: Admin, System Administrator, National Manager
- **Access**: ALL locations countrywide
- **Filter**: No geographical restrictions

### 2. **Regional Level**
- **Example**: MOMASE Region User
- **Access**: ONLY tickets/facilities in MOMASE region
- **Cannot Access**: Southern Region, Islands Region, Highlands Region, etc.

### 3. **Provincial Level**
- **Example**: Madang Province User
- **Access**: ONLY tickets/facilities in Madang Province
- **Cannot Access**: East Sepik, Morobe, or any other province

### 4. **District Level**
- **Example**: Bogia District User
- **Access**: ONLY tickets/facilities in Bogia District
- **Cannot Access**: Other districts even within same province

###  5. **Facility Level**
- **Example**: Bogia Health Centre Technician
- **Access**: ONLY tickets for Bogia Health Centre
- **Cannot Access**: Any other facility

## Implementation

### Backend Components

#### 1. Database Schema
```sql
-- user_scopes table stores geographical assignments
CREATE TABLE user_scopes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id),
    region_id INTEGER REFERENCES regions(region_id),
    province_id INTEGER REFERENCES provinces(province_id),
    district_id INTEGER REFERENCES districts(district_id),
    facility_id INTEGER REFERENCES facilities(facility_id)
);
```

#### 2. Middleware (`locationAccess.js`)
- **`attachLocationScope`**: Fetches user's location scopes and attaches to `req.user.locationScope`
- **`buildLocationFilter`**: Generates SQL WHERE conditions based on scope

#### 3. Protected Routes
All ticket and facility routes use:
```javascript
router.get('/', authMiddleware, attachLocationScope, controller.method);
```

#### 4. Query Filtering
Controllers dynamically build SQL with location filters:
```javascript
// Example for Provincial User in Madang (province_id = 5)
WHERE ticket.province_id = 5 OR facility.province_id = 5
```

## Examples

### Scenario 1: MOMASE Region Technician
**User**: John Doe, Technician, MOMASE Region  
**Scope**: `region_id = 1` (MOMASE)

**Can Access**:
- Tickets in Madang, Morobe, East Sepik
- Facilities in MOMASE region

**Cannot Access**:
- Tickets in Port Moresby (Southern Region)
- Tickets in Lae (if Lae is in different region)
- National-level reports (unless permission granted)

### Scenario 2: Provincial ICT Officer
**User**: Jane Smith, ICT Officer, Madang Province  
**Scope**: `province_id = 5` (Madang)

**Can Access**:
- All tickets in Madang Province
- All facilities in Madang Province
- District reports for Madang districts

**Cannot Access**:
- Tickets in neighboring provinces
- Other provincial data

### Scenario 3: Facility Manager
**User**: Bob Brown, Manager, Bogia HC  
**Scope**: `facility_id = 123` (Bogia HC)

**Can Access**:
- Only tickets for Bogia HC
- Only equipment for Bogia HC

**Cannot Access**:
- Any other facility
- District or provincial dashboards

## Administration

### Assigning Location Scopes

Administrators can assign scopes via User Management:

```sql
-- Assign user to Madang Province
INSERT INTO user_scopes (user_id, province_id)
VALUES (42, 5);

-- Assign user to multiple districts
INSERT INTO user_scopes (user_id, district_id) VALUES
(42, 10), (42, 11), (42, 12);
```

### National Access

Users with these roles bypass location filtering:
- Admin
- System Administrator
- National Manager
- Super Admin

## Frontend Implications

Frontend components (Dashboard, Map, Tickets) automatically receive filtered data. No additional frontend filtering needed (though UI can apply additional client-side filters for UX).

## Audit & Compliance

All API calls are logged with:
- User ID
- Location scope level
- Accessed resources
- Timestamp

This ensures compliance and traceability for security audits.

## Testing Scenarios

### Test 1: Regional User Cannot Access Other Regions
1. Login as MOMASE user
2. Attempt to fetch tickets
3. **Expected**: Only MOMASE tickets returned
4. **Verify**: Southern region tickets NOT visible

### Test 2: Provincial User Isolation
1. Login as Madang user
2. View Dashboard
3. **Expected**: Only Madang data in charts/maps
4. **Verify**: East Sepik data NOT present

### Test 3: National User Full Access
1. Login as Admin
2. View Dashboard
3. **Expected**: ALL locations visible
4. **Verify**: All regions/provinces/districts present

## Security Best Practices

1. **Never** bypass location checks in custom queries
2. **Always** use `attachLocationScope` middleware
3. **Validate** location scope on EVERY data retrieval
4. **Log** access attempts for audit trails
5. **Restrict** scope assignment to authorized administrators only

## Migration Path

For existing deployments:
1. Run `migrations/create_user_scopes.sql`
2. Assign scopes to all existing users
3. Test with non-admin users first
4. Deploy to production with monitoring

---

**Last Updated**: 2025-12-21  
**Version**: 1.0  
**Maintainer**: CCETS Development Team

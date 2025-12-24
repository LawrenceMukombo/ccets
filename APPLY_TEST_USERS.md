# =====================================================================
# HOW TO APPLY TEST USER ROLES AND LOCATION SCOPES
# =====================================================================

## OPTION 1: Using existing psql terminal (RECOMMENDED)
## ---------------------------------------------------------------
## In one of your already-connected psql terminals, run:

\i backend/migrations/setup_test_users_simple.sql


## OPTION 2: New terminal connection
## ---------------------------------------------------------------
## In PowerShell, run:

$env:PGPASSWORD='password_change_me_in_prod'
psql -h localhost -U postgres -d png_ccets -f backend/migrations/setup_test_users_simple.sql


## OPTION 3: Manual Copy-Paste
## ---------------------------------------------------------------
## 1. Open backend/migrations/setup_test_users_simple.sql
## 2. Copy ALL the content
## 3. Paste into your psql terminal
## 4. Press Enter


## VERIFICATION
## ---------------------------------------------------------------
## After running, verify with:

SELECT u.user_id, u.username, r.role_name, 
       CASE 
         WHEN us.region_id IS NOT NULL THEN 'Region ' || us.region_id
         WHEN us.province_id IS NOT NULL THEN 'Province ' || us.province_id
         WHEN us.district_id IS NOT NULL THEN 'District ' || us.district_id
         WHEN us.facility_id IS NOT NULL THEN 'Facility ' || us.facility_id
         ELSE 'National'
       END as location_scope
FROM users u
LEFT JOIN roles r ON u.role_id = r.role_id
LEFT JOIN user_scopes us ON u.user_id = us.user_id
WHERE u.user_id <= 50
ORDER BY u.user_id;


## EXPECTED RESULTS
## ---------------------------------------------------------------
## - Users 1-3: Admin/National (no location restrictions)
## - Users 4-7: Regional Coordinators (assigned to regions)
## - Users 8-15: Provincial Officers (assigned to provinces)
## - Users 16-25: District Officers (assigned to districts)
## - Users 26-50: Technicians/Managers (assigned to facilities)

## DATABASE UPDATED
## ---------------------------------------------------------------
## This will update: png_ccets (your LOCAL database)
## =====================================================================

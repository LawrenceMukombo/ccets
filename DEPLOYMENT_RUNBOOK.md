# 📘 CCETS Standalone Deployment & Operations Runbook

This runbook documents production deployment procedures, automated backup/restore scripts, database migration execution, rollback protocols, and the production launch checklist for the Cold Chain Equipment Ticketing System (CCETS).

---

## 🏗️ 1. Infrastructure Requirements

- **Runtime Engine:** Node.js v18+ / npm v10+
- **Database Engine:** PostgreSQL 15+ with PostGIS extension (e.g. `postgis/postgis:15-3.4-alpine` container)
- **Containerization:** Docker Engine v24+ and Docker Compose v2+
- **Host System Memory:** 4GB RAM minimum

---

## 🔒 2. Production Environment Settings

Before deployment, ensure that the `.env` file in the backend contains production-grade secrets.

### Backend Configurations (`backend/.env`):
```ini
PORT=5050
NODE_ENV=production
DB_USER=ccets_user
DB_PASSWORD=YOUR_SECURE_PRODUCTION_DB_PASSWORD
DB_HOST=localhost
DB_PORT=5433
DB_NAME=png_ccets
JWT_SECRET=YOUR_SECURE_JWT_SECRET_STRING

# Deployment & Instance Config
CCETS_DEPLOYMENT_MODE=global_multi_tenant
CCETS_INSTANCE_NAME="CCETS Standalone Production"
CCETS_DEFAULT_TENANT=png
```

---

## 🗄️ 3. Database Backup Operations

### A. Automated Daily Backup Script
Run the following shell script (scheduled via Cron on Linux or Task Scheduler on Windows) to create a compressed PostGIS-compatible database dump.

**Windows Command (`backup.ps1`):**
```powershell
$backupDir = "C:\backups\db"
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupFile = "$backupDir\ccets_backup_$timestamp.dump"

# Run PostgreSQL pg_dump utility
& "C:\Program Files\PostgreSQL\15\bin\pg_dump.exe" -h localhost -p 5433 -U postgres -d png_ccets -F c -b -v -f $backupFile
```

**Linux Command (`backup.sh`):**
```bash
#!/bin/bash
BACKUP_DIR="/var/backups/db"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/ccets_backup_$TIMESTAMP.dump"

# Run pg_dump
PGPASSWORD="password_change_me" pg_dump -h localhost -p 5433 -U postgres -d png_ccets -F c -b -v -f "$BACKUP_FILE"
```

---

## 🔄 4. Database Restore Operations

In the event of recovery or relocation, restore the database dump using `pg_restore`.

**Windows Restore Command:**
```powershell
& "C:\Program Files\PostgreSQL\15\bin\pg_restore.exe" -h localhost -p 5433 -U postgres -d png_ccets -c --if-exists -v "C:\backups\db\ccets_backup_20260713.dump"
```

**Linux Restore Command:**
```bash
PGPASSWORD="password_change_me" pg_restore -h localhost -p 5433 -U postgres -d png_ccets -c --if-exists -v "/var/backups/db/ccets_backup_20260713.dump"
```

> [!CAUTION]
> **Data Loss Warning:** The `-c --if-exists` flags will drop existing tables in target schemas before recreating them. Always back up your active data ledger before running a restore.

---

## 🚀 5. Database Schema Migrations & Upgrade Procedures

When deploying upgrades that modify schemas or insert seed records:

### A. Execute Multi-Tenant Migrations
To run schema updates across all active tenants (PNG, Zambia, etc.):
```bash
cd backend
$env:NODE_PATH="node_modules"  # For Windows
node src/scripts/run_multi_tenant_migration.js
```

### B. Add Privileges Restriction (Security Lockdown)
After database initialization or migrations, run the security script to revoke superuser attributes and apply schema privileges mapping:
```bash
psql -h localhost -p 5433 -U postgres -d png_ccets -f backend/migrations/restrict_db_permissions.sql
```

---

## ⏪ 6. Reversion and Rollback Protocols

If a release introduces critical bugs, follow this sequence to revert to the last stable state:

### Step 1: Revert Code Files
Using Git, revert to the last stable commit tag:
```bash
git checkout tags/v1.2.0
```

### Step 2: Rollback Database Schemas
If database columns were modified, restore the database backup taken immediately prior to the deployment:
```bash
# 1. Clean the database
psql -h localhost -p 5433 -U postgres -d png_ccets -c "DROP SCHEMA IF EXISTS png CASCADE; DROP SCHEMA IF EXISTS zambia CASCADE;"

# 2. Restore prior dump
pg_restore -h localhost -p 5433 -U postgres -d png_ccets -v "/var/backups/db/pre_deploy_backup.dump"
```

### Step 3: Restart Services
Restart the app process using PM2 or Docker Compose:
```bash
pm2 restart ccets-backend
```

---

## 📋 7. Production Launch Checklist

- [ ] **Secrets Rotation:** Validate that default passwords in `.env` are rotated to custom high-entropy credentials.
- [ ] **Rate Limiting Active:** Confirm rate-limiter logs show successful intercept on `/auth/login` for consecutive requests.
- [ ] **Database Locked Down:** Verify `ccets_user` does not have administrative superuser permissions (`SELECT rolsuper FROM pg_roles WHERE rolname = 'ccets_user'` returns false).
- [ ] **Secure Ports Mapping:** Host port `5433` should only be bound to `127.0.0.1` and not exposed to public interfaces.
- [ ] **Nginx Reverse Proxy:** Mount SSL/TLS termination on Nginx listening on port `443` proxying traffic down to Vite (`5173`) and Express (`5050`).

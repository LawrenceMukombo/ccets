# CCETS Deployment Guide

This guide details how to deploy the **Cold Chain Equipment Ticketing System (CCETS)** for production or staging environments, allowing colleagues to access and test the system.

## 1. Prerequisites
Ensure the target server or machine has the following installed:
- **Node.js** (v16 or higher)
- **PostgreSQL** (v13 or higher)
- **Git** (to clone the repository)
- **PM2** (Optional but recommended for process management: `npm install -g pm2`)

## 2. Environment Configuration

### Backend
1. Navigate to `backend/` directory.
2. Create or verify `.env` file matches production credentials:
   ```env
   PORT=5050
   DB_USER=your_db_user
   DB_PASSWORD=your_db_password
   DB_HOST=localhost
   DB_NAME=png_ccets
   DB_PORT=5432
   JWT_SECRET=your_secure_production_secret
   # Email settings if applicable
   ```

### Frontend
1. Navigate to the root directory.
2. Create `.env.production` (if needed) or ensure the build script knows the backend URL.
   - Typically, for a simple deployment, we might serve the frontend *through* the backend or use a reverse proxy (Nginx).
   - If running separately, ensure the frontend calls the correct API URL.

## 3. Installation & Build

### Backend
```bash
cd backend
npm install
# Ensure database migrations are run
# psql -U postgres -d png_ccets -f database_schema.sql (if starting fresh)
```

### Frontend
```bash
cd ..
npm install
npm run build
```
This generates a `dist/` folder containing the optimized production assets.

## 4. Running the Application

### Option A: Quick Local Network Sharing (For Testing)
If you just want to run it on your machine and have colleagues on the same Wi-Fi access it:

1. **Backend**:
   ```bash
   cd backend
   npm start
   ```
2. **Frontend**:
   ```bash
   cd ..
   npm run preview -- --host
   ```
   *The `--host` flag exposes the app on your local network IP (e.g., `http://192.168.1.5:4173`). Share this URL with colleagues.*

### Option B: Production Server (PM2)
1. **Serve Backend**:
   ```bash
   cd backend
   pm2 start src/server.js --name "ccets-backend"
   ```
2. **Serve Frontend**:
   You can serve the `dist` folder using a static server or Nginx.
   ```bash
   npm install -g serve
   pm2 start serve --name "ccets-frontend" -- -s dist -l 3000
   ```

## 5. Troubleshooting
- **Connection Refused**: Check firewall settings to allow traffic on ports 3000, 4173, and 5050.
- **Database Errors**: Verify `pg_hba.conf` allows connections from the backend.

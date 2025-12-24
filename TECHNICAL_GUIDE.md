# CCETS Technical Documentation

## 1. System Overview

**CCETS** (Cold Chain Equipment Ticketing System) is a full-stack web application designed to manage and track maintenance tickets for cold chain equipment (fridges, freezers) across health facilities in Papua New Guinea.

The system facilitates:
- **Fault Reporting:** Users can report issues with equipment.
- **Ticket Management:** Creating, assigning, updating, and resolving maintenance tickets.
- **Audit Logging:** Comprehensive tracking of all system actions for accountability.
- **Location-Based Access:** Data visibility scoped to National, Provincial, or District levels.

---

## 2. Technical Stack

### **Frontend**
- **Framework:** React (v18+)
- **Build Tool:** Vite
- **Styling:** CSS Modules / Vanilla CSS
- **State Management:** React Hooks (`useState`, `useEffect`, `useContext`)
- **Routing:** React Router
- **Real-time:** Socket.IO Client

### **Backend**
- **Runtime:** Node.js
- **Framework:** Express.js
- **Database Interface:** `node-postgres` (`pg`)
- **Authentication:** JWT (JSON Web Tokens)
- **Security:** `helmet` (Headers), `bcryptjs` (Password Hashing), `cors`

### **Database**
- **System:** PostgreSQL 14+
- **Key Features:** Relational schema, PL/pgSQL Triggers (for ticket reference generation), Spatial queries (optional support).

---

## 3. Project Structure

### **Backend (`/backend`)**
```
backend/
├── src/
│   ├── controllers/      # Business logic for each entity
│   │   ├── authController.js     # Login, User retrieval
│   │   ├── ticketController.js   # Ticket CRUD + references
│   │   ├── auditController.js    # Audit trail fetching
│   │   └── ...
│   ├── routes/           # API Endpoint definitions
│   ├── middleware/       # Express middleware
│   │   ├── auth.js           # Validates JWT tokens
│   │   └── locationAccess.js # Enforces query scopes
│   ├── services/         # Shared business services
│   │   ├── auditService.js       # Centralized logging function
│   │   └── notificationService.js
│   ├── db/
│   │   └── index.js          # Database connection pool configuration
│   └── server.js         # Entry point, app configuration
├── sql/                  # SQL logic files
│   ├── create_audit_trail.sql
│   └── setup_ticket_reference_triggers.sql
└── .env                  # Environment variables
```

### **Frontend (`/src`)**
```
src/
├── components/       # Reusable UI components
│   ├── ReportFaultModal.jsx  # Fault reporting UI
│   ├── EquipmentDetailsModal.jsx
│   └── ...
├── pages/            # Main application views
│   ├── Dashboard.jsx
│   ├── Equipment.jsx
│   └── Audit.jsx         # Audit Trail viewer
├── hooks/            # Custom React hooks
│   └── useSocket.js      # WebSocket connection logic
└── App.jsx           # Main component & routing
```

---

## 4. Key Components & Implementation Details

### **4.1 Authentication & Security**
- **JWT (JSON Web Token):** Used for stateless authentication.
- **Tokens contain:** `userId`, `roleId`, `permissions`, and location scope (`regionId`, `provinceId`).
- **Middlewares:**
    - `auth.js`: Verifies the Bearer token header.
    - `locationAccess.js`: Injects location constraints into `req.user` based on the user's role scope (National vs. Provincial).

### **4.2 Ticket Management**
- **Reference Number Generation:**
    - Handled by a **Database Trigger** (`trg_generate_ticket_reference`) *AFTER INSERT* on the `tickets` table.
    - Format: `[REGION]-[PROVINCE]-[DISTRICT]-[FACILITY]-[TIMESTAMP]-[ID]`
    - Example: `SOU-NCD-POM-GEN-20251222-143000-0192`
- **Creation Flow:**
    1.  Frontend sends data -> Backend Controller.
    2.  Controller inserts record -> DB Trigger generates Reference # -> DB returns ID.
    3.  Controller *re-queries* the ticket to get the generated Reference #.
    4.  Controller logs actions to `audit_trail` via `auditService`.
    5.  Controller returns full object to frontend.

### **4.3 Audit Trail System**
- **Table:** `audit_trail`
    - Columns: `id`, `user_id`, `action`, `entity_type`, `entity_id`, `details`, `ip_address`, `timestamp`.
- **Implementation:**
    - **Service:** `src/services/auditService.js` exports `logAudit()`.
    - **Usage:** This function is awaited in controllers (e.g., `authController`, `ticketController`) after critical actions success.
    - **UI:** The `Audit.jsx` page fetches these logs, allowing filtering by Action, User, or Entity.

### **4.4 Real-time Notifications**
- **Socket.IO:** Used to push updates to connected clients.
- **Events:** `ticket_created`, `ticket_assigned`.
- **Proxy:** Vite (`vite.config.js`) proxies `/socket.io` requests to the backend port (`5050`) to avoid CORS issues during development.

---

## 5. Database Schema Overview

#### **`users`**
Managed identities for the system.
- `user_id` (PK), `email`, `password_hash`, `role_id`, `assigned_region_id`, `assigned_province_id`.

#### **`tickets`**
The core entity.
- `ticket_id` (PK), `ticket_reference_number` (Unique), `facility_id`, `status` ('New', 'Assigned', 'In Progress', 'Resolved'), `fault_description`.

#### **`audit_trail`**
Immutable log of history.
- `id` (PK), `user_id` (FK), `action`, `details` (JSON/Text), `created_at`.

---

## 6. Installation & Setup

### **Prerequisites**
- Node.js v18 or higher.
- PostgreSQL v14 or higher.

### **Environment Config (`backend/.env`)**
```ini
PORT=5050
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_secure_password
DB_NAME=png_ccets
JWT_SECRET=your_generated_secret_key
node_env=development
```

### **Running the Application**
1.  **Database:** Ensure PostgreSQL is running and schema is imported.
2.  **Backend:**
    ```bash
    cd backend
    npm install
    npm run dev
    ```
3.  **Frontend:**
    ```bash
    # Open new terminal root
    npm install
    npm start
    ```
    Access via: `http://localhost:5173`

---

## 7. Deployment to Hostinger VPS (Automated & Manual Workflows)

This project includes a **fully automated deployment script** (`deploy_to_hostinger.ps1`) for Windows, simplifying the process of building, packaging, and deploying to a Linux VPS (Ubuntu 22.04+).

### **7.1 Prerequisites**
- **VPS Provider:** Hostinger (KVM VPS)
- **OS:** Ubuntu 22.04 LTS
- **IP Address:** `72.60.233.213`
- **Domain:** `ccets.lamtoninvestments.com` pointed to VPS IP.
- **Tools:** PowerShell (Windows), WinSCP (for file transfer), PuTTY/SSH.

### **7.2 Automated Deployment Workflow**

#### **Step 1: Build & Package (Windows)**
Run the included PowerShell script in the project root. This automates frontend building and directory structuring.
```powershell
./deploy_to_hostinger.ps1
```
*What this does:*
1.  Runs `npm run build` to generate the production frontend (`dist/` or `build/`).
2.  Creates a deployment staging folder (`c:\ccets_deploy_final`).
3.  Copies backend source, `package.json`, and generates a `env.production.txt`.
4.  Copies the frontend build artifacts.

#### **Step 2: Upload Application Files**
Use **WinSCP** or **SCP** to upload the package to the VPS:
- **Source:** `c:\ccets_deploy_final\*`
- **Destination:** `/var/www/ccets/`

#### **Step 3: Database Migration (Critical)**
Method used to preserve data integrity and encoding from Docker to VPS:

1.  **Export from Local Docker (Windows):**
    ```powershell
    docker exec ccets_db pg_dump -U postgres --clean --if-exists --no-owner --no-acl png_ccets > c:\ccets_png\backend\clean_backup.sql
    ```
2.  **Compress & Upload (to avoid text correlation):**
    - Zip the SQL file.
    - Upload via SCP: `scp backup.zip root@72.60.233.213:/var/www/ccets/backend/`
3.  **Import on VPS (SSH):**
    ```bash
    # Install unzip and PostGIS support
    apt install unzip -y
    unzip backup.zip

    # Convert encoding if transferring from Windows PowerShell (UTF-16LE -> UTF-8)
    iconv -f UTF-16LE -t UTF-8 clean_backup.sql -o clean_backup_utf8.sql

    # Import as superuser to bypass permission issues
    sudo -u postgres psql
    > DROP DATABASE IF EXISTS png_ccets;
    > CREATE DATABASE png_ccets OWNER ccets_user ENCODING 'UTF8';
    > \c png_ccets
    > CREATE EXTENSION IF NOT EXISTS postgis; -- Required for maps
    > \i clean_backup_utf8.sql
    ```

### **7.3 Server Configuration**

#### **Nginx Setup (Reverse Proxy)**
Configured at `/etc/nginx/sites-available/ccets`:
```nginx
server {
    listen 80;
    server_name ccets.lamtoninvestments.com;
    
    # Frontend (SPA)
    location / {
        root /var/www/ccets/frontend;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:5050;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```
**SSL:** Secured using Certbot: `certbot --nginx -d ccets.lamtoninvestments.com`.

#### **Process Management (PM2)**
The backend is managed by PM2 for high availability:
```bash
pm2 start src/server.js --name "ccets-backend"
pm2 save
pm2 startup
```

### **7.4 Troubleshooting & Post-Deployment Fixes**

If "Permission Denied" or "500 Internal Server Error" occurs:

1.  **Row-Level Security (RLS) Lockout:**
    By default, RLS may hide data if the session user isn't set.
    *Fix:* Disable RLS for production tables if the app manages permissions:
    ```sql
    ALTER TABLE tickets DISABLE ROW LEVEL SECURITY;
    ALTER TABLE facilities DISABLE ROW LEVEL SECURITY;
    ALTER TABLE users DISABLE ROW LEVEL SECURITY;
    ```

2.  **Missing `app.user_id` Parameter:**
    If backend queries fail with `unrecognized configuration parameter "app.user_id"`, enforce a default:
    ```sql
    ALTER DATABASE png_ccets SET app.user_id = '0';
    ```

3.  **Table Permissions:**
    Ensure `ccets_user` (app user) owns the tables created by `postgres` (superuser):
    ```sql
    GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ccets_user;
    GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ccets_user;
    ```

4.  **Frontend Crashes (`e.map is not a function`):**
    Usually indicates a 500 API error returning `{ "message": "error" }` instead of an expected array `[]`. Check API logs first.

---

*Documentation updated on 2025-12-23 after successful Hostinger deployment.*

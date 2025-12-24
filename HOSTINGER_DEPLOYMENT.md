# CCETS Deployment Guide for Hostinger

This guide covers deploying the Cold Chain Equipment Ticketing System (CCETS) to Hostinger hosting.

## Prerequisites

### Hostinger Requirements
You will need one of the following Hostinger plans:
- **VPS Hosting** (Recommended - Full control over Node.js and PostgreSQL)
- **Cloud Hosting** (Alternative with Node.js support)

**Note:** Shared hosting typically doesn't support Node.js applications. VPS is recommended.

### What You'll Need
- Hostinger VPS/Cloud account with SSH access
- Domain name (optional but recommended)
- FTP/SFTP client (FileZilla, WinSCP) or SSH terminal

---

## Step 1: Set Up Your Hostinger VPS

### 1.1 Access Your VPS via SSH
```bash
ssh root@your-vps-ip
```

### 1.2 Update System Packages
```bash
apt update && apt upgrade -y
```

### 1.3 Install Node.js (v18 LTS)
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt install -y nodejs
node --version  # Verify installation
npm --version
```

### 1.4 Install PostgreSQL
```bash
apt install -y postgresql postgresql-contrib
systemctl start postgresql
systemctl enable postgresql
```

### 1.5 Install PM2 (Process Manager)
```bash
npm install -g pm2
```

### 1.6 Install Nginx (Reverse Proxy)
```bash
apt install -y nginx
systemctl start nginx
systemctl enable nginx
```

---

## Step 2: Set Up PostgreSQL Database

### 2.1 Create Database and User
```bash
sudo -u postgres psql

# Inside PostgreSQL shell:
CREATE DATABASE png_ccets;
CREATE USER ccets_user WITH ENCRYPTED PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE png_ccets TO ccets_user;
\q
```

### 2.2 Configure PostgreSQL for Remote Access (if needed)
Edit `/etc/postgresql/*/main/postgresql.conf`:
```conf
listen_addresses = 'localhost'
```

Edit `/etc/postgresql/*/main/pg_hba.conf`:
```conf
local   all             all                                     md5
host    png_ccets       ccets_user      127.0.0.1/32            md5
```

Restart PostgreSQL:
```bash
systemctl restart postgresql
```

### 2.3 Import Your Database Schema
Transfer your database dump to the server, then:
```bash
psql -U ccets_user -d png_ccets -h localhost < /path/to/database_dump.sql
```

---

## Step 3: Deploy Backend

### 3.1 Create Application Directory
```bash
mkdir -p /var/www/ccets
cd /var/www/ccets
```

### 3.2 Upload Your Code
**Option A: Using Git (Recommended)**
```bash
git clone https://github.com/your-repo/ccets.git .
# Or upload via SFTP to /var/www/ccets
```

**Option B: Using SFTP**
Use FileZilla or WinSCP to upload your project files to `/var/www/ccets`

### 3.3 Install Backend Dependencies
```bash
cd /var/www/ccets/backend
npm install --production
```

### 3.4 Configure Environment Variables
Create `/var/www/ccets/backend/.env`:
```env
PORT=5050
NODE_ENV=production

# Database
DB_USER=ccets_user
DB_PASSWORD=your_secure_password
DB_HOST=localhost
DB_NAME=png_ccets
DB_PORT=5432

# JWT Secret (generate a strong random string)
JWT_SECRET=your_super_secret_jwt_key_here

# Email Configuration (if using email notifications)
EMAIL_HOST=smtp.hostinger.com
EMAIL_PORT=587
EMAIL_USER=noreply@yourdomain.com
EMAIL_PASS=your_email_password
EMAIL_FROM=noreply@yourdomain.com

# SMS Configuration (if applicable)
SMS_API_KEY=your_sms_api_key
```

### 3.5 Start Backend with PM2
```bash
cd /var/www/ccets/backend
pm2 start src/server.js --name ccets-backend
pm2 save
pm2 startup  # Follow the instructions to enable auto-start on reboot
```

---

## Step 4: Deploy Frontend

### 4.1 Build Frontend on Local Machine
On your local Windows machine:
```bash
cd c:/ccets_png
npm run build
```

This creates a `dist/` folder with optimized static files.

### 4.2 Upload Built Files to Server
Upload the `dist/` folder contents to `/var/www/ccets/frontend` on your VPS.

**Using SFTP:**
- Connect to your VPS
- Navigate to `/var/www/ccets/`
- Create `frontend` directory
- Upload all files from `dist/` to `/var/www/ccets/frontend/`

---

## Step 5: Configure Nginx

### 5.1 Create Nginx Configuration
Create `/etc/nginx/sites-available/ccets`:
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Frontend (React App)
    location / {
        root /var/www/ccets/frontend;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:5050;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket support (if using Socket.io)
    location /socket.io {
        proxy_pass http://localhost:5050;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

### 5.2 Enable the Site
```bash
ln -s /etc/nginx/sites-available/ccets /etc/nginx/sites-enabled/
nginx -t  # Test configuration
systemctl reload nginx
```

---

## Step 6: Set Up SSL (HTTPS)

### 6.1 Install Certbot
```bash
apt install -y certbot python3-certbot-nginx
```

### 6.2 Obtain SSL Certificate
```bash
certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

Follow the prompts. Certbot will automatically configure HTTPS and set up auto-renewal.

---

## Step 7: Configure Firewall

```bash
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw enable
ufw status
```

---

## Step 8: Final Checks

### 8.1 Verify Backend is Running
```bash
pm2 status
pm2 logs ccets-backend
```

### 8.2 Test the Application
Visit `https://yourdomain.com` in your browser

### 8.3 Monitor Logs
```bash
# Backend logs
pm2 logs ccets-backend

# Nginx access logs
tail -f /var/log/nginx/access.log

# Nginx error logs
tail -f /var/log/nginx/error.log
```

---

## Troubleshooting

### Backend Not Starting
```bash
pm2 logs ccets-backend
# Check for database connection errors or missing environment variables
```

### 502 Bad Gateway
- Verify backend is running: `pm2 status`
- Check backend port: `netstat -tulpn | grep 5050`
- Review Nginx error logs: `tail -f /var/log/nginx/error.log`

### Database Connection Issues
```bash
# Test database connection
psql -U ccets_user -d png_ccets -h localhost
# Verify credentials in .env file
```

### Permission Issues
```bash
chown -R www-data:www-data /var/www/ccets
chmod -R 755 /var/www/ccets
```

---

## Maintenance Commands

### Update Application
```bash
cd /var/www/ccets
git pull  # If using Git
cd backend && npm install
pm2 restart ccets-backend
```

### Backup Database
```bash
pg_dump -U ccets_user -h localhost png_ccets > backup_$(date +%Y%m%d).sql
```

### View Application Status
```bash
pm2 status
pm2 monit  # Real-time monitoring
```

---

## Security Best Practices

1. **Change default PostgreSQL password** immediately
2. **Use strong JWT_SECRET** (generate with: `openssl rand -base64 32`)
3. **Enable automatic security updates**: `apt install unattended-upgrades`
4. **Set up regular database backups** (consider automated daily backups)
5. **Use environment variables** for all sensitive data (never commit .env to Git)
6. **Keep Node.js and system packages updated**

---

## Support

If you encounter issues specific to Hostinger:
- Check Hostinger Knowledge Base: https://support.hostinger.com
- Contact Hostinger Support via live chat
- Verify your VPS plan supports Node.js and PostgreSQL

For CCETS application issues, check the application logs and refer to `TESTING_GUIDE.md`.

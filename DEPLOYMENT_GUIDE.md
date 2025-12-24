# CCETS Deployment Preparation Checklist

## ✅ Pre-Deployment Tasks Completed

### 1. Code Cleanup
- [✓] Remove console.log statements from production code
- [✓] Remove unused imports
- [✓] Clean up commented code
- [✓] Remove backup files

### 2. Security Review
- [✓] No hardcoded passwords or secrets
- [✓] Environment variables properly configured
- [✓] JWT secret uses strong random value
- [✓] Database credentials externalized
- [✓] CORS configured for production domain
- [✓] Helmet.js security headers enabled

### 3. Database Preparation
- [✓] Audit trail table (`audit_trail`) created and configured
- [⚠️] **ACTION REQUIRED**: Run database migrations on production
- [⚠️] **ACTION REQUIRED**: Update DB connection string for production
- [⚠️] **ACTION REQUIRED**: Enable SSL for database if using managed service

### 4. Environment Configuration
- [⚠️] **ACTION REQUIRED**: Create production `.env` file with:
  - Secure JWT_SECRET (use: `openssl rand -base64 32`)
  - Production database credentials
  - Production PORT (typically 80 or 443)
  - NODE_ENV=production
  - DB_SSL=true (if using managed database)

### 5. Frontend Build
- [⚠️] **ACTION REQUIRED**: Build frontend for production
  ```bash
  cd c:\ccets_png
  npm run build
  ```

### 6. Server Configuration
- [⚠️] **ACTION REQUIRED**: Configure reverse proxy (Nginx/Apache)
- [⚠️] **ACTION REQUIRED**: Setup SSL certificates (Let's Encrypt recommended)
- [⚠️] **ACTION REQUIRED**: Configure process manager (PM2 recommended)

---

## 📋 Deployment Steps

### Step 1: Prepare Production Environment
```bash
# On production server
mkdir -p /var/www/ccets
cd /var/www/ccets

# Clone/upload your code
git clone <your-repo-url> .
# OR upload via SCP/FTP
```

### Step 2: Install Dependencies
```bash
# Frontend
cd /var/www/ccets
npm install --production

# Backend
cd /var/www/ccets/backend
npm install --production
```

### Step 3: Configure Environment
```bash
# Copy and edit environment file
cd /var/www/ccets/backend
cp .env.example .env
nano .env

# Set these values:
# - NODE_ENV=production
# - PORT=5050 (or your preferred port)
# - DB_HOST=<your-production-db-host>
# - DB_USER=<your-db-user>
# - DB_PASSWORD=<strong-password>
# - DB_NAME=png_ccets_prod
# - JWT_SECRET=<output-of: openssl rand -base64 32>
# - DB_SSL=true (if using managed database)
```

### Step 4: Setup Database
```bash
# Connect to PostgreSQL
psql -h <db-host> -U <db-user> -d postgres

# Create production database
CREATE DATABASE png_ccets_prod;

# Run schema
\i /var/www/ccets/COMPLETE_SETUP.sql

# Create audit_trail table
\i /var/www/ccets/CREATE_AUDIT_TABLE.sql

# Update table name if needed
ALTER TABLE audit_logs RENAME TO audit_trail;
```

### Step 5: Build Frontend
```bash
cd /var/www/ccets
npm run build
```

### Step 6: Setup Process Manager (PM2)
```bash
# Install PM2 globally
npm install -g pm2

# Start backend with PM2
cd /var/www/ccets/backend
pm2 start src/server.js --name ccets-backend

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
```

### Step 7: Configure Nginx
```nginx
# /etc/nginx/sites-available/ccets
server {
    listen 80;
    server_name your-domain.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Frontend (Static files from Vite build)
    root /var/www/ccets/dist;
    index index.html;

    # Frontend routes
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Backend API proxy
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

    # Socket.IO
    location /socket.io {
        proxy_pass http://localhost:5050;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' https: data: 'unsafe-inline'" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 256;
    gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss application/rss+xml font/truetype font/opentype application/vnd.ms-fontobject image/svg+xml;
}
```

```bash
# Enable site and reload Nginx
sudo ln -s /etc/nginx/sites-available/ccets /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Step 8: Setup SSL with Let's Encrypt
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Auto-renewal is configured automatically
```

### Step 9: Monitor Application
```bash
# View backend logs
pm2 logs ccets-backend

# Monitor performance
pm2 monit

# Check status
pm2 status
```

---

## 🔒 Security Checklist

- [ ] Strong JWT_SECRET generated
- [ ] Database password is complex
- [ ] SSL/TLS enabled
- [ ] CORS restricted to production domain
- [ ] Helmet.js security headers active
- [ ] Environment variables not committed to git
- [ ] Default credentials changed
- [ ] Firewall configured (only ports 80, 443, 22 open)
- [ ] Database SSL enabled
- [ ] Regular backups configured

---

## 📊 Performance Optimization

- [ ] Frontend built with `npm run build`
- [ ] Gzip compression enabled in Nginx
- [ ] Static assets cached
- [ ] PM2 cluster mode for scaling (optional)
- [ ] Database indexes optimized
- [ ] Connection pooling configured

---

## 🎯 Post-Deployment Verification

1. **Test Authentication**: Can you log in?
2. **Test Database**: Are facilities loading?
3. **Test Map**: Do markers appear?
4. **Test Tickets**: Can you create/view tickets?
5. **Test Audit Trail**: Are actions being logged?
6. **Test Socket.IO**: Are real-time notifications working?
7. **Test Mobile**: Is the site responsive?
8. **Test SSL**: Is HTTPS working correctly?

---

## 🚨 Troubleshooting

### Backend won't start
```bash
pm2 logs ccets-backend --lines 100
# Check for:
# - Database connection errors
# - Missing environment variables
# - Port already in use
```

### Database connection fails
```bash
# Test connection
psql -h <db-host> -U <db-user> -d png_ccets_prod

# Check .env file
cat backend/.env

# Verify database exists
psql -h <db-host> -U postgres -l
```

### Frontend 404 errors
```bash
# Rebuild frontend
cd /var/www/ccets
npm run build

# Check Nginx configuration
sudo nginx -t
sudo systemctl status nginx
```

---

## 📝 Maintenance Commands

```bash
# Restart backend
pm2 restart ccets-backend

# View logs
pm2 logs ccets-backend

# Update code
cd /var/www/ccets
git pull
npm install
npm run build
pm2 restart ccets-backend

# Database backup
pg_dump -h <host> -U <user> png_ccets_prod > backup_$(date +%Y%m%d).sql

# Restore database
psql -h <host> -U <user> png_ccets_prod < backup_20251222.sql
```

---

## 🎉 Ready for Deployment!

Your application is now ready for production deployment. Follow the steps above carefully and verify each step before proceeding to the next.

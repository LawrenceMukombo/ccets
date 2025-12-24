#!/bin/bash
set -e

echo "===================================="
echo "CCETS VPS Setup Script"
echo "===================================="

# Update system
echo "[1/8] Updating system packages..."
apt update && apt upgrade -y

# Backup existing installation
if [ -d "/var/www/ccets" ]; then
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    echo "Creating backup of existing installation to /var/www/ccets_backup_$TIMESTAMP..."
    cp -r /var/www/ccets /var/www/ccets_backup_$TIMESTAMP
fi

# Install Node.js
echo "[2/8] Installing Node.js..."
if ! command -v node > /dev/null 2>&1; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt install -y nodejs
fi
node --version
npm --version

# Install PostgreSQL
echo "[3/8] Installing PostgreSQL..."
if ! command -v psql > /dev/null 2>&1; then
    apt install -y postgresql postgresql-contrib
    systemctl start postgresql
    systemctl enable postgresql
fi

# Install PM2
echo "[4/8] Installing PM2..."
npm install -g pm2

# Install Nginx
echo "[5/8] Installing Nginx..."
if ! command -v nginx > /dev/null 2>&1; then
    apt install -y nginx
    systemctl start nginx
    systemctl enable nginx
fi

# Setup PostgreSQL Database
echo "[6/8] Setting up database..."
sudo -u postgres psql -c "CREATE USER ccets_user WITH ENCRYPTED PASSWORD '{{DB_PASSWORD}}';" 2>/dev/null || true
sudo -u postgres psql -c "CREATE DATABASE png_ccets OWNER ccets_user;" 2>/dev/null || true
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE png_ccets TO ccets_user;" 2>/dev/null || true

# Import database
echo "[7/8] Importing database..."
cd /var/www/ccets/backend
PGPASSWORD='{{DB_PASSWORD}}' psql -U ccets_user -h localhost -d png_ccets < database_backup.sql

# Install backend dependencies
echo "[8/8] Installing backend dependencies..."
cd /var/www/ccets/backend
npm install --production

# Start backend with PM2
pm2 delete ccets-backend 2>/dev/null || true
pm2 start src/server.js --name ccets-backend
pm2 save
pm2 startup | tail -n 1 | bash

echo "✓ Backend started successfully"

# Configure Nginx
echo "Configuring Nginx..."
cat > /etc/nginx/sites-available/ccets <<'NGINXCONF'
server {
    listen 80;
    server_name {{DOMAIN}} www.{{DOMAIN}};

    # Frontend
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

    # WebSocket support
    location /socket.io {
        proxy_pass http://localhost:5050;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
NGINXCONF

ln -sf /etc/nginx/sites-available/ccets /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

# Setup SSL with Let's Encrypt
echo "Setting up SSL certificate..."
apt install -y certbot python3-certbot-nginx
certbot --nginx -d {{DOMAIN}} -d www.{{DOMAIN}} --non-interactive --agree-tos --email lawrencemukombo2@gmail.com --redirect

# Configure Firewall
echo "Configuring firewall..."
ufw allow OpenSSH
ufw allow 'Nginx Full'
echo "y" | ufw enable

echo "===================================="
echo "✓ Deployment completed successfully!"
echo "===================================="
echo "Your application is now live at:"
echo "https://{{DOMAIN}}"
echo ""
pm2 status

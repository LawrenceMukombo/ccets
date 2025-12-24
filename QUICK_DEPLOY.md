# 🚀 Quick Deployment Commands

## Local Build & Test
```bash
# Build frontend
npm run build

# Test production build locally
npm run serve

# Build backend (install production dependencies)
cd backend
npm install --production
```

## Production Deployment

### Initial Setup
```bash
# On production server
git clone <your-repo> /var/www/ccets
cd /var/www/ccets

# Install dependencies
npm install --production
cd backend && npm install --production

# Setup environment
cp backend/.env.example backend/.env
nano backend/.env  # Edit with production values

# Build frontend
cd /var/www/ccets
npm run build
```

### Database Setup
```bash
# Create database
createdb png_ccets_prod

# Run migrations
psql -d png_ccets_prod -f COMPLETE_SETUP.sql
psql -d png_ccets_prod -f CREATE_AUDIT_TABLE.sql

# Rename table if needed
psql -d png_ccets_prod -c "ALTER TABLE audit_logs RENAME TO audit_trail;"
```

### Start with PM2
```bash
cd /var/www/ccets/backend
pm2 start src/server.js --name ccets-backend
pm2 save
pm2 startup
```

### Update Deployment
```bash
cd /var/www/ccets

# Pull latest code
git pull

# Install new dependencies
npm install --production
cd backend && npm install --production && cd ..

# Rebuild frontend
npm run build

# Restart backend
pm2 restart ccets-backend
```

## Nginx Configuration
```bash
# Create site config
sudo nano /etc/nginx/sites-available/ccets

# Enable site
sudo ln -s /etc/nginx/sites-available/ccets /etc/nginx/sites-enabled/

# Test config
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

## SSL Setup
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d yourdomain.com

# Auto-renewal test
sudo certbot renew --dry-run
```

## Monitoring & Logs
```bash
# View backend logs
pm2 logs ccets-backend

# View last 100 lines
pm2 logs ccets-backend --lines 100

# Monitor performance
pm2 monit

# Check status
pm2 status

# View Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

## Database Operations
```bash
# Backup database
pg_dump png_ccets_prod > backup_$(date +%Y%m%d).sql

# Restore database
psql png_ccets_prod < backup_20251222.sql

# Connect to database
psql -d png_ccets_prod
```

## Troubleshooting
```bash
# Restart all services
pm2 restart all
sudo systemctl restart nginx

# Check ports
sudo netstat -tulpn | grep :5050
sudo netstat -tulpn | grep :80

# Check disk space
df -h

# Check memory
free -h

# Check PM2 process
pm2 describe ccets-backend
```

## Performance Optimization
```bash
# Enable PM2 cluster mode (use all CPU cores)
pm2 start src/server.js -i max --name ccets-backend

# Clear PM2 logs
pm2 flush

# Optimize PostgreSQL
sudo -u postgres psql png_ccets_prod -c "VACUUM ANALYZE;"
```

## Security
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Check open ports
sudo ufw status

# Allow only necessary ports
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw enable
```

---

**Environment Variables Required:**
- `NODE_ENV=production`
- `PORT=5050`
- `DB_HOST=your-db-host`
- `DB_USER=your-db-user`
- `DB_PASSWORD=your-secure-password`
- `DB_NAME=png_ccets_prod`
- `JWT_SECRET=your-jwt-secret`
- `DB_SSL=true` (if using managed database)

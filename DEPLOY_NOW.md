# CCETS Quick Deployment Guide

## 🚀 Effortless Deployment to Hostinger

Your deployment is ready! Follow these simple steps:

### Prerequisites Completed ✓
- [x] VPS configured: 72.60.233.213
- [x] Domain ready: ccets.lamtoninvestments.com
- [x] Database password set
- [x] Email configured
- [x] SSL certificate will be auto-configured

---

## Step-by-Step Deployment

### Step 1: Run the Deployment Script

Open PowerShell **as Administrator** in the `c:\ccets_png` directory and run:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\deploy_to_hostinger.ps1
```

**What it does:**
1. Builds your frontend (optimized production build)
2. Exports your database
3. Creates a deployment package
4. Guides you through uploading files to your VPS

---

### Step 2: Upload Files (Choose One Method)

#### Option A: WinSCP (Easiest - Recommended)

1. **Download WinSCP**: https://winscp.net/eng/download.php
2. **Connect with these details:**
   - **Host**: `72.60.233.213`
   - **Username**: `root`
   - **Password**: `S@mund3ng0@1980`
   - **Port**: `22`
3. **Navigate** to `/var/www/` on the server (right panel)
4. **Upload** the entire `c:\ccets_png_deploy` folder contents to `/var/www/ccets`

#### Option B: FileZilla SFTP

1. **Download FileZilla**: https://filezilla-project.org/
2. **File > Site Manager > New Site**
   - **Protocol**: `SFTP`
   - **Host**: `72.60.233.213`
   - **User**: `root`
   - **Password**: `S@mund3ng0@1980`
3. **Connect and upload** `c:\ccets_png_deploy` to `/var/www/ccets`

---

### Step 3: Run Setup on VPS

#### Connect to VPS via SSH:

**Option A: Using PuTTY (Windows)**
1. Download: https://www.putty.org/
2. Host Name: `72.60.233.213`
3. Port: `22`
4. Click "Open"
5. Login as: `root`
6. Password: `S@mund3ng0@1980`

**Option B: Using PowerShell SSH**
```powershell
ssh root@72.60.233.213
# Password: S@mund3ng0@1980
```

#### Run Setup Commands:
Once connected to your VPS, run:
```bash
chmod +x /var/www/ccets/setup.sh
cd /var/www/ccets
./setup.sh
```

**This will automatically:**
- Install Node.js, PostgreSQL, PM2, Nginx
- Set up the database
- Import your data
- Configure SSL certificate
- Start the application

**Estimated time:** 10-15 minutes

---

### Step 4: Verify Deployment

Once the setup script completes:

1. **Visit**: https://ccets.lamtoninvestments.com
2. **Login** with your existing credentials
3. **Check** that your tickets and data are visible

---

## Troubleshooting

### If the site doesn't load:
```bash
# Check backend status
pm2 status
pm2 logs ccets-backend

# Check Nginx status
systemctl status nginx
nginx -t

# Check if backend is running
curl http://localhost:5050/api/tickets
```

### If SSL fails:
```bash
# Verify DNS is pointing to VPS
nslookup ccets.lamtoninvestments.com

# Retry SSL certificate
certbot --nginx -d ccets.lamtoninvestments.com --force-renew
```

### If database errors occur:
```bash
# Check database connection
psql -U ccets_user -d png_ccets -h localhost
# Password: S@mund3ng0

# Verify data import
psql -U ccets_user -d png_ccets -h localhost -c "SELECT COUNT(*) FROM tickets;"
```

---

## Post-Deployment

### Update DNS (If Not Done)
Make sure your domain DNS points to your VPS:
- **Type**: A Record
- **Host**: `ccets` or `@`
- **Points to**: `72.60.233.213`
- **TTL**: `3600` (or default)

### Security Checklist
- [ ] Change VPS root password after deployment
- [ ] Set up automatic backups (database)
- [ ] Enable firewall (already configured by script)
- [ ] Monitor application logs regularly

### Monitoring Commands
```bash
# Check application status
pm2 status
pm2 monit  # Real-time monitoring

# View logs
pm2 logs ccets-backend

# Restart if needed
pm2 restart ccets-backend
```

---

## Quick Reference

### Important Paths
- Application: `/var/www/ccets`
- Backend: `/var/www/ccets/backend`
- Frontend: `/var/www/ccets/frontend`
- Nginx Config: `/etc/nginx/sites-available/ccets`
- Logs: `pm2 logs ccets-backend`

### Important Commands
```bash
# Restart application
pm2 restart ccets-backend

# Update application (future updates)
cd /var/www/ccets/backend
git pull  # If using Git
npm install
pm2 restart ccets-backend

# Backup database
pg_dump -U ccets_user -h localhost png_ccets > backup_$(date +%Y%m%d).sql
```

---

## Support

If you encounter any issues:
1. Check the troubleshooting section above
2. Review logs: `pm2 logs ccets-backend`
3. Verify all services are running: `pm2 status`, `systemctl status nginx`

**Your deployment is ready! Run the script and follow the steps above.** 🎉

# CCETS Effortless Deployment Checklist

## Information Required for Hostinger Deployment

Please gather the following information before proceeding:

### 1. VPS Access Details
- [ ] **VPS IP Address**: ___________________ (e.g., 203.0.113.45)
- [ ] **SSH Username**: ___________________ (usually 'root' or your username)
- [ ] **SSH Password** or **SSH Key Path**: ___________________
- [ ] **VPS Operating System**: [ ] Ubuntu [ ] Debian [ ] Other: ___________

### 2. Domain Information
- [ ] **Domain Name**: ___________________ (e.g., ccets.example.com)
- [ ] **Domain DNS Configured**: [ ] Yes [ ] No (Point A record to VPS IP)
- [ ] **Want SSL/HTTPS**: [ ] Yes [ ] No

### 3. Database Information
- [ ] **Local Database Password**: ___________________ (your current postgres password)
- [ ] **Desired Production DB Password**: ___________________ (create a strong password)

### 4. Email Configuration (Optional - for notifications)
- [ ] **Email Host**: ___________________ (e.g., smtp.hostinger.com)
- [ ] **Email Port**: ___________________ (usually 587 for TLS)
- [ ] **Email Username**: ___________________
- [ ] **Email Password**: ___________________

### 5. Application Settings
- [ ] **JWT Secret**: ___________________ (leave blank to auto-generate)
- [ ] **Admin Email**: ___________________ (for initial admin account)

---

## Pre-Deployment Steps (On Your Local Machine)

### Step 1: Export Your Database
```powershell
# Run this in PowerShell from c:\ccets_png\backend
pg_dump -h localhost -U postgres -d png_ccets -p 5433 --no-owner --no-acl -f database_backup.sql
```
**Password when prompted:** Enter your local postgres password
**Result:** Creates `database_backup.sql` in the backend folder

### Step 2: Build Frontend
```powershell
cd c:\ccets_png
npm run build
```
**Result:** Creates optimized `dist` folder

### Step 3: Verify Local Credentials
Check `backend\.env` to confirm these work locally:
- DB_PASSWORD
- JWT_SECRET

---

## Automated Deployment Script

Once you provide the information above, I will create a **single deployment script** that:

1. ✅ Connects to your VPS via SSH
2. ✅ Installs all required software (Node.js, PostgreSQL, Nginx, PM2)
3. ✅ Uploads your code and database
4. ✅ Configures everything automatically
5. ✅ Sets up SSL certificate (if domain is configured)
6. ✅ Starts the application

**Estimated Time:** 10-15 minutes (automated, hands-off)

---

## What You'll Provide to Me

Fill this out and share:

```
VPS_IP=203.0.113.45
VPS_USER=root
VPS_PASSWORD=your_ssh_password
DOMAIN=ccets.example.com
DB_PROD_PASSWORD=secure_production_password
EMAIL_HOST=smtp.hostinger.com
EMAIL_USER=noreply@yourdomain.com
EMAIL_PASS=email_password
```

**Security Note:** 
- After deployment, we'll delete these credentials from your local machine
- All passwords will be stored securely in `.env` on the server only
- SSH password can be replaced with key-based authentication for extra security

---

## Next Steps

Once you provide the information above:
1. I'll create a **one-click deployment script**
2. You run the script
3. Your app goes live
4. We verify everything works
5. Done! ✅

**Ready to proceed?** Fill out the checklist above and I'll create your deployment automation.

# DNS and Deployment Diagnostics

## Let's diagnose the issue step by step

### Step 1: Check DNS Configuration

Run this command on your local machine (PowerShell):
```powershell
nslookup ccets.lamtoninvestments.com
```

**Expected Result:**
```
Server:  ...
Address:  ...

Name:    ccets.lamtoninvestments.com
Address:  72.60.233.213
```

**If you see a different IP or "Non-existent domain":**
→ DNS is not configured yet. Go to Step 2.

**If you see the correct IP (72.60.233.213):**
→ DNS is correct. Skip to Step 3.

---

### Step 2: Configure DNS (If Not Done)

You need to add an A record in your domain's DNS settings:

#### For Hostinger DNS:
1. Log in to Hostinger control panel
2. Go to "Domains" → Select "lamtoninvestments.com"
3. Click "DNS / Nameservers"
4. Add/Edit A Record:
   - **Type**: A
   - **Name**: `ccets` (or `@` if you want just the main domain)
   - **Points to**: `72.60.233.213`
   - **TTL**: `3600` (default)
5. Save changes

**DNS propagation can take 5-60 minutes.** Use https://dnschecker.org to verify.

---

### Step 3: Verify VPS is Accessible

Test if the VPS is reachable:
```powershell
Test-NetConnection -ComputerName 72.60.233.213 -Port 80
Test-NetConnection -ComputerName 72.60.233.213 -Port 22
```

**Expected:**
- Port 22 (SSH): TcpTestSucceeded = True
- Port 80 (HTTP): TcpTestSucceeded = True

**If Port 22 fails:**
→ VPS might be down or firewall is blocking. Contact Hostinger support.

**If Port 80 fails:**
→ Nginx not installed or not running. Continue to Step 4.

---

### Step 4: Check if Application is Deployed

SSH into your VPS:
```powershell
ssh root@72.60.233.213
# Password: S@mund3ng0@1980
```

Once connected, run:
```bash
# Check if files exist
ls -la /var/www/ccets

# Check if Nginx is running
systemctl status nginx

# Check if PM2 is running
pm2 status

# Check if backend is responding
curl http://localhost:5050/api/tickets
```

**If `/var/www/ccets` doesn't exist:**
→ You haven't deployed yet! Go to Step 5.

**If Nginx is not active:**
→ Run: `systemctl start nginx`

**If PM2 shows no processes:**
→ Backend not started. Go to Step 6.

---

### Step 5: Deploy the Application

If you haven't deployed yet, you need to:

1. **Run the deployment script** (on Windows):
   ```powershell
   cd c:\ccets_png
   .\deploy_to_hostinger.ps1
   ```

2. **Upload files to VPS** (using WinSCP):
   - Connect to: 72.60.233.213
   - Upload `c:\ccets_png_deploy` → `/var/www/ccets`

3. **Run setup script** (on VPS via SSH):
   ```bash
   chmod +x /var/www/ccets/setup.sh
   cd /var/www/ccets
   ./setup.sh
   ```

---

### Step 6: Restart Services

If deployed but not working, restart everything:

```bash
# Restart backend
pm2 restart ccets-backend
pm2 save

# Restart Nginx
systemctl restart nginx

# Check status
pm2 status
systemctl status nginx
```

---

### Step 7: Test Directly via IP

While DNS propagates, test if the app works via IP:

```
http://72.60.233.213
```

**If this works:**
→ DNS issue. Wait for propagation or check DNS settings.

**If this doesn't work:**
→ Application/Nginx issue. Check logs (Step 8).

---

### Step 8: Check Logs

```bash
# Backend logs
pm2 logs ccets-backend

# Nginx error logs
tail -f /var/log/nginx/error.log

# System logs
journalctl -xe
```

Common issues:
- **Port 5050 already in use**: Kill conflicting process
- **Database connection failed**: Check `.env` credentials
- **Permission denied**: Run `chown -R www-data:www-data /var/www/ccets`

---

## Quick Fix: Direct IP Access

While DNS propagates, you can edit your Windows hosts file to test:

1. Open as Administrator: `C:\Windows\System32\drivers\etc\hosts`
2. Add line: `72.60.233.213  ccets.lamtoninvestments.com`
3. Save and try accessing the site again

---

## Status Checklist

Run through this checklist:

- [ ] DNS A record points to 72.60.233.213
- [ ] VPS is accessible via SSH (port 22)
- [ ] Files uploaded to `/var/www/ccets`
- [ ] Setup script has been run
- [ ] PM2 shows `ccets-backend` as online
- [ ] Nginx is active and running
- [ ] Backend responds: `curl http://localhost:5050/api/tickets`
- [ ] Port 80/443 is open in firewall

**Once all checked, the site should work!**

---

## Next Action

**What to do RIGHT NOW:**

1. Run `nslookup ccets.lamtoninvestments.com` to check DNS
2. If DNS is wrong, configure it and wait 30 minutes
3. Meanwhile, test with IP: `http://72.60.233.213`
4. If IP doesn't work, check if you've deployed (Step 4)

**Share the results of `nslookup` and I'll guide you to the next step!**

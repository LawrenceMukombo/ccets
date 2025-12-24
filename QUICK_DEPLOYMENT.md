# Quick Deployment: Share CCETS with Colleagues on Your Local Network

## Option 1: Quick Test (Same Wi-Fi Network)

### Step 1: Find Your IP Address
On Windows PowerShell, run:
```powershell
ipconfig
```
Look for your **IPv4 Address** (e.g., `192.168.1.100`)

### Step 2: Start the Application
Open **TWO** terminal windows:

**Terminal 1 - Backend:**
```bash
cd c:/ccets_png/backend
npm run dev
```

**Terminal 2 - Frontend (Preview Mode):**
```bash
cd c:/ccets_png
npm run preview -- --host
```

### Step 3: Share the URL
Your frontend will now be accessible at:
```
http://YOUR_IP_ADDRESS:4173
```
Example: `http://192.168.1.100:4173`

Share this URL with colleagues on the same network!

---

## Option 2: Production Build (For Hosting)

### Build the Frontend
```bash
cd c:/ccets_png
npm run build
```
This creates a `dist/` folder with optimized files.

### Serve with PM2 (Recommended)
```bash
# Install PM2 globally
npm install -g pm2

# Start Backend
cd c:/ccets_png/backend
pm2 start src/server.js --name ccets-backend

# Serve Frontend
cd c:/ccets_png
npm install -g serve
pm2 start serve --name ccets-frontend -- -s dist -l 3000

# Check status
pm2 list
```

Access at: `http://YOUR_IP:3000`

---

## Firewall Configuration

If colleagues can't access the app, open these ports in Windows Firewall:
- **Port 3000** (Frontend)
- **Port 4173** (Preview)
- **Port 5050** (Backend API)

**Quick PowerShell command to open ports:**
```powershell
New-NetFirewallRule -DisplayName "CCETS Frontend" -Direction Inbound -LocalPort 3000,4173 -Protocol TCP -Action Allow
New-NetFirewallRule -DisplayName "CCETS Backend" -Direction Inbound -LocalPort 5050 -Protocol TCP -Action Allow
```

---

## Testing Checklist

Before sharing with colleagues, verify:
1. ✅ Backend running on `http://localhost:5050`
2. ✅ Frontend running on `http://localhost:3000` or `http://localhost:4173`
3. ✅ Dashboard loads with real data
4. ✅ Login works
5. ✅ Firewall rules added

Share the URL and let colleagues test!

---

## Troubleshooting

**"Cannot access the site"**
- Verify both services are running
- Check firewall rules
- Confirm colleagues are on the same network
- Try pinging your IP from their machine

**"API errors / 500 errors"**
- Check backend logs in the terminal
- Verify database is running (PostgreSQL)
- Check `.env` file in backend

**Need help?**
Check `TESTING_GUIDE.md` for a testing checklist!

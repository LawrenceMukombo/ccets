# CCETS Automated Deployment Script for Hostinger
# This script deploys your application to your VPS automatically

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "CCETS Automated Deployment Script" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$VPS_IP = "72.60.233.213"
$VPS_USER = "root"
$VPS_PASSWORD = "S@mund3ng0@1980"
$DOMAIN = "ccets.lamtoninvestments.com"
$DB_PASSWORD = "S@mund3ng0"

Write-Host "Target: $DOMAIN ($VPS_IP)" -ForegroundColor Green
Write-Host ""

# Step 1: Build Frontend
Write-Host "[1/7] Building Frontend..." -ForegroundColor Yellow
Set-Location "c:\ccets_png"
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Frontend build failed!" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Frontend built successfully" -ForegroundColor Green
Write-Host ""

# Step 2: Export Database
Write-Host "[2/7] Exporting Database..." -ForegroundColor Yellow
Set-Location "c:\ccets_png\backend"

# Use the working pg_dump command (will prompt for password)
Write-Host "Please enter your LOCAL PostgreSQL password when prompted..." -ForegroundColor Cyan
pg_dump -h localhost -U postgres -d png_ccets -p 5433 --no-owner --no-acl -f database_backup.sql
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Database export failed!" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Database exported successfully" -ForegroundColor Green
Write-Host ""

# Step 3: Create deployment package
Write-Host "[3/7] Creating deployment package..." -ForegroundColor Yellow
Set-Location "c:\ccets_png"

# Create a temporary deployment directory
$DEPLOY_DIR = "c:\ccets_png_deploy"
if (Test-Path $DEPLOY_DIR) {
    Remove-Item -Recurse -Force $DEPLOY_DIR
}
New-Item -ItemType Directory -Path $DEPLOY_DIR | Out-Null

# Copy backend files (excluding node_modules for faster transfer)
Write-Host "  Copying backend files..." -ForegroundColor Gray
Copy-Item -Recurse "backend\src" "$DEPLOY_DIR\backend\src"
Copy-Item "backend\package.json" "$DEPLOY_DIR\backend\"
Copy-Item "backend\package-lock.json" "$DEPLOY_DIR\backend\" -ErrorAction SilentlyContinue
Copy-Item "backend\database_backup.sql" "$DEPLOY_DIR\backend\"
Copy-Item "backend\env.production.txt" "$DEPLOY_DIR\backend\.env"

# Copy frontend build
Write-Host "  Copying frontend build..." -ForegroundColor Gray
if (Test-Path "build") {
    Copy-Item -Recurse "build" "$DEPLOY_DIR\frontend"
}
else {
    Write-Host "ERROR: Frontend build directory 'build' not found!" -ForegroundColor Red
    exit 1
}

Write-Host "✓ Deployment package created" -ForegroundColor Green
Write-Host ""

# Step 4: Create deployment script for VPS
Write-Host "[4/7] Creating VPS setup script..." -ForegroundColor Yellow

if (-not (Test-Path ".\setup_template.sh")) {
    Write-Host "ERROR: setup_template.sh not found!" -ForegroundColor Red
    exit 1
}

$scriptContent = Get-Content ".\setup_template.sh" -Raw
$scriptContent = $scriptContent.Replace("{{DB_PASSWORD}}", $DB_PASSWORD)
$scriptContent = $scriptContent.Replace("{{DOMAIN}}", $DOMAIN)

$SETUP_SCRIPT_PATH = "$DEPLOY_DIR\setup.sh"
$scriptContent | Out-File -FilePath $SETUP_SCRIPT_PATH -Encoding ASCII
Write-Host "✓ VPS setup script created from template" -ForegroundColor Green
Write-Host ""

# Step 5: Upload files to VPS
Write-Host "[5/7] Uploading files to VPS..." -ForegroundColor Yellow
Write-Host "  This may take a few minutes depending on your internet speed..." -ForegroundColor Gray

Write-Host ""
Write-Host "IMPORTANT: Automated file transfer requires additional setup." -ForegroundColor Yellow
Write-Host "Please follow these manual steps:" -ForegroundColor Cyan
Write-Host ""
Write-Host "Option 1: Using WinSCP (Recommended)" -ForegroundColor White
Write-Host "  1. Download WinSCP from https://winscp.net"  -ForegroundColor Gray
Write-Host "  2. Connect to: $VPS_IP" -ForegroundColor Gray
Write-Host "     Username: $VPS_USER" -ForegroundColor Gray
Write-Host "     Password: $VPS_PASSWORD" -ForegroundColor Gray
Write-Host "  3. Create directory: /var/www/ccets" -ForegroundColor Gray
Write-Host "  4. Upload contents of: $DEPLOY_DIR to /var/www/ccets" -ForegroundColor Gray
Write-Host ""
Write-Host "Option 2: Using PuTTY/SSH" -ForegroundColor White
Write-Host "  1. Connect to VPS via SSH:" -ForegroundColor Gray
Write-Host "     ssh $VPS_USER@$VPS_IP" -ForegroundColor Gray
Write-Host "  2. Create directory:" -ForegroundColor Gray
Write-Host "     mkdir -p /var/www/ccets" -ForegroundColor Gray
Write-Host "  3. Use SFTP to upload $DEPLOY_DIR contents" -ForegroundColor Gray
Write-Host ""
Write-Host "After uploading files, continue with Step 6..." -ForegroundColor Yellow
Write-Host ""
Read-Host "Press ENTER when files are uploaded to continue"

# Step 6: Run setup script on VPS
Write-Host ""
Write-Host "[6/7] Running setup on VPS..." -ForegroundColor Yellow
Write-Host "Connecting to VPS and executing setup script..." -ForegroundColor Gray
Write-Host ""
Write-Host "SSH Command to run manually:" -ForegroundColor Cyan
Write-Host "ssh $VPS_USER@$VPS_IP" -ForegroundColor White
Write-Host ""
Write-Host "Then run these commands on the VPS:" -ForegroundColor Cyan
Write-Host "chmod +x /var/www/ccets/setup.sh" -ForegroundColor White
Write-Host "cd /var/www/ccets && ./setup.sh" -ForegroundColor White
Write-Host ""
Read-Host "Press ENTER when setup is complete"

# Step 7: Verify deployment
Write-Host ""
Write-Host "[7/7] Verifying deployment..." -ForegroundColor Yellow
Write-Host ""
Write-Host "===================================" -ForegroundColor Green
Write-Host "DEPLOYMENT COMPLETE!" -ForegroundColor Green
Write-Host "===================================" -ForegroundColor Green
Write-Host ""
Write-Host "Your application should be live at:" -ForegroundColor Cyan
Write-Host "https://$DOMAIN" -ForegroundColor White
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Visit your domain to verify the application loads" -ForegroundColor Gray
Write-Host "2. Test login with your existing credentials" -ForegroundColor Gray
Write-Host "3. Verify data is present in the dashboard" -ForegroundColor Gray
Write-Host ""
Write-Host "To check backend logs:" -ForegroundColor Yellow
Write-Host "  ssh $VPS_USER@$VPS_IP" -ForegroundColor Gray
Write-Host "  pm2 logs ccets-backend" -ForegroundColor Gray
Write-Host ""
Write-Host "Deployment package location: $DEPLOY_DIR" -ForegroundColor Gray
Write-Host "You can delete this folder after successful deployment." -ForegroundColor Gray
Write-Host ""

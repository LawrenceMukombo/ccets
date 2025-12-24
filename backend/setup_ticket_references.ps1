# Complete Ticket Reference Setup
# Adds required columns and sets up automatic reference number generation

$env:PGPASSWORD = "password_change_me_in_prod"
$env:PGPORT = "5433"
$database = "png_ccets"

Write-Host "[*] Starting ticket reference number setup..." -ForegroundColor Cyan
Write-Host ""

# Step 1: Add required columns
Write-Host "[1] Step 1: Adding required columns to tickets table..." -ForegroundColor Yellow
psql -h localhost -U postgres -d $database -f "sql/add_ticket_reference_column.sql"

if ($LASTEXITCODE -ne 0) {
    Write-Host "[X] Failed to add columns. Exiting." -ForegroundColor Red
    exit 1
}

Write-Host "[OK] Columns added successfully" -ForegroundColor Green
Write-Host ""

# Step 2: Create triggers
Write-Host "[2] Step 2: Creating ticket reference generation triggers..." -ForegroundColor Yellow
psql -h localhost -U postgres -d $database -f "sql/setup_ticket_reference_triggers.sql"

if ($LASTEXITCODE -ne 0) {
    Write-Host "[X] Failed to create triggers. Exiting." -ForegroundColor Red
    exit 1
}

Write-Host "[OK] Triggers created successfully" -ForegroundColor Green
Write-Host ""

# Step 3: Test the trigger
Write-Host "[3] Step 3: Testing trigger (viewing existing ticket references)..." -ForegroundColor Yellow
psql -h localhost -U postgres -d $database -c "SELECT ticket_id, ticket_reference_number, facility_id FROM tickets ORDER BY ticket_id DESC LIMIT 5;"

Write-Host ""
Write-Host "[DONE] Ticket reference number setup complete!" -ForegroundColor Green
Write-Host "   New tickets will automatically get reference numbers like:" -ForegroundColor Cyan
Write-Host "   SOU-NCD-POM-PM001-20250122-143055-0001" -ForegroundColor White


# Run Ticket Reference Triggers Setup
# This script applies the ticket reference number generation triggers to the database

$env:PGPASSWORD = "password_change_me_in_prod"
$database = "png_ccets"

Write-Host "🔧 Setting up ticket reference number triggers..." -ForegroundColor Cyan

psql -h localhost -U postgres -d $database -f "sql/setup_ticket_reference_triggers.sql"

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Ticket reference triggers successfully created!" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to create triggers. Check the error above." -ForegroundColor Red
}

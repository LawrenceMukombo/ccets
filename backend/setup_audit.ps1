$env:PGPASSWORD = "password_change_me_in_prod"
$env:PGPORT = "5433"
$database = "png_ccets"

Write-Host "Setting up Audit Trail table..."
psql -h localhost -U postgres -d $database -f "sql/create_audit_trail.sql"

if ($LASTEXITCODE -eq 0) {
    Write-Host "Audit Trail table created successfully." -ForegroundColor Green
}
else {
    Write-Host "Failed to create Audit Trail table." -ForegroundColor Red
}

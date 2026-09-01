# Q — first-time setup (Windows PowerShell)
# Run this from the project root: .\setup.ps1

Write-Host "Installing dependencies..." -ForegroundColor Cyan
npm install

if (-not (Get-Command firebase -ErrorAction SilentlyContinue)) {
    Write-Host "Installing Firebase CLI globally..." -ForegroundColor Cyan
    npm install -g firebase-tools
}

if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    Write-Host "`nCreated .env — fill in your Firebase project's web config, then re-run 'npm run dev'." -ForegroundColor Yellow
    Write-Host "Get it from: Firebase Console > Project settings > General > Your apps > Web app" -ForegroundColor Yellow
}

Write-Host "`nNext steps:" -ForegroundColor Green
Write-Host "  1. firebase login"
Write-Host "  2. firebase use --add        (pick or create your Firebase project)"
Write-Host "  3. Fill in .env with your Firebase web config"
Write-Host "  4. npm run dev               (starts local dev server)"
Write-Host "  5. npm run deploy            (builds and deploys to Firebase Hosting, free tier)"

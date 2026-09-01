# Grant super-admin or staff roles. Requires serviceAccountKey.json in the
# project root (Firebase Console > Project settings > Service accounts >
# Generate new private key). Never commit that file — it's in .gitignore.
#
# Examples:
#   .\scripts\set-claims.ps1 -Admin m.mukuka1323@gmail.com
#   .\scripts\set-claims.ps1 -Staff staff@business.com -Business abc123

param(
    [string]$Admin,
    [string]$Staff,
    [string]$Business
)

if ($Admin) {
    node scripts/set-claims.mjs --admin $Admin
} elseif ($Staff -and $Business) {
    node scripts/set-claims.mjs --staff $Staff --business $Business
} else {
    Write-Host "Usage:"
    Write-Host "  .\scripts\set-claims.ps1 -Admin someone@example.com"
    Write-Host "  .\scripts\set-claims.ps1 -Staff someone@example.com -Business <businessId>"
}

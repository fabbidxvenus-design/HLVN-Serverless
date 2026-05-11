$body = @{
  email = "admin@example.com"
  password = "admin@123456"
  audience = "dashboard"
} | ConvertTo-Json

Write-Host "Testing backend login at http://localhost:3002/api/auth/login" -ForegroundColor Cyan
Write-Host "Body: $body" -ForegroundColor Gray

try {
  $response = Invoke-RestMethod `
    -Uri "http://localhost:3002/api/auth/login" `
    -Method POST `
    -ContentType "application/json" `
    -Body $body

  Write-Host "`nLogin SUCCESS:" -ForegroundColor Green
  $response | ConvertTo-Json -Depth 10
} catch {
  Write-Host "`nLogin FAILED:" -ForegroundColor Red
  Write-Host $_.Exception.Message
  if ($_.ErrorDetails.Message) {
    Write-Host "Response body:" -ForegroundColor Yellow
    $_.ErrorDetails.Message
  }
}

$ErrorActionPreference = 'SilentlyContinue'
while ($true) {
  $backend = try { (Invoke-WebRequest -Uri 'http://127.0.0.1:5000/health' -UseBasicParsing).StatusCode } catch { $_.Exception.Response.StatusCode.value__ }
  $frontend = try { (Invoke-WebRequest -Uri 'http://127.0.0.1:3000' -UseBasicParsing).StatusCode } catch { $_.Exception.Response.StatusCode.value__ }
  $time = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
  Write-Host "[$time] Backend: $backend | Frontend: $frontend"
  Start-Sleep -Seconds 10
}
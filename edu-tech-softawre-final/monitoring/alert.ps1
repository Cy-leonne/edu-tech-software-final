
$ErrorActionPreference = 'SilentlyContinue'

$targets = @(
  @{ Name = 'Backend'; Url = 'http://127.0.0.1:5000/health' },
  @{ Name = 'Frontend'; Url = 'http://127.0.0.1:3000' }
)

Write-Host 'Monitoring started. Press Ctrl+C to stop.'

while ($true) {
  foreach ($target in $targets) {
    try {
      $resp = Invoke-WebRequest -Uri $target.Url -UseBasicParsing -TimeoutSec 5
      if ($resp.StatusCode -ge 200 -and $resp.StatusCode -lt 400) {
        Write-Host "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $($target.Name): OK"
      }
      else {
        Write-Host "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $($target.Name): WARNING ($($resp.StatusCode))"
      }
    }
    catch {
      Write-Host "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $($target.Name): DOWN"
    }
  }

  Start-Sleep -Seconds 15
}

Param(
  [string]$m = "update"
)

git add -A
git commit -m $m
git push origin main

Write-Host "Deployed OK"

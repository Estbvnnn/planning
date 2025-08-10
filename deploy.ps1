param(
  [Parameter(Mandatory=$false)][string]$m = "update"
)
git add -A
git commit -m $m
git push -u origin main
Write-Host ""
Write-Host "✅ Poussé sur GitHub. GitHub Pages va se mettre à jour dans ~30-60s."

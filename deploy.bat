@echo off
setlocal ENABLEDELAYEDEXPANSION
REM Usage: deploy.bat Initial commit   (pas de guillemets nécessaires)
REM       deploy.bat "Initial commit"  (marche aussi)
set "MSG=%*"
if not defined MSG set "MSG=update"
git add -A
git commit -m "!MSG!"
git push -u origin main
echo.
echo ✅ Poussé sur GitHub. GitHub Pages va se mettre à jour dans ~30-60s.
endlocal

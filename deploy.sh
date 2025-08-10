#!/usr/bin/env bash
# Usage: ./deploy.sh "commit message"
MSG="${*:-update}"
set -e
git add -A
git commit -m "$MSG" || true
git push -u origin main
echo
echo "✅ Poussé sur GitHub. GitHub Pages va se mettre à jour dans ~30-60s."

# Planning — PWA minimaliste

- Menu hamburger robuste (☰) avec drawer animé.
- Paramètres (thème, langue, rappel quotidien .ics avec son).
- Données locales (LocalStorage), export .json, export .ics.
- PWA : manifest + service worker, installable & offline.
- `manifest.webmanifest` a `start_url: "index.html"` (ok pour GitHub Pages).
- `.nojekyll` inclus.

## Déploiement GitHub en 1 clic (scripts)
- **Windows** : `deploy.bat "ton message"`
- **macOS/Linux** : `./deploy.sh "ton message"`

Prérequis une seule fois :
```bash
git init
git branch -M main
git remote add origin https://github.com/<ton-user>/planning.git
```
Puis à chaque modif : lance juste `deploy.bat` ou `deploy.sh`.

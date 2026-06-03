#!/bin/bash
echo "Removing exposed secrets from git tracking..."

# Remove specific files from git tracking (keeps them on disk)
git rm --cached firebase-applet-config.json 2>/dev/null || echo "File not tracked"
git rm --cached .env 2>/dev/null || echo ".env not tracked"
git rm --cached firebase-config.json 2>/dev/null || echo "Not tracked"

# Stage .gitignore changes
git add .gitignore
git add .env.example

# Commit the security fix
git add -A
git commit -m "security: remove exposed API keys, add env variable config

- Remove firebase-applet-config.json from tracking
- Add .gitignore to prevent future secret commits  
- Move all API keys to environment variables
- Add .env.example as template for contributors"

echo "Done! Now push: git push"
echo ""
echo "IMPORTANT: Rotate your API keys now:"
echo "1. Google/Gemini: https://console.cloud.google.com/apis/credentials"
echo "2. Firebase: https://console.firebase.google.com -> Project Settings"

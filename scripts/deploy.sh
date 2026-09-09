#!/usr/bin/env bash
# Publishes the built site to the gh-pages branch.
#
# Pages is served from a branch rather than the Actions workflow, because Actions is
# blocked on this account. If that is ever fixed, .github/workflows/deploy.yml takes
# over on its own and this script becomes unnecessary.
set -euo pipefail
cd "$(dirname "$0")/.."

REMOTE=$(git remote get-url origin)
SHA=$(git rev-parse --short HEAD)
REPO=$(basename -s .git "$REMOTE")

rm -rf dist
SITE_BASE="/$REPO/" npm run build
touch dist/.nojekyll

cd dist
rm -rf .git
git init -q
git checkout -qb gh-pages
git add -A
git commit -q -m "Publish built site from main @ $SHA"
git push -qf "$REMOTE" gh-pages
echo "deployed $SHA -> https://$(basename "$(dirname "$REMOTE" | sed 's/.*://')").github.io/$REPO/"

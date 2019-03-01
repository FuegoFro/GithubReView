#!/usr/bin/env bash
set -euo pipefail

# Script taken from https://cli.vuejs.org/guide/deployment.html#github-pages

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

# build
cd "${DIR}"
npm run build
ORIGIN_URL=$(git remote get-url origin)

# navigate into the build output directory and push to remote
cd "${DIR}/dist"
ln -s index.html 404.html
git init
git add -A
git commit -m 'deploy'
# Deploy to https://<USERNAME>.github.io/<REPO>
git push -f "${ORIGIN_URL}" master:gh-pages


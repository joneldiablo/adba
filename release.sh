#!/bin/bash
set -euo pipefail

# =============================================================================
# release.sh — Automated release & npm publish for adba
#
# Normalized with the dblimp (imp-ts) flow:
#   1. clean working tree required (run from a dev/feature branch)
#   2. bump version on the current branch with a "-<branch>" suffix + commit
#   3. merge current branch → master
#   4. strip the suffix on master → release version
#   5. tests + build + docs + exports (on master, after merge)
#   6. commit + push master, tag vX.Y.Z + push
#   7. npm publish (OTP retry loop, skips already-published versions)
#   8. back to the original branch
#
# Usage:
#   ./release.sh              full release from a dev/feature branch
#   ./release.sh --continue   resume npm publish after a cut-off script
#                             (assumes the release is already tagged on master)
# =============================================================================

# Parse flags
CONTINUE_MODE=false
for arg in "$@"; do
  case "$arg" in
    --continue) CONTINUE_MODE=true ;;
    -h|--help)
      echo "Usage: release.sh [--continue]"
      echo "  (default) full release from a dev/feature branch"
      echo "  --continue resume npm publish after a cut-off script (assumes release is tagged on master)"
      exit 0
      ;;
  esac
done

# Clean npm env vars that cause auth issues when run from within yarn
unset npm_config_version_commit_hooks
unset npm_config_version_tag_prefix
unset npm_config_version_git_message
unset npm_config_argv
unset npm_config_version_git_tag
unset npm_config_registry
export NPM_CONFIG_REGISTRY="https://registry.npmjs.org/"

echo "=== adba Release ==="
echo "npm user: $(npm whoami 2>/dev/null || echo 'NOT LOGGED IN')"
npm whoami &>/dev/null || { echo "Login first: npm login"; exit 1; }

# Helpers
get_ver() { node -p "require('./package.json').version"; }
set_ver() { node -e "const fs=require('fs');const p=JSON.parse(fs.readFileSync('./package.json','utf8'));p.version='$1';fs.writeFileSync('./package.json',JSON.stringify(p,null,2)+'\n')"; }
bump() { node -e "const s='$1'.split('.'),p=s.pop().split('-')[0];s.push(String((parseInt(p,10)||0)+1));console.log(s.join('.'))"; }
add_suffix() { local v=$1 s=$2; [ "$s" = "master" ] && echo "$v" || echo "${v}-${s}"; }
strip_suffix() { echo "$1" | sed 's/-.*$//'; }

# Publish adba to npm, retrying OTP until success, "skip", or blank.
publish_package() {
  local NAME VER
  NAME=$(node -p "require('./package.json').name")
  VER=$(get_ver)

  # Skip if this exact version is already live on the registry.
  if [ "$(npm view "$NAME@$VER" version 2>/dev/null)" = "$VER" ]; then
    echo "  ✅ $NAME@$VER already published – skipping"
    return 0
  fi

  echo ""
  echo "--- Publishing $NAME@$VER ---"
  while true; do
    echo "Enter npm OTP for $NAME@$VER (blank/skip = skip):"
    read -r OTP || return 1
    if [ -z "$OTP" ] || [ "$OTP" = "skip" ]; then
      echo "⏭️  Skipped $NAME@$VER"
      return 0
    fi
    if npm publish --otp="$OTP"; then
      echo "✅ $NAME@$VER published"
      return 0
    else
      echo "Publish failed (bad OTP or network). Try again."
    fi
  done
}

# Continue mode: resume npm publish for the current release, then return to dev.
publish_only() {
  local START_BRANCH RETURN_BRANCH
  START_BRANCH=$(git symbolic-ref --short HEAD)
  RETURN_BRANCH="$START_BRANCH"
  [ "$RETURN_BRANCH" = "master" ] && RETURN_BRANCH="dev"
  RELEASE_VER=$(strip_suffix "$(get_ver)")
  echo "Resuming npm publish for v${RELEASE_VER} (working on $START_BRANCH)..."
  publish_package
  if [ "$(git symbolic-ref --short HEAD)" != "$RETURN_BRANCH" ]; then
    git checkout "$RETURN_BRANCH" 2>/dev/null || true
  fi
  echo "Back to $RETURN_BRANCH"
  echo "=== Publish complete: v${RELEASE_VER} ==="
}

if [ "$CONTINUE_MODE" = true ]; then
  publish_only
  exit 0
fi

# Step 1 – check clean working tree
if ! git diff-index --quiet HEAD --; then echo "Uncommitted changes detected."; exit 1; fi

CURRENT_BRANCH=$(git symbolic-ref --short HEAD)
if [ "$CURRENT_BRANCH" = "master" ]; then echo "Already on master. Work on a feature/dev branch, then run release.sh."; exit 1; fi
echo "Branch: $CURRENT_BRANCH"

# Step 2 – bump version on current branch (with suffix)
OLD_VER=$(get_ver)
NEW_VER=$(add_suffix "$(bump "$OLD_VER")" "$CURRENT_BRANCH")
set_ver "$NEW_VER"
echo "  $OLD_VER → $NEW_VER (bumped + suffixed)"
SAVED_VER="$NEW_VER"

# Step 3 – commit version on current branch
git add .
git commit -m "v${NEW_VER}"
echo "Committed v${NEW_VER} on $CURRENT_BRANCH"

# Step 4 – merge current branch into master
echo ""
echo "Merging $CURRENT_BRANCH → master..."
git checkout master
git merge - --no-edit -X theirs
echo "Merged."

# Step 5 – strip suffix on master → release version
RELEASE_VER=$(strip_suffix "$SAVED_VER")
set_ver "$RELEASE_VER"
echo "Release version: $RELEASE_VER"

# Step 6 – tests + build + docs + exports (on master, after merge)
# `yarn build` runs: yarn test && clean dist && tsc (cjs + esm) && typedoc
echo ""
echo "Running tests, build & docs..."
yarn build
echo "Generating exports..."
node exports.js
echo ""

# Step 7 – commit release on master
git add .
git commit -m "v${RELEASE_VER}"
git push origin master
echo "Pushed master."

# Step 8 – tag & push
git tag -a "v${RELEASE_VER}" -m "adba v${RELEASE_VER}"
git push origin "v${RELEASE_VER}"
echo "Tagged v${RELEASE_VER}"

# Step 9 – npm publish
echo ""
echo "Publishing to npm..."
publish_package

# Step 10 – back to original branch
git checkout "$CURRENT_BRANCH"
git push origin "$CURRENT_BRANCH"
echo "Back to $CURRENT_BRANCH"
echo "=== Done: v${RELEASE_VER} ==="

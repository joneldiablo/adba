#!/bin/bash

# Pre-release verification script
echo "🔍 Verifying release prerequisites..."

# Check if logged into npm
echo "Checking npm authentication..."
npm whoami > /dev/null 2>&1
if [ $? -eq 0 ]; then
  npm_user=$(npm whoami)
  echo "✅ Authenticated as: $npm_user"
else
  echo "❌ Not authenticated with npm"
  echo "Please run: npm login"
  exit 1
fi

# Check npm registry
registry=$(npm config get registry)
echo "📦 Registry: $registry"

if [ "$registry" != "https://registry.npmjs.org/" ]; then
  echo "⚠️  Warning: Using non-default registry: $registry"
  echo "To switch to npm registry: npm config set registry https://registry.npmjs.org/"
fi

# Check if we can access the package
package_name=$(node -p "require('./package.json').name")
echo "📦 Package name: $package_name"

# Try to view package info (will fail if doesn't exist or no access)
npm view "$package_name" version > /dev/null 2>&1
if [ $? -eq 0 ]; then
  current_published=$(npm view "$package_name" version)
  local_version=$(node -p "require('./package.json').version")
  echo "📊 Current published version: $current_published"
  echo "📊 Local version: $local_version"
else
  echo "📦 Package not yet published or no access"
fi

# Check git status
if git diff-index --quiet HEAD --; then
  echo "✅ No uncommitted changes"
else
  echo "⚠️  Warning: Uncommitted changes detected"
fi

# Check current branch
current_branch=$(git symbolic-ref --short HEAD)
echo "🌲 Current branch: $current_branch"

echo ""
echo "✅ Pre-release verification complete!"
echo "Run: ./release.sh --otp YOUR_OTP"
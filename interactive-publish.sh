#!/bin/bash

# Interactive npm publish script
echo "🚀 Interactive ADBA Publishing..."

# Clean environment
unset npm_config_version_commit_hooks
unset npm_config_version_tag_prefix  
unset npm_config_version_git_message
unset npm_config_argv
unset npm_config_version_git_tag

# Configure npm
export NPM_CONFIG_REGISTRY="https://registry.npmjs.org/"
npm config set registry https://registry.npmjs.org/ --location=user

# Verify authentication
echo "🔍 Verifying authentication..."
npm_user=$(npm whoami --registry=https://registry.npmjs.org/ 2>/dev/null)
if [ $? -ne 0 ]; then
  echo "❌ Not authenticated. Run: npm login --registry=https://registry.npmjs.org/"
  exit 1
fi
echo "✅ Authenticated as: $npm_user"

# Get current version
current_version=$(node -p "require('./package.json').version" 2>/dev/null)
if [ $? -ne 0 ]; then
  echo "❌ Error reading package.json"
  exit 1
fi
echo "📦 Publishing version: $current_version"

# Interactive publish
echo ""
echo "🎯 Starting interactive publish..."
echo "Note: If OTP is incorrect, npm will prompt you to enter a new one"
echo ""

# Check if user provided OTP as argument
if [ "$1" = "--otp" ] && [ -n "$2" ]; then
  echo "📋 Using provided OTP: $2"
  npm publish --otp="$2" --registry https://registry.npmjs.org/
else
  echo "📋 Publishing (npm will prompt for OTP if needed)..."
  npm publish --registry https://registry.npmjs.org/
fi

publish_status=$?

echo ""
if [ $publish_status -eq 0 ]; then
  echo "✅ Successfully published $current_version to npm!"
  echo "🌐 Available at: https://www.npmjs.com/package/adba"
else
  echo "❌ Publish failed (exit code: $publish_status)"
  echo ""
  echo "To retry:"
  echo "  ./interactive-publish.sh --otp YOUR_OTP"
  echo "  OR"
  echo "  ./interactive-publish.sh (let npm prompt for OTP)"
fi
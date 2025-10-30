#!/bin/bash

# Simple npm publish script for when build/version is already done
echo "🚀 Publishing ADBA to npm..."

# Clean up npm environment variables
unset npm_config_version_commit_hooks
unset npm_config_version_tag_prefix  
unset npm_config_version_git_message
unset npm_config_argv
unset npm_config_version_git_tag

# Force npm registry
export NPM_CONFIG_REGISTRY="https://registry.npmjs.org/"
npm config set registry https://registry.npmjs.org/ --location=user

# Check for OTP argument
OTP=""
if [ "$1" = "--otp" ] && [ -n "$2" ]; then
  OTP="$2"
elif [ -z "$1" ]; then
  echo "Usage: $0 --otp YOUR_OTP"
  echo "Example: $0 --otp 123456"
  exit 1
fi

# Verify authentication
echo "🔍 Verifying authentication..."
npm_user=$(npm whoami --registry=https://registry.npmjs.org/ 2>/dev/null)
if [ $? -ne 0 ]; then
  echo "❌ Not authenticated. Run: npm login --registry=https://registry.npmjs.org/"
  exit 1
fi
echo "✅ Authenticated as: $npm_user"

# Check current version
current_version=$(node -p "require('./package.json').version")
echo "📦 Publishing version: $current_version"

# Publish with OTP
echo "🚀 Publishing to npm..."
if [ -n "$OTP" ]; then
  publish_output=$(npm publish --otp "$OTP" --registry https://registry.npmjs.org/ 2>&1)
  publish_status=$?
else
  publish_output=$(npm publish --registry https://registry.npmjs.org/ 2>&1)
  publish_status=$?
fi

# Check result
if [ $publish_status -eq 0 ]; then
  echo "✅ Successfully published $current_version to npm!"
  echo "🌐 Available at: https://www.npmjs.com/package/adba"
else
  echo "❌ Publish failed:"
  echo "$publish_output"
  exit 1
fi
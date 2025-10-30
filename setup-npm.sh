#!/bin/bash

echo "🔧 Setting up npm configuration for ADBA release..."

# Configure npm registry
echo "📦 Configuring npm registry..."
npm config set registry https://registry.npmjs.org/ --location=user

# Verify npm configuration
echo "✅ npm registry: $(npm config get registry)"

# Check authentication
echo "🔍 Checking npm authentication..."
npm_user=$(npm whoami --registry=https://registry.npmjs.org/ 2>/dev/null)
if [ $? -eq 0 ]; then
  echo "✅ Already authenticated as: $npm_user"
else
  echo "⚠️  Not authenticated. Please run:"
  echo "   npm login --registry=https://registry.npmjs.org/"
  echo ""
  echo "After login, verify with:"
  echo "   npm whoami --registry=https://registry.npmjs.org/"
fi

echo ""
echo "🎯 Setup complete! You can now run:"
echo "   ./verify-release.sh"
echo "   ./release.sh --otp YOUR_OTP"
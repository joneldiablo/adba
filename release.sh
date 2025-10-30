#!/bin/bash
# Variable initialization
OTP=""
VERBOSE=false

# Clean up npm environment variables that cause warnings
unset npm_config_version_commit_hooks
unset npm_config_version_tag_prefix  
unset npm_config_version_git_message
unset npm_config_argv
unset npm_config_version_git_tag

# Force npm registry configuration
export NPM_CONFIG_REGISTRY="https://registry.npmjs.org/"

# Check npm authentication and registry
echo "🔍 Checking npm configuration..."

# Force npm to use the correct registry
npm config set registry https://registry.npmjs.org/ --location=user

echo "Registry: $(npm config get registry)"
echo "Current npm user: $(npm whoami --registry=https://registry.npmjs.org/ 2>/dev/null || echo 'Not logged in')"

# Usage function
usage() {
  echo "Usage: $0 --otp YOUR_OTP [--verbose]"
  echo "  --otp YOUR_OTP    Two-factor authentication OTP (required)"
  echo "  --verbose         Enable verbose output for debugging"
  echo ""
  echo "Example: $0 --otp 123456"
  echo "Example: $0 --otp 123456 --verbose"
  exit 1
}

# Argument parsing
while getopts ":-:" opt; do
  case ${opt} in
    -)
      case "${OPTARG}" in
        otp)
          OTP="${!OPTIND}"
          OPTIND=$(($OPTIND + 1))
          ;;
        verbose)
          VERBOSE=true
          ;;
        *)
          echo "Invalid option: --${OPTARG}" >&2
          usage
          ;;
      esac
      ;;
    \?)
      echo "Invalid option: -$OPTARG" >&2
      usage
      ;;
    :)
      echo "Option -$OPTARG requires an argument." >&2
      usage
      ;;
  esac
done

# Enable verbose mode if requested
if [ "$VERBOSE" = true ]; then
  set -x
  echo "🔍 Verbose mode enabled"
fi

# Check for uncommitted changes
if git diff-index --quiet HEAD --; then
  echo "No uncommitted changes. Continuing..."
else
  echo "Uncommitted changes detected. Stopping the script."
  exit 1
fi

# Get current branch name
current_branch=$(git symbolic-ref --short HEAD)

# Merge current branch into master
if [ "$current_branch" != "master" ]; then
  # Switch to master branch
  git checkout master
  git merge -
  # Check for merge conflicts
  if [ $? -ne 0 ]; then
    echo "Merge conflicts detected. Please resolve them and then run the script again."
    exit 1
  fi
else
  echo "Already on master branch. No merge needed."
fi

# builds
yarn build

# Check if build was successful
if [ $? -ne 0 ]; then
  echo "Build failed. Stopping the script."
  exit 1
fi

node exports.js
# Update version and capture the new version
new_version=$(node update-version.js)

# Commit with the new version number
git add .
git commit -m "$new_version"
git push origin --all
git tag -a "$new_version" -m "$new_version"
git push origin "$new_version"

# Verify npm authentication before publishing
echo "🔍 Checking npm authentication..."

# Force npm registry (ignore yarn registry)
export NPM_CONFIG_REGISTRY="https://registry.npmjs.org/"
npm config set registry https://registry.npmjs.org/ --location=user

echo "Registry: $(npm config get registry)"

# Check npm user (filter out warnings, use specific registry)
npm_user=$(npm whoami --registry=https://registry.npmjs.org/ 2>/dev/null)
npm_auth_status=$?

if [ $npm_auth_status -ne 0 ]; then
  echo "❌ Error: Not authenticated with npm."
  echo "Debug information:"
  echo "  - Registry: $(npm config get registry)"
  echo "  - HOME: $HOME"
  echo "  - USER: $USER"
  echo ""
  echo "Please ensure you are logged in:"
  echo "  1. Run: npm login --registry=https://registry.npmjs.org/"
  echo "  2. Verify with: npm whoami --registry=https://registry.npmjs.org/"
  echo "  3. Then retry the release"
  exit 1
fi

echo "✅ npm authentication verified. User: $npm_user"

# Publish on npm
echo "🚀 Publishing to npm..."

if [ -n "$OTP" ]; then
  echo "📋 Publishing with OTP: $OTP"
  echo "📦 Command: npm publish --otp=$OTP --registry https://registry.npmjs.org/"
  
  # Execute directly without capturing output to maintain interactivity
  npm publish --otp="$OTP" --registry https://registry.npmjs.org/
  publish_status=$?
else
  echo "📋 Publishing without OTP..."
  echo "📦 Command: npm publish --registry https://registry.npmjs.org/"
  
  # Execute directly without capturing output to maintain interactivity
  npm publish --registry https://registry.npmjs.org/
  publish_status=$?
fi

# Check if publish was successful
if [ $publish_status -eq 0 ]; then
  echo "✅ Successfully published to npm!"
else
  echo "❌ Failed to publish to npm (exit code: $publish_status)"
  echo ""
  echo "Common issues:"
  echo "  - Authentication expired: Run 'npm login' again"
  echo "  - 2FA required: Provide valid OTP"
  echo "  - Version already exists: Update version in package.json"
  echo "  - Registry issue: Check 'npm config get registry'"
  echo ""
  echo "You can retry with: ./release.sh --otp YOUR_NEW_OTP"
  exit 1
fi

# Switch back to the previous branch
git checkout -

# Show new version
echo "$new_version"

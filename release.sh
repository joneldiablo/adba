#!/bin/bash
# Variable initialization
OTP=""
VERBOSE=false

# Check npm authentication and registry
echo "🔍 Checking npm configuration..."
npm config get registry
echo "Current npm user: $(npm whoami 2>/dev/null || echo 'Not logged in')"

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
echo "Registry: $(npm config get registry)"
echo "Auth token: $(npm config get //registry.npmjs.org/:_authToken | sed 's/./*/g')"

# Check npm user
npm_user=$(npm whoami 2>&1)
npm_auth_status=$?

if [ $npm_auth_status -ne 0 ]; then
  echo "❌ Error: Not authenticated with npm."
  echo "Debug information:"
  echo "  - npm whoami output: $npm_user"
  echo "  - npm config get registry: $(npm config get registry)"
  echo "  - HOME: $HOME"
  echo "  - USER: $USER"
  echo ""
  echo "Please ensure you are logged in:"
  echo "  1. Run: npm login"
  echo "  2. Or set auth token: npm config set //registry.npmjs.org/:_authToken YOUR_TOKEN"
  echo "  3. Verify with: npm whoami"
  exit 1
fi

echo "✅ npm authentication verified. User: $npm_user"

# Publish on npm
echo "🚀 Publishing to npm..."

if [ -n "$OTP" ]; then
  echo "📋 Publishing with OTP: $OTP"
  echo "📦 Command: npm publish --otp $OTP --registry https://registry.npmjs.org/"
  
  # Capture both stdout and stderr
  publish_output=$(npm publish --otp "$OTP" --registry https://registry.npmjs.org/ 2>&1)
  publish_status=$?
  
  echo "📋 npm publish output:"
  echo "$publish_output"
else
  echo "📋 Publishing without OTP..."
  echo "📦 Command: npm publish --registry https://registry.npmjs.org/"
  
  # Capture both stdout and stderr
  publish_output=$(npm publish --registry https://registry.npmjs.org/ 2>&1)
  publish_status=$?
  
  echo "📋 npm publish output:"
  echo "$publish_output"
fi

# Check if publish was successful
if [ $publish_status -eq 0 ]; then
  echo "✅ Successfully published to npm!"
else
  echo "❌ Failed to publish to npm."
  echo "Exit code: $publish_status"
  echo "Output: $publish_output"
  echo ""
  echo "Common issues:"
  echo "  - Authentication expired: Run 'npm login' again"
  echo "  - 2FA required: Add --otp YOUR_OTP"
  echo "  - Version already exists: Update version in package.json"
  echo "  - Registry issue: Check 'npm config get registry'"
  exit 1
fi

# Switch back to the previous branch
git checkout -

# Show new version
echo "$new_version"

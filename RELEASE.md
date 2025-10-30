# Release Process Guide

This document provides detailed information about the ADBA release process and troubleshooting common issues.

## Quick Release

```bash
# 1. Setup npm configuration (first time only)
./setup-npm.sh

# 2. Verify prerequisites
./verify-release.sh

# 3. Execute full release with your OTP
./release.sh --otp 123456
```

## Alternative: Publish Only

If the build and version were already updated but publish failed:

```bash
# Just publish the current version
./publish-only.sh --otp 123456
```

## Available Scripts

### `setup-npm.sh` - Initial Setup
- Configures npm registry to use npmjs.org
- Checks authentication status
- Provides login instructions if needed

### `verify-release.sh` - Pre-Release Verification
- Verifies npm authentication and registry
- Checks package versions and git status
- Ensures all prerequisites are met

### `release.sh` - Full Release Process
- Complete build, version, and publish cycle
- Handles git operations and npm publishing
- Supports verbose mode for debugging

### `publish-only.sh` - Publish Current Version
- Quick publish without build/version steps
- Useful when previous release failed at publish step
- Includes authentication verification

## Detailed Release Process

### Step 1: Initial Setup (First Time Only)

```bash
./setup-npm.sh
```

This configures npm to use the correct registry and checks authentication.

### Step 2: Pre-Release Verification

```bash
./verify-release.sh
```

This script checks:
- ✅ npm authentication status
- 📦 npm registry configuration (forces npmjs.org)
- 📊 Current vs local package versions
- 🌲 Git branch and uncommitted changes
- 📦 Package access permissions

### Step 3: Release Execution

```bash
# Full release (recommended)
./release.sh --otp YOUR_OTP

# Verbose release (for debugging)
./release.sh --otp YOUR_OTP --verbose

# Publish only (if build already done)
./publish-only.sh --otp YOUR_OTP
```

The release script performs these steps:
1. **Environment Setup**: Cleans npm config and sets correct registry
2. **Authentication Check**: Verifies npm login with npmjs.org registry
3. **Git Validation**: Checks for uncommitted changes
4. **Branch Management**: Merges to master if needed
5. **Build Process**: Runs `yarn build` and generates exports
6. **Version Update**: Increments version automatically
7. **Git Operations**: Commits, tags, and pushes changes
8. **npm Publishing**: Publishes with OTP and explicit registry

## Common Issues and Solutions

### Authentication Errors

**Error**: `need auth This command requires you to be logged in`

**Solutions**:
```bash
# 1. Login to npm
npm login

# 2. Verify authentication
npm whoami

# 3. Check registry
npm config get registry

# 4. If using custom registry, switch to npm
npm config set registry https://registry.npmjs.org/
```

**Debug Information**:
The enhanced release script now shows:
- Current npm user
- Registry configuration
- Authentication token status (masked)
- Environment variables

### 2FA/OTP Issues

**Error**: `two-factor authentication required`

**Solutions**:
```bash
# Always provide OTP
./release.sh --otp 123456

# Get fresh OTP from your authenticator app
# OTP codes expire every 30 seconds
```

### Version Conflicts

**Error**: `version already exists`

**Solutions**:
```bash
# Check published versions
npm view adba versions --json

# The script auto-increments patch version
# Manual version update (if needed):
node update-version.js
```

### Build Failures

**Error**: Build process fails

**Solutions**:
```bash
# 1. Clean install dependencies
rm -rf node_modules yarn.lock
yarn install

# 2. Run tests
yarn test

# 3. Manual build test
yarn build

# 4. Check TypeScript errors
npx tsc --noEmit
```

### Git Issues

**Error**: Uncommitted changes or merge conflicts

**Solutions**:
```bash
# 1. Check git status
git status

# 2. Commit changes
git add .
git commit -m "Pre-release changes"

# 3. If on feature branch, ensure master is up to date
git checkout master
git pull origin master
git checkout your-branch
```

## Environment Debugging

If authentication works manually but fails in the script:

### Check Environment Variables
```bash
echo "HOME: $HOME"
echo "USER: $USER"
echo "NODE_ENV: $NODE_ENV"
npm config list
```

### Registry Configuration
```bash
# Check all npm configuration
npm config list --json

# Verify auth token exists
npm config get //registry.npmjs.org/:_authToken
```

### Manual vs Script Testing
```bash
# Test manual publish (dry run)
npm publish --dry-run

# Test with explicit registry
npm publish --dry-run --registry https://registry.npmjs.org/

# Test with OTP
npm publish --dry-run --otp 123456 --registry https://registry.npmjs.org/
```

## Script Enhancement History

The release script has been enhanced with:

### v1.1 Improvements
- ✅ Authentication verification before publishing
- 📋 Explicit registry specification
- 🔍 Verbose mode for debugging
- 📊 Enhanced error reporting
- 🛡️ Pre-release verification script

### v1.2 Improvements  
- 🔍 Detailed authentication debugging
- 📋 Command output capture and display
- ⚠️ Common error solutions
- 🌍 Environment variable inspection
- 📦 Registry and token validation

## Files

- `release.sh` - Main release automation script
- `verify-release.sh` - Pre-release verification
- `update-version.js` - Version management
- `exports.js` - Export generation

## Getting Help

If you continue experiencing issues:

1. Run with verbose mode: `./release.sh --otp YOUR_OTP --verbose`
2. Check the output for specific error messages
3. Verify all prerequisites with `./verify-release.sh`
4. Test manual npm commands before using the script
5. Check npm status: https://status.npmjs.org/

For ADBA-specific issues, ensure:
- All tests pass: `yarn test`
- Build succeeds: `yarn build`
- TypeScript compiles: `npx tsc --noEmit`
- Dependencies updated: `yarn install`
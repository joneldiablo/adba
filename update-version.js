#!/usr/bin/env node
/**
 * update-version.js — Version bump with branch suffix support.
 *
 * The release.sh now handles versioning natively (helpers), so this file
 * is kept for standalone use or post-release dev bumping.
 *
 * Usage:
 *   node update-version.js                    # bump patch (1.0.3 → 1.0.4)
 *   node update-version.js bump-dev           # bump + -dev suffix
 *   node update-version.js release            # strip suffix
 */
const pkg = require('./package.json');
const fs = require('fs');

const mode = process.argv[2] || 'release';

let version = pkg.version;

if (mode === 'release') {
  // Strip pre-release suffix: 1.0.3-dev → 1.0.3
  version = version.replace(/-[a-zA-Z0-9.]+$/, '');
  console.log(`Release version: ${version}`);
} else if (mode === 'bump-dev') {
  // Strip suffix first if present
  version = version.replace(/-[a-zA-Z0-9.]+$/, '');
  // Bump patch: 1.0.3 → 1.0.4
  const parts = version.split('.');
  const patch = parseInt(parts[parts.length - 1], 10);
  parts[parts.length - 1] = String(patch + 1);
  version = parts.join('.') + '-dev';
  console.log(`Dev version: ${version}`);
} else {
  console.error(`Unknown mode: ${mode}. Use "release" (default) or "bump-dev".`);
  process.exit(1);
}

pkg.version = version;
fs.writeFileSync('./package.json', JSON.stringify(pkg, null, 2) + '\n');

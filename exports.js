#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

/**
 * Reads a directory recursively and returns a list of all files with their relative paths.
 * @param {string} dir - The directory path.
 * @param {string} baseDir - The base directory for relative paths.
 * @returns {string[]} - A list of relative file paths.
 */
const getFilesRecursively = (dir, baseDir) => {
  let results = [];
  const list = fs.readdirSync(dir, { withFileTypes: true });

  list.forEach((file) => {
    const fullPath = path.join(dir, file.name);
    const relativePath = path.relative(baseDir, fullPath);

    if (file.isDirectory()) {
      results = results.concat(getFilesRecursively(fullPath, baseDir));
    } else {
      results.push(relativePath);
    }
  });

  return results;
};

/**
 * Removes the file extension from a path.
 * @param {string} filePath - The file path.
 * @returns {string} - The path without extension.
 */
const removeExtension = (filePath) => {
  return filePath.replace(/\.[^/.]+$/, ''); // Removes last file extension
};

/**
 * Determines the correct source file extension by checking if it exists.
 * @param {string} basePath - The base path without extension.
 * @returns {string} - The correct file path with the appropriate extension.
 */
const getSourceFilePath = (basePath) => {
  const tsPath = `${basePath}.ts`;
  const tsxPath = `${basePath}.tsx`;
  return fs.existsSync(tsxPath) ? tsxPath : tsPath;
};

/**
 * Generates the exports and directories fields dynamically based on dist folder structure.
 */
const generateExportsAndDirectories = () => {
  const packagePath = path.join(process.cwd(), 'package.json');
  if (!fs.existsSync(packagePath)) {
    console.error('Error: package.json not found in the current directory.');
    process.exit(1);
  }

  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));

  const srcDir = path.join(process.cwd(), 'src/js');
  const distDir = path.join(process.cwd(), 'dist');

  if (!fs.existsSync(distDir)) {
    console.error('Error: dist directory not found.');
    process.exit(1);
  }

  const esmDir = path.join(distDir, 'esm');
  const cjsDir = path.join(distDir, 'cjs');
  const typesDir = path.join(distDir, 'types');

  const exportsConfig = {
    ".": {
      import: "./dist/esm/index.js",
      require: "./dist/cjs/index.js",
      types: "./dist/types/index.d.ts",
      source: getSourceFilePath("./src/js/index")
    }
  };

  if (fs.existsSync(esmDir) && fs.existsSync(cjsDir) && fs.existsSync(typesDir)) {
    const esmFiles = getFilesRecursively(esmDir, esmDir);
    esmFiles.forEach(file => {
      const baseFilePath = `./src/js/${removeExtension(file).replace(/\\/g, '/')}`;
      const key = `./${removeExtension(file).replace(/\\/g, '/')}`;
      exportsConfig[key] = {
        import: `./dist/esm/${file.replace(/\\/g, '/')}`,
        require: `./dist/cjs/${file.replace(/\\/g, '/')}`,
        types: `./dist/types/${removeExtension(file).replace(/\\/g, '/')}.d.ts`,
        source: getSourceFilePath(baseFilePath)
      };
    });
  }

  packageJson.exports = exportsConfig;

  fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));
  console.log('✅ package.json updated successfully');
};

generateExportsAndDirectories();

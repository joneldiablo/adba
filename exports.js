#!/usr/bin/env node
/* eslint-disable no-console */

const fs = require("fs");
const path = require("path");

const getFilesRecursively = (dir, baseDir) => {
  let results = [];
  for (const dirent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, dirent.name);
    const rel = path.relative(baseDir, full);
    if (dirent.isDirectory())
      results = results.concat(getFilesRecursively(full, baseDir));
    else results.push(rel);
  }
  return results;
};

const removeExtension = (filePath) => filePath.replace(/\.[^/.]+$/, "");

const getSourceFilePath = (basePath) => {
  const ts = `${basePath}.ts`;
  const tsx = `${basePath}.tsx`;
  return fs.existsSync(tsx) ? tsx : ts;
};

function sourceHasExports(srcPath) {
  if (!fs.existsSync(srcPath)) return false;
  let code = fs.readFileSync(srcPath, "utf8");
  code = code
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");
  const hasDefault = /\bexport\s+default\b/.test(code);
  const hasDecl = /\bexport\s+(?:const|let|var|function|class|enum|interface|type)\b/.test(code);
  const hasStar = /\bexport\s*\*\s*from\s*['"][^'"]+['"]/.test(code);
  const hasNamed = /\bexport\s*\{[^}]*[A-Za-z0-9_$][^}]*\}\s*(?:from\s*['"][^'"]+['"])?/.test(code);
  const onlyEmptyExport = /^\s*export\s*\{\s*\}\s*;?\s*$/m.test(code) &&
    code.replace(/^\s*export\s*\{\s*\}\s*;?\s*$/gm, "").trim().length === 0;
  return (hasDefault || hasDecl || hasStar || hasNamed) && !onlyEmptyExport;
}

function esmHasExports(esmPath) {
  if (!fs.existsSync(esmPath)) return false;
  const code = fs.readFileSync(esmPath, "utf8");
  if (/\bexport\s+default\b/.test(code)) return true;
  if (/\bexport\s+(?:const|function|class|var)\b/.test(code)) return true;
  if (/\bexport\s*\*\s*from\s*['"][^'"]+['"]/.test(code)) return true;
  if (/\bexport\s*\{[^}]*[A-Za-z0-9_$][^}]*\}/.test(code)) return true;
  return false;
}

const generateExportsAndDirectories = () => {
  const packagePath = path.join(process.cwd(), "package.json");
  if (!fs.existsSync(packagePath)) {
    console.error("Error: package.json not found.");
    process.exit(1);
  }
  const pkg = JSON.parse(fs.readFileSync(packagePath, "utf-8"));

  const distRoot = path.join(process.cwd(), "dist");
  const esmDir = path.join(distRoot, "esm");
  const cjsDir = path.join(distRoot, "cjs");
  const typesDir = path.join(distRoot, "types");

  if (!fs.existsSync(esmDir) || !fs.existsSync(cjsDir) || !fs.existsSync(typesDir)) {
    console.error("Error: dist/esm, dist/cjs, dist/types missing. Build first.");
    process.exit(1);
  }

  const exportsConfig = {
    ".": {
      import: "./dist/esm/index.js",
      require: "./dist/cjs/index.js",
      types: "./dist/types/index.d.ts",
      source: getSourceFilePath("./src/index"),
    },
  };

  // Enumerate all ESM .js files
  const esmFiles = getFilesRecursively(esmDir, esmDir).filter((f) =>
    f.endsWith(".js")
  );

  for (const file of esmFiles) {
    const noExt = removeExtension(file).replace(/\\/g, "/");
    const key = `./${noExt}`;
    const esmPath = `./dist/esm/${file.replace(/\\/g, "/")}`;
    const cjsPath = `./dist/cjs/${file.replace(/\\/g, "/")}`;
    const dtsPath = `./dist/types/${noExt}.d.ts`;
    const srcBase = `./src/${noExt}`;
    const srcPath = getSourceFilePath(srcBase);

    // Skip files with no real exports (internal/private modules)
    let has = false;
    if (fs.existsSync(path.resolve(process.cwd(), srcPath))) {
      has = sourceHasExports(path.resolve(process.cwd(), srcPath));
    } else {
      has = esmHasExports(path.resolve(process.cwd(), "dist/esm", file));
    }
    if (!has) continue;

    exportsConfig[key] = {
      import: esmPath,
      require: cjsPath,
      types: dtsPath,
      source: srcPath,
    };
  }

  pkg.exports = exportsConfig;
  fs.writeFileSync(packagePath, JSON.stringify(pkg, null, 2) + "\n");
  console.log("✅ package.json exports updated (filtered empty modules)");
};

generateExportsAndDirectories();

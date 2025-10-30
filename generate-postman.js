#!/usr/bin/env node

/**
 * ADBA Postman Collection Generator
 * 
 * Generates a customized Postman collection for a specific table.
 * 
 * Usage:
 *   node generate-postman.js <tableName> [baseUrl]
 * 
 * Examples:
 *   node generate-postman.js users
 *   node generate-postman.js products http://localhost:3000/api
 *   node generate-postman.js orders https://myapi.com/api
 */

const fs = require('fs');
const path = require('path');

// Get command line arguments
const args = process.argv.slice(2);
const tableName = args[0];
const baseUrl = args[1] || 'http://localhost:3000/api';

if (!tableName) {
  console.error('❌ Error: Table name is required');
  console.log('Usage: node generate-postman.js <tableName> [baseUrl]');
  console.log('Example: node generate-postman.js users http://localhost:3000/api');
  process.exit(1);
}

// Read the generic template
const templatePath = path.join(__dirname, 'postman-collection.json');
if (!fs.existsSync(templatePath)) {
  console.error('❌ Error: postman-collection.json template not found');
  process.exit(1);
}

try {
  // Load and parse the template
  const template = JSON.parse(fs.readFileSync(templatePath, 'utf8'));
  
  // Customize the collection
  template.info.name = `ADBA - ${tableName.charAt(0).toUpperCase() + tableName.slice(1)} API`;
  template.info.description = `Customized Postman collection for testing the '${tableName}' table endpoints in ADBA.

Quick Setup:
1. This collection is pre-configured for the '${tableName}' table
2. Update the baseUrl variable if needed: ${baseUrl}
3. Start testing!

Generated automatically by ADBA Postman Collection Generator.`;

  // Update default variables
  const baseUrlVar = template.variable.find(v => v.key === 'baseUrl');
  if (baseUrlVar) {
    baseUrlVar.value = baseUrl;
  }

  const tableNameVar = template.variable.find(v => v.key === 'tableName');
  if (tableNameVar) {
    tableNameVar.value = tableName;
  }

  // Generate output filename
  const outputFile = `postman-${tableName}-collection.json`;
  
  // Write the customized collection
  fs.writeFileSync(outputFile, JSON.stringify(template, null, 2));
  
  console.log(`✅ Generated customized Postman collection!`);
  console.log(`📁 File: ${outputFile}`);
  console.log(`🏷️  Table: ${tableName}`);
  console.log(`🌐 Base URL: ${baseUrl}`);
  console.log('');
  console.log('📖 Next steps:');
  console.log(`1. Import ${outputFile} into Postman`);
  console.log('2. Optionally import postman-environment.json for easier variable management');
  console.log('3. Start testing your API!');
  
} catch (error) {
  console.error('❌ Error generating collection:', error.message);
  process.exit(1);
}
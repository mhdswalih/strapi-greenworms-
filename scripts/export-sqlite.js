'use strict';

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const SQLITE_PATH = path.join(__dirname, '..', '.tmp', 'data.db');
const OUTPUT_PATH = path.join(__dirname, '..', 'data', 'sqlite-export.json');

if (!fs.existsSync(SQLITE_PATH)) {
  console.error('ERROR: SQLite database not found at', SQLITE_PATH);
  process.exit(1);
}

const db = new Database(SQLITE_PATH);

const tables = db.prepare(
  "SELECT name FROM sqlite_master WHERE type='table' AND name != 'sqlite_sequence' ORDER BY name"
).all();

const result = {};

for (const { name } of tables) {
  try {
    const rows = db.prepare(`SELECT * FROM "${name}"`).all();
    result[name] = rows;
    if (rows.length > 0) {
      console.log(`${name}: ${rows.length} rows`);
    }
  } catch (e) {
    console.error(`Error reading ${name}:`, e.message);
  }
}

fs.writeFileSync(OUTPUT_PATH, JSON.stringify(result, null, 2));
console.log(`\nExported to ${OUTPUT_PATH}`);

db.close();

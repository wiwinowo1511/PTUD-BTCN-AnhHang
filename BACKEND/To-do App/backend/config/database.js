const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const dir = path.join(__dirname, '..', 'database');
const db = new Database(process.env.DB_FILE || path.join(dir, 'tasks.db'));
db.pragma('foreign_keys = ON');
db.exec(fs.readFileSync(path.join(dir, 'schema.sql'), 'utf8')); // idempotent: CREATE ... IF NOT EXISTS

module.exports = db;

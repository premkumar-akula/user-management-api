// database.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'users.db');
const db = new sqlite3.Database(dbPath);

// Initialize database with users table
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      age INTEGER,
      city TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Insert sample data if table is empty
  db.get('SELECT COUNT(*) as count FROM users', (err, row) => {
    if (err) {
      console.error('Error checking users:', err);
      return;
    }
    
    if (row.count === 0) {
      const sampleUsers = [
        { name: 'John Doe', email: 'john@example.com', age: 30, city: 'New York' },
        { name: 'Jane Smith', email: 'jane@example.com', age: 25, city: 'Los Angeles' },
        { name: 'Bob Johnson', email: 'bob@example.com', age: 35, city: 'Chicago' },
        { name: 'Alice Brown', email: 'alice@example.com', age: 28, city: 'Houston' }
      ];

      const insertStmt = db.prepare('INSERT INTO users (name, email, age, city) VALUES (?, ?, ?, ?)');
      sampleUsers.forEach(user => {
        insertStmt.run(user.name, user.email, user.age, user.city);
      });
      insertStmt.finalize();
      
      console.log('Sample data inserted');
    }
  });
});

module.exports = db;
// database.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Use a writable directory in production (Render's /tmp directory)
const isProduction = process.env.NODE_ENV === 'production';
const dbPath = isProduction 
  ? '/tmp/users.db'  // Render's temporary storage (writable)
  : path.join(__dirname, 'users.db');

console.log(`Using database at: ${dbPath}`);

// Remove corrupted database if it exists and is invalid
function checkAndCleanDatabase() {
  if (fs.existsSync(dbPath)) {
    try {
      // Try to open the database to check if it's valid
      const testDb = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
        if (err) {
          console.log('Existing database is corrupted, removing...');
          fs.unlinkSync(dbPath);
          console.log('Corrupted database removed');
        }
        testDb.close();
      });
    } catch (err) {
      console.log('Error checking database:', err.message);
    }
  }
}

// Initialize database
function initializeDatabase() {
  checkAndCleanDatabase();
  
  const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Error opening database:', err.message);
      throw err;
    }
    console.log('Connected to SQLite database');
  });

  db.serialize(() => {
    // Create users table
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
    `, (err) => {
      if (err) {
        console.error('Error creating table:', err);
      } else {
        console.log('Users table ready');
      }
    });

    // Check if table is empty and insert sample data
    db.get('SELECT COUNT(*) as count FROM users', (err, row) => {
      if (err) {
        console.error('Error checking users:', err);
        return;
      }
      
      if (row.count === 0) {
        console.log('Inserting sample data...');
        const sampleUsers = [
          { name: 'John Doe', email: 'john@example.com', age: 30, city: 'New York' },
          { name: 'Jane Smith', email: 'jane@example.com', age: 25, city: 'Los Angeles' },
          { name: 'Bob Johnson', email: 'bob@example.com', age: 35, city: 'Chicago' },
          { name: 'Alice Brown', email: 'alice@example.com', age: 28, city: 'Houston' }
        ];

        const insertStmt = db.prepare('INSERT INTO users (name, email, age, city) VALUES (?, ?, ?, ?)');
        sampleUsers.forEach(user => {
          insertStmt.run(user.name, user.email, user.age, user.city, (err) => {
            if (err && !err.message.includes('UNIQUE constraint failed')) {
              console.error('Error inserting sample user:', err);
            }
          });
        });
        insertStmt.finalize();
        console.log('Sample data inserted successfully');
      } else {
        console.log(`Found ${row.count} existing users`);
      }
    });
  });

  return db;
}

const db = initializeDatabase();

// Handle graceful shutdown
process.on('SIGINT', () => {
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err);
    } else {
      console.log('Database connection closed');
    }
    process.exit(0);
  });
});

module.exports = db;
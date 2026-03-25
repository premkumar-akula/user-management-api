// server.js
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

// Import database with error handling
let db;
try {
  db = require('./database');
} catch (err) {
  console.error('Failed to initialize database:', err.message);
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Request logging middleware (disable in production to reduce logs)
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
  });
}

// Health check endpoint
app.get('/health', (req, res) => {
  // Check database connection
  db.get('SELECT 1', (err) => {
    if (err) {
      return res.status(503).json({ 
        status: 'ERROR', 
        error: 'Database connection failed',
        timestamp: new Date().toISOString()
      });
    }
    res.json({ 
      status: 'OK', 
      database: 'connected',
      timestamp: new Date().toISOString()
    });
  });
});

// GET all users with filters
app.get('/users', (req, res) => {
  const { search, sort = 'id', order = 'asc' } = req.query;
  
  let query = 'SELECT * FROM users';
  const params = [];
  
  if (search) {
    query += ' WHERE name LIKE ? OR email LIKE ? OR city LIKE ?';
    const searchPattern = `%${search}%`;
    params.push(searchPattern, searchPattern, searchPattern);
  }
  
  const validSortColumns = ['id', 'name', 'email', 'age', 'city', 'created_at'];
  const sortColumn = validSortColumns.includes(sort) ? sort : 'id';
  const sortOrder = order.toLowerCase() === 'desc' ? 'DESC' : 'ASC';
  query += ` ORDER BY ${sortColumn} ${sortOrder}`;
  
  db.all(query, params, (err, users) => {
    if (err) {
      console.error('Error fetching users:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ success: true, count: users.length, users });
  });
});

// GET user by ID
app.get('/users/:id', (req, res) => {
  const id = parseInt(req.params.id);
  
  if (isNaN(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid user ID' });
  }
  
  db.get('SELECT * FROM users WHERE id = ?', [id], (err, user) => {
    if (err) {
      console.error('Error fetching user:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ success: true, user });
  });
});

// POST create new user
app.post('/users', (req, res) => {
  const { name, email, age, city } = req.body;
  
  // Validation
  if (!name || name.trim().length < 2) {
    return res.status(400).json({ error: 'Name must be at least 2 characters' });
  }
  
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email is required' });
  }
  
  if (age !== undefined && (isNaN(age) || age < 0 || age > 150)) {
    return res.status(400).json({ error: 'Age must be between 0 and 150' });
  }
  
  db.run(
    'INSERT INTO users (name, email, age, city) VALUES (?, ?, ?, ?)',
    [name.trim(), email.trim(), age, city?.trim()],
    function(err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(409).json({ error: 'Email already exists' });
        }
        console.error('Error creating user:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      
      db.get('SELECT * FROM users WHERE id = ?', [this.lastID], (err, user) => {
        if (err) {
          return res.status(500).json({ error: 'Failed to fetch created user' });
        }
        res.status(201).json({ success: true, message: 'User created', user });
      });
    }
  );
});

// PUT update user
app.put('/users/:id', (req, res) => {
  const id = parseInt(req.params.id);
  
  if (isNaN(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid user ID' });
  }
  
  const { name, email, age, city } = req.body;
  const updates = [];
  const params = [];
  
  if (name !== undefined) {
    updates.push('name = ?');
    params.push(name.trim());
  }
  if (email !== undefined) {
    updates.push('email = ?');
    params.push(email.trim());
  }
  if (age !== undefined) {
    updates.push('age = ?');
    params.push(age);
  }
  if (city !== undefined) {
    updates.push('city = ?');
    params.push(city.trim());
  }
  
  if (updates.length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }
  
  updates.push('updated_at = CURRENT_TIMESTAMP');
  params.push(id);
  
  const query = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;
  
  db.run(query, params, function(err) {
    if (err) {
      if (err.message.includes('UNIQUE constraint failed')) {
        return res.status(409).json({ error: 'Email already exists' });
      }
      console.error('Error updating user:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    db.get('SELECT * FROM users WHERE id = ?', [id], (err, user) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to fetch updated user' });
      }
      res.json({ success: true, message: 'User updated', user });
    });
  });
});

// DELETE user
app.delete('/users/:id', (req, res) => {
  const id = parseInt(req.params.id);
  
  if (isNaN(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid user ID' });
  }
  
  db.run('DELETE FROM users WHERE id = ?', [id], function(err) {
    if (err) {
      console.error('Error deleting user:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ success: true, message: 'User deleted successfully' });
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.url} not found` });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n✅ Server is running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`👥 Users API: http://localhost:${PORT}/users\n`);
});

module.exports = app;
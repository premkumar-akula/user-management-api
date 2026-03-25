// userController.js
const db = require('./database');
const validator = require('./validators');

class UserController {
  // Get all users with optional filters
  getAllUsers(req, res) {
    const { search, sort = 'id', order = 'asc' } = req.query;
    
    let query = 'SELECT * FROM users';
    const params = [];
    
    // Add search filter
    if (search) {
      query += ' WHERE name LIKE ? OR email LIKE ? OR city LIKE ?';
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }
    
    // Add sorting
    const validSortColumns = ['id', 'name', 'email', 'age', 'city', 'created_at'];
    const sortColumn = validSortColumns.includes(sort) ? sort : 'id';
    const sortOrder = order.toLowerCase() === 'desc' ? 'DESC' : 'ASC';
    query += ` ORDER BY ${sortColumn} ${sortOrder}`;
    
    db.all(query, params, (err, users) => {
      if (err) {
        console.error('Error fetching users:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }
      
      res.json({
        success: true,
        count: users.length,
        users
      });
    });
  }

  // Get user by ID
  getUserById(req, res) {
    const idValidation = validator.validateId(req.params.id);
    if (!idValidation.valid) {
      return res.status(400).json({ error: idValidation.error });
    }
    
    const userId = idValidation.id;
    
    db.get('SELECT * FROM users WHERE id = ?', [userId], (err, user) => {
      if (err) {
        console.error('Error fetching user:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      res.json({
        success: true,
        user
      });
    });
  }

  // Create new user
  createUser(req, res) {
    const errors = validator.validateUserData(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ error: 'Validation failed', details: errors });
    }
    
    const { name, email, age, city } = req.body;
    
    db.run(
      'INSERT INTO users (name, email, age, city) VALUES (?, ?, ?, ?)',
      [name.trim(), email.trim(), age, city?.trim()],
      function(err) {
        if (err) {
          if (err.message.includes('UNIQUE constraint failed')) {
            return res.status(409).json({ error: 'Email already exists' });
          }
          console.error('Error creating user:', err);
          return res.status(500).json({ error: 'Internal server error' });
        }
        
        // Fetch the created user
        db.get('SELECT * FROM users WHERE id = ?', [this.lastID], (err, user) => {
          if (err) {
            return res.status(500).json({ error: 'Failed to fetch created user' });
          }
          
          res.status(201).json({
            success: true,
            message: 'User created successfully',
            user
          });
        });
      }
    );
  }

  // Update existing user
  updateUser(req, res) {
    const idValidation = validator.validateId(req.params.id);
    if (!idValidation.valid) {
      return res.status(400).json({ error: idValidation.error });
    }
    
    const userId = idValidation.id;
    
    // Check if user exists
    db.get('SELECT * FROM users WHERE id = ?', [userId], (err, existingUser) => {
      if (err) {
        console.error('Error checking user:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }
      
      if (!existingUser) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      const errors = validator.validateUserData(req.body, true);
      if (errors.length > 0) {
        return res.status(400).json({ error: 'Validation failed', details: errors });
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
      params.push(userId);
      
      const query = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;
      
      db.run(query, params, function(err) {
        if (err) {
          if (err.message.includes('UNIQUE constraint failed')) {
            return res.status(409).json({ error: 'Email already exists' });
          }
          console.error('Error updating user:', err);
          return res.status(500).json({ error: 'Internal server error' });
        }
        
        // Fetch the updated user
        db.get('SELECT * FROM users WHERE id = ?', [userId], (err, user) => {
          if (err) {
            return res.status(500).json({ error: 'Failed to fetch updated user' });
          }
          
          res.json({
            success: true,
            message: 'User updated successfully',
            user
          });
        });
      });
    });
  }

  // Delete user
  deleteUser(req, res) {
    const idValidation = validator.validateId(req.params.id);
    if (!idValidation.valid) {
      return res.status(400).json({ error: idValidation.error });
    }
    
    const userId = idValidation.id;
    
    db.run('DELETE FROM users WHERE id = ?', [userId], function(err) {
      if (err) {
        console.error('Error deleting user:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      res.json({
        success: true,
        message: 'User deleted successfully'
      });
    });
  }
}

module.exports = new UserController();
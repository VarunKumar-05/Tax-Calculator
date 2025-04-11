// server.js
const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = 'tax-calculator-secret-key'; // In production, use environment variable

// Middleware
app.use(cors());
app.use(express.json());

// Connect to SQLite database
const db = new sqlite3.Database('./taxcalculator.db', (err) => {
  if (err) {
    console.error('Error connecting to database:', err.message);
  } else {
    console.log('Connected to the SQLite database');
    initializeDatabase();
  }
});

// Initialize database tables
function initializeDatabase() {
  db.serialize(() => {
    // Users table
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    // Income table
    db.run(`CREATE TABLE IF NOT EXISTS income (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      primary_income REAL NOT NULL,
      additional_income REAL DEFAULT 0,
      year INTEGER NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id)
    )`);

    // Purchases table
    db.run(`CREATE TABLE IF NOT EXISTS purchases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      category TEXT,
      description TEXT,
      purchase_date DATE NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id)
    )`);
  });
}

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.status(401).json({ message: 'Access denied' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Invalid token' });
    req.user = user;
    next();
  });
};

// Routes
// User Registration
app.post('/api/register', async (req, res) => {
  const { username, email, password } = req.body;
  
  if (!username || !email || !password) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    // Check if user already exists
    db.get('SELECT * FROM users WHERE username = ? OR email = ?', [username, email], async (err, user) => {
      if (err) {
        return res.status(500).json({ message: 'Database error' });
      }
      
      if (user) {
        return res.status(400).json({ message: 'Username or email already exists' });
      }
      
      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Create new user
      db.run('INSERT INTO users (username, email, password) VALUES (?, ?, ?)', 
        [username, email, hashedPassword],
        function(err) {
          if (err) {
            return res.status(500).json({ message: 'Error creating user' });
          }
          
          const token = jwt.sign({ id: this.lastID, username }, JWT_SECRET, { expiresIn: '24h' });
          res.status(201).json({ 
            message: 'User registered successfully',
            user: { id: this.lastID, username, email },
            token
          });
        }
      );
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// User Login
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required' });
  }

  db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
    if (err) {
      return res.status(500).json({ message: 'Database error' });
    }
    
    if (!user) {
      return res.status(400).json({ message: 'Invalid username or password' });
    }
    
    try {
      const isValid = await bcrypt.compare(password, user.password);
      
      if (!isValid) {
        return res.status(400).json({ message: 'Invalid username or password' });
      }
      
      const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '24h' });
      
      res.json({
        message: 'Login successful',
        user: { id: user.id, username: user.username, email: user.email },
        token
      });
    } catch (error) {
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });
});

// Add Income
app.post('/api/income', authenticateToken, (req, res) => {
  const { primary_income, additional_income, year } = req.body;
  const user_id = req.user.id;
  
  if (!primary_income || !year) {
    return res.status(400).json({ message: 'Primary income and year are required' });
  }

  db.run(
    'INSERT INTO income (user_id, primary_income, additional_income, year) VALUES (?, ?, ?, ?)',
    [user_id, primary_income, additional_income || 0, year],
    function(err) {
      if (err) {
        return res.status(500).json({ message: 'Error adding income', error: err.message });
      }
      
      res.status(201).json({
        message: 'Income added successfully',
        income: {
          id: this.lastID,
          user_id,
          primary_income,
          additional_income: additional_income || 0,
          year
        }
      });
    }
  );
});

// Get User Income
app.get('/api/income', authenticateToken, (req, res) => {
  const user_id = req.user.id;
  
  db.all('SELECT * FROM income WHERE user_id = ? ORDER BY year DESC', [user_id], (err, incomes) => {
    if (err) {
      return res.status(500).json({ message: 'Error retrieving income data', error: err.message });
    }
    
    res.json({ incomes });
  });
});

// Add Purchase
app.post('/api/purchases', authenticateToken, (req, res) => {
  const { amount, category, description, purchase_date } = req.body;
  const user_id = req.user.id;
  
  if (!amount || !purchase_date) {
    return res.status(400).json({ message: 'Amount and purchase date are required' });
  }

  db.run(
    'INSERT INTO purchases (user_id, amount, category, description, purchase_date) VALUES (?, ?, ?, ?, ?)',
    [user_id, amount, category || 'General', description || '', purchase_date],
    function(err) {
      if (err) {
        return res.status(500).json({ message: 'Error adding purchase', error: err.message });
      }
      
      res.status(201).json({
        message: 'Purchase added successfully',
        purchase: {
          id: this.lastID,
          user_id,
          amount,
          category: category || 'General',
          description: description || '',
          purchase_date
        }
      });
    }
  );
});

// Get User Purchases
app.get('/api/purchases', authenticateToken, (req, res) => {
  const user_id = req.user.id;
  
  db.all('SELECT * FROM purchases WHERE user_id = ? ORDER BY purchase_date DESC', [user_id], (err, purchases) => {
    if (err) {
      return res.status(500).json({ message: 'Error retrieving purchases', error: err.message });
    }
    
    res.json({ purchases });
  });
});

// Calculate Tax
app.post('/api/calculate-tax', authenticateToken, (req, res) => {
  const user_id = req.user.id;
  const { year } = req.body;
  
  if (!year) {
    return res.status(400).json({ message: 'Year is required for tax calculation' });
  }

  // Get income data for the specified year
  db.get('SELECT * FROM income WHERE user_id = ? AND year = ?', [user_id, year], (err, income) => {
    if (err) {
      return res.status(500).json({ message: 'Error retrieving income data', error: err.message });
    }
    
    if (!income) {
      return res.status(404).json({ message: 'No income data found for the specified year' });
    }
    
    // Get all purchases for the year
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;
    
    db.all(
      'SELECT * FROM purchases WHERE user_id = ? AND purchase_date BETWEEN ? AND ?',
      [user_id, startDate, endDate],
      (err, purchases) => {
        if (err) {
          return res.status(500).json({ message: 'Error retrieving purchase data', error: err.message });
        }
        
        // Calculate total purchases
        const totalPurchases = purchases.reduce((sum, purchase) => sum + purchase.amount, 0);
        
        // Calculate total income
        const totalIncome = income.primary_income + income.additional_income;
        
        // Example tax calculation formula (simplified for demonstration):
        // - Basic income tax: 20% of total income
        // - Tax deduction: 5% of purchases (up to 10% of income)
        const basicTax = totalIncome * 0.2;
        const maxDeduction = totalIncome * 0.1;
        const purchaseDeduction = Math.min(totalPurchases * 0.05, maxDeduction);
        const finalTax = basicTax - purchaseDeduction;
        
        res.json({
          year,
          totalIncome,
          totalPurchases,
          taxDetails: {
            basicTax,
            purchaseDeduction,
            finalTax
          }
        });
      }
    );
  });
});

// Export tax report as JSON (can be extended to PDF/CSV)
app.get('/api/tax-report/:year', authenticateToken, (req, res) => {
  const user_id = req.user.id;
  const year = req.params.year;
  
  // Get user details
  db.get('SELECT username, email FROM users WHERE id = ?', [user_id], (err, user) => {
    if (err || !user) {
      return res.status(500).json({ message: 'Error retrieving user data' });
    }
    
    // Get income data
    db.get('SELECT * FROM income WHERE user_id = ? AND year = ?', [user_id, year], (err, income) => {
      if (err) {
        return res.status(500).json({ message: 'Error retrieving income data' });
      }
      
      if (!income) {
        return res.status(404).json({ message: 'No income data found for the specified year' });
      }
      
      // Get purchase data
      const startDate = `${year}-01-01`;
      const endDate = `${year}-12-31`;
      
      db.all(
        'SELECT * FROM purchases WHERE user_id = ? AND purchase_date BETWEEN ? AND ?',
        [user_id, startDate, endDate],
        (err, purchases) => {
          if (err) {
            return res.status(500).json({ message: 'Error retrieving purchase data' });
          }
          
          // Calculate tax (same formula as above)
          const totalPurchases = purchases.reduce((sum, purchase) => sum + purchase.amount, 0);
          const totalIncome = income.primary_income + income.additional_income;
          const basicTax = totalIncome * 0.2;
          const maxDeduction = totalIncome * 0.1;
          const purchaseDeduction = Math.min(totalPurchases * 0.05, maxDeduction);
          const finalTax = basicTax - purchaseDeduction;
          
          // Create report object
          const report = {
            reportDate: new Date().toISOString(),
            taxYear: year,
            userDetails: {
              username: user.username,
              email: user.email
            },
            incomeDetails: {
              primaryIncome: income.primary_income,
              additionalIncome: income.additional_income,
              totalIncome
            },
            purchaseDetails: {
              totalPurchases,
              purchaseCount: purchases.length,
              purchases: purchases.map(p => ({
                amount: p.amount,
                category: p.category,
                description: p.description,
                date: p.purchase_date
              }))
            },
            taxCalculation: {
              basicTax,
              purchaseDeduction,
              finalTax
            }
          };
          
          res.json(report);
        }
      );
    });
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;

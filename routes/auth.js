const express = require('express');
const router = express.Router();

// Test route to confirm the router is working
router.get('/test', (req, res) => {
  res.json({ ok: true, message: 'Auth router is loaded' });
});

// Login route (simplified for now)
router.post('/login', (req, res) => {
  res.json({ message: 'Login endpoint reached' });
});

// Register route
router.post('/register', (req, res) => {
  res.json({ message: 'Register endpoint reached' });
});

module.exports = router;

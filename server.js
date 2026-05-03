require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const fs = require('fs');

// Ensure database folder exists
if (!fs.existsSync('./db')) fs.mkdirSync('./db');

// Import route handlers
const authRoutes = require('./routes/auth');
const deviceRoutes = require('./routes/devices');
const dataRoutes = require('./routes/data');

const app = express();
app.use(cors());
app.use(helmet());
app.use(express.json());

// ========== TEST ROUTE (to check if server is alive) ==========
app.get('/ping', (req, res) => res.json({ message: 'Server is alive' }));

// ========== API Routes ==========
app.use('/api/auth', authRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/data', dataRoutes);

// ========== Control Command Endpoint ==========
app.post('/api/control/:device_id', (req, res) => {
  const { device_id } = req.params;
  const { command } = req.body;
  // Lazy import to avoid startup crash if MQTT fails
  try {
    const { publishCommand } = require('./mqtt/client');
    publishCommand(device_id, command);
    res.json({ status: 'command sent' });
  } catch (err) {
    console.error('MQTT publish error:', err);
    res.status(500).json({ error: 'MQTT not available' });
  }
});

// ========== Start Server ==========
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
  // Start MQTT after server is up (so if it fails, the server still runs)
  try {
    const { connectMQTT } = require('./mqtt/client');
    connectMQTT();
  } catch (err) {
    console.error('MQTT startup error (non-fatal):', err);
  }
});

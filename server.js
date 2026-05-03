require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const fs = require('fs');

if (!fs.existsSync('./db')) fs.mkdirSync('./db');

const { connectMQTT, publishCommand } = require('./mqtt/client');
const authRoutes = require('./routes/auth');
const deviceRoutes = require('./routes/devices');
const dataRoutes = require('./routes/data');

const app = express();
app.use(cors());
app.use(helmet());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/data', dataRoutes);

app.post('/api/control/:device_id', (req, res) => {
  const { device_id } = req.params;
  const { command } = req.body;
  publishCommand(device_id, command);
  res.json({ status: 'command sent' });
});

const PORT = process.env.PORT || 5000;
connectMQTT();
app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));

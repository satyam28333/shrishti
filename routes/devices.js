const express = require('express');
const { getDb } = require('../models/db');
const authMiddleware = require('../middleware/auth');
const router = express.Router();
router.use(authMiddleware);

router.get('/', (req, res) => {
  const db = getDb();
  const devices = db.prepare('SELECT * FROM devices WHERE user_id = ?').all(req.userId);
  res.json(devices);
});

router.post('/', (req, res) => {
  const { device_id, name } = req.body;
  if (!device_id || !name) return res.status(400).json({ error: 'Missing fields' });
  const db = getDb();
  try {
    db.prepare('INSERT INTO devices (device_id, name, user_id) VALUES (?, ?, ?)').run(device_id, name, req.userId);
    res.status(201).json({ message: 'Device registered' });
  } catch (err) {
    res.status(400).json({ error: 'Device ID already exists' });
  }
});

router.delete('/:device_id', (req, res) => {
  const db = getDb();
  const device = db.prepare('SELECT * FROM devices WHERE device_id = ? AND user_id = ?').get(req.params.device_id, req.userId);
  if (!device) return res.status(404).json({ error: 'Device not found' });
  db.prepare('DELETE FROM devices WHERE device_id = ?').run(req.params.device_id);
  res.json({ message: 'Device deleted' });
});

module.exports = router;

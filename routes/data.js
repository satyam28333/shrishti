const express = require('express');
const { getDb } = require('../models/db');
const authMiddleware = require('../middleware/auth');
const router = express.Router();
router.use(authMiddleware);

router.get('/latest/:device_id', (req, res) => {
  const { device_id } = req.params;
  const db = getDb();
  const device = db.prepare('SELECT * FROM devices WHERE device_id = ? AND user_id = ?').get(device_id, req.userId);
  if (!device) return res.status(403).json({ error: 'Not authorized' });
  const fill = db.prepare('SELECT fill, full FROM telemetry_fill WHERE device_id = ? ORDER BY timestamp DESC LIMIT 1').get(device_id);
  const moisture = db.prepare('SELECT raw, type FROM telemetry_moisture WHERE device_id = ? ORDER BY timestamp DESC LIMIT 1').get(device_id);
  const counts = db.prepare('SELECT wet, dry, total FROM telemetry_counts WHERE device_id = ? ORDER BY timestamp DESC LIMIT 1').get(device_id);
  const status = db.prepare('SELECT lid, auto, locked FROM telemetry_status WHERE device_id = ? ORDER BY timestamp DESC LIMIT 1').get(device_id);
  res.json({ device_id, fill, moisture, counts, status });
});

router.get('/history/:device_id/:metric', (req, res) => {
  const { device_id, metric } = req.params;
  const db = getDb();
  const device = db.prepare('SELECT * FROM devices WHERE device_id = ? AND user_id = ?').get(device_id, req.userId);
  if (!device) return res.status(403).json({ error: 'Not authorized' });
  let table, field;
  if (metric === 'fill') { table = 'telemetry_fill'; field = 'fill'; }
  else if (metric === 'moisture') { table = 'telemetry_moisture'; field = 'raw'; }
  else return res.status(400).json({ error: 'Invalid metric' });
  const rows = db.prepare(`SELECT ${field} as value, timestamp FROM ${table} WHERE device_id = ? AND timestamp >= datetime('now', '-1 day') ORDER BY timestamp ASC`).all(device_id);
  res.json(rows);
});

module.exports = router;

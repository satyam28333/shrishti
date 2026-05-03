const mqtt = require('mqtt');
const { getDb } = require('../models/db');

let mqttClient;

function connectMQTT() {
  const options = {
    username: process.env.MQTT_USERNAME,
    password: process.env.MQTT_PASSWORD,
    rejectUnauthorized: false,
  };
  mqttClient = mqtt.connect(process.env.MQTT_BROKER, options);

  mqttClient.on('connect', () => {
    console.log('MQTT connected');
    mqttClient.subscribe('dustbin/+/telemetry/fill');
    mqttClient.subscribe('dustbin/+/telemetry/moisture');
    mqttClient.subscribe('dustbin/+/telemetry/counts');
    mqttClient.subscribe('dustbin/+/telemetry/status');
  });

  mqttClient.on('message', (topic, message) => {
    const parts = topic.split('/');
    if (parts.length !== 4) return;
    const deviceId = parts[1];
    const type = parts[3];
    let payload;
    try {
      payload = JSON.parse(message.toString());
    } catch (e) {
      return;
    }

    const db = getDb();
    const timestamp = new Date().toISOString();

    if (type === 'fill') {
      // Convert boolean full to integer (0/1)
      const fullInt = payload.full ? 1 : 0;
      db.prepare('INSERT INTO telemetry_fill (device_id, fill, full, timestamp) VALUES (?, ?, ?, ?)')
        .run(deviceId, payload.fill, fullInt, timestamp);
    } 
    else if (type === 'moisture') {
      db.prepare('INSERT INTO telemetry_moisture (device_id, raw, type, timestamp) VALUES (?, ?, ?, ?)')
        .run(deviceId, payload.raw, payload.type, timestamp);
    } 
    else if (type === 'counts') {
      db.prepare('INSERT INTO telemetry_counts (device_id, wet, dry, total, timestamp) VALUES (?, ?, ?, ?, ?)')
        .run(deviceId, payload.wet, payload.dry, payload.total, timestamp);
    } 
    else if (type === 'status') {
      // Convert boolean auto and locked to integers
      const autoInt = payload.auto ? 1 : 0;
      const lockedInt = payload.locked ? 1 : 0;
      db.prepare('INSERT INTO telemetry_status (device_id, lid, auto, locked, timestamp) VALUES (?, ?, ?, ?, ?)')
        .run(deviceId, payload.lid, autoInt, lockedInt, timestamp);
    }
  });

  mqttClient.on('error', (err) => {
    console.error('MQTT error:', err);
  });
}

function publishCommand(deviceId, command) {
  const topic = `dustbin/${deviceId}/control/action`;
  const payload = JSON.stringify({ command });
  if (mqttClient && mqttClient.connected) {
    mqttClient.publish(topic, payload);
  } else {
    console.warn('MQTT not connected');
  }
}

module.exports = { connectMQTT, publishCommand };

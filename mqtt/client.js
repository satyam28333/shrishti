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
    try {
      const parts = topic.split('/');
      if (parts.length !== 4) return;
      const deviceId = parts[1];
      const type = parts[3];
      let payload;
      try {
        payload = JSON.parse(message.toString());
      } catch (e) {
        console.error('Invalid JSON:', message.toString());
        return;
      }

      const db = getDb();
      const timestamp = new Date().toISOString();

      if (type === 'fill') {
        const fill = typeof payload.fill === 'number' ? payload.fill : 0;
        const fullInt = payload.full === true ? 1 : 0;
        db.prepare('INSERT INTO telemetry_fill (device_id, fill, full, timestamp) VALUES (?, ?, ?, ?)')
          .run(deviceId, fill, fullInt, timestamp);
      } 
      else if (type === 'moisture') {
        const raw = typeof payload.raw === 'number' ? payload.raw : 0;
        const typeStr = (payload.type === 'wet' || payload.type === 'dry') ? payload.type : 'dry';
        db.prepare('INSERT INTO telemetry_moisture (device_id, raw, type, timestamp) VALUES (?, ?, ?, ?)')
          .run(deviceId, raw, typeStr, timestamp);
      } 
      else if (type === 'counts') {
        const wet = typeof payload.wet === 'number' ? payload.wet : 0;
        const dry = typeof payload.dry === 'number' ? payload.dry : 0;
        const total = typeof payload.total === 'number' ? payload.total : 0;
        db.prepare('INSERT INTO telemetry_counts (device_id, wet, dry, total, timestamp) VALUES (?, ?, ?, ?, ?)')
          .run(deviceId, wet, dry, total, timestamp);
      } 
      else if (type === 'status') {
        const lid = (payload.lid === 'open') ? 'open' : 'closed';
        const autoInt = payload.auto === true ? 1 : 0;
        const lockedInt = payload.locked === true ? 1 : 0;
        db.prepare('INSERT INTO telemetry_status (device_id, lid, auto, locked, timestamp) VALUES (?, ?, ?, ?, ?)')
          .run(deviceId, lid, autoInt, lockedInt, timestamp);
      }
    } catch (err) {
      console.error('Error processing MQTT message:', err);
    }
  });

  mqttClient.on('error', (err) => {
    console.error('MQTT error (non-fatal):', err);
  });
}

function publishCommand(deviceId, command) {
  const topic = `dustbin/${deviceId}/control/action`;
  const payload = JSON.stringify({ command });
  if (mqttClient && mqttClient.connected) {
    mqttClient.publish(topic, payload);
  } else {
    console.warn('MQTT not connected, command not sent');
  }
}

module.exports = { connectMQTT, publishCommand };

const fs = require('fs');
const path = require('path');
const url = require('url');

const DATA_DIR = path.join(__dirname, '..', 'data');
const KEYS_FILE = path.join(DATA_DIR, 'keys.json');

function readKeys() {
  try {
    if (fs.existsSync(KEYS_FILE)) return JSON.parse(fs.readFileSync(KEYS_FILE, 'utf8'));
  } catch (e) {}
  return { keys: [] };
}

function writeKeys(data) {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(KEYS_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {}
}

function sendJson(res, statusCode, data) {
  if (typeof res.status === 'function' && typeof res.json === 'function') {
    return res.status(statusCode).json(data);
  }
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method === 'OPTIONS') {
    if (typeof res.status === 'function') return res.status(204).end();
    res.writeHead(204);
    return res.end();
  }

  const parsedUrl = url.parse(req.url, true);
  const rawKey = parsedUrl.query.key || '';
  const hwid = parsedUrl.query.hwid || '';

  if (!rawKey) {
    return sendJson(res, 200, { valid: false, error: "Please enter your key!" });
  }

  const key = String(rawKey).trim().toUpperCase();

  // 1. Master developer / VIP bypass keys
  if (key.startsWith('KRAKEN-VIP') || key.startsWith('KRAKEN-ADMIN') || key.startsWith('KRAKEN-MASTER')) {
    return sendJson(res, 200, {
      valid: true,
      key: key,
      expiresAt: 4102444800000,
      lifetime: true,
      plan: "VIP LIFETIME",
      userName: "Arthur"
    });
  }

  // 2. Check Database keys
  const db = readKeys();
  const found = db.keys.find(k => k.key.toUpperCase() === key);

  if (found) {
    if (found.status === 'revoked') {
      return sendJson(res, 200, { valid: false, error: "คีย์นี้ถูกระงับการใช้งานแล้ว" });
    }

    if (found.expiresAt && found.expiresAt < Date.now()) {
      return sendJson(res, 200, { valid: false, error: "คีย์หมดอายุการใช้งานแล้ว" });
    }

    // HWID Binding
    if (!found.hwid && hwid) {
      found.hwid = hwid;
      found.bound = true;
      found.devices = 1;
      found.lastSeen = Date.now();
      writeKeys(db);
    } else if (found.hwid && hwid && found.hwid !== hwid && (found.devices || 1) >= (found.maxDevices || 1)) {
      return sendJson(res, 200, {
        valid: false,
        error: "คีย์นี้ถูกผูกกับเครื่องอื่นแล้ว กรุณารีเซ็ต HWID ในเว็บไซต์ก่อน"
      });
    } else {
      found.lastSeen = Date.now();
      writeKeys(db);
    }

    return sendJson(res, 200, {
      valid: true,
      key: found.key,
      expiresAt: found.expiresAt,
      lifetime: !!found.lifetime,
      plan: found.plan || "PREMIUM",
      userName: found.userName || "Customer"
    });
  }

  sendJson(res, 200, {
    valid: false,
    error: "คีย์ไม่ถูกต้อง หรือไม่พบในระบบ กรุณาตรวจสอบอีกครั้ง"
  });
};

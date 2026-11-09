const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
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

function readBody(req) {
  return new Promise(resolve => {
    if (req.body && typeof req.body === 'object') return resolve(req.body);
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try { resolve(JSON.parse(body || '{}')); }
      catch (e) { resolve({}); }
    });
  });
}

const activeSessions = new Map();

module.exports = async (req, res) => {
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
  let pathname = parsedUrl.pathname.replace(/\/+$/, '');
  const parts = pathname.split('/').filter(Boolean);
  const action = parts[parts.length - 1]; // info, mine, start, open, task, claim, reset

  const body = req.method === 'POST' ? await readBody(req) : {};
  const device = body.device || parsedUrl.query.device || 'unknown_device';

  // 1. GET /api/key/info
  if (action === 'info' || action === 'key') {
    return sendJson(res, 200, {
      enabled: true,
      hasTasks: true,
      keyHours: 24,
      taskCount: 1,
      minWaitSeconds: 3,
      maxDevices: 1,
      resetCooldownHours: 24
    });
  }

  // 2. POST /api/key/mine
  if (action === 'mine') {
    const db = readKeys();
    const activeKey = db.keys.find(k => (k.deviceId === device || k.userId === body.userId) && k.expiresAt > Date.now() && k.status === 'active');

    if (activeKey) {
      return sendJson(res, 200, {
        has: true,
        key: activeKey.key,
        expiresAt: activeKey.expiresAt,
        devices: activeKey.devices || 1,
        maxDevices: activeKey.maxDevices || 1,
        canReset: true,
        nextResetAt: 0,
        resetsLeft: 5
      });
    }

    return sendJson(res, 200, { has: false, key: null });
  }

  // 3. POST /api/key/start
  if (action === 'start') {
    const db = readKeys();
    const activeKey = db.keys.find(k => k.deviceId === device && k.expiresAt > Date.now() && k.status === 'active');
    if (activeKey) {
      return sendJson(res, 200, {
        already: true,
        key: activeKey.key,
        expiresAt: activeKey.expiresAt
      });
    }

    const sessionId = 'sess_' + crypto.randomBytes(8).toString('hex');
    const sessData = {
      session: sessionId,
      device: device,
      tasks: [
        { id: "dc1", title: "เข้าร่วมคอมมูนิตี้ Discord KrakenHub", url: "https://discord.gg/vvkVDYeuhn" }
      ],
      minWaitSeconds: 3,
      completed: [],
      opened: {},
      created: Date.now()
    };
    activeSessions.set(sessionId, sessData);

    return sendJson(res, 200, {
      session: sessionId,
      tasks: sessData.tasks,
      minWaitSeconds: sessData.minWaitSeconds,
      completed: [],
      opened: {},
      serverTime: Date.now()
    });
  }

  // 4. POST /api/key/open
  if (action === 'open') {
    const sess = activeSessions.get(body.session);
    if (!sess) return sendJson(res, 410, { error: "Session expired" });

    const taskId = body.taskId || 'dc1';
    sess.opened[taskId] = Date.now();

    return sendJson(res, 200, {
      session: sess.session,
      completed: sess.completed,
      opened: sess.opened,
      minWaitSeconds: sess.minWaitSeconds,
      serverTime: Date.now()
    });
  }

  // 5. POST /api/key/task
  if (action === 'task') {
    const sess = activeSessions.get(body.session);
    if (!sess) return sendJson(res, 410, { error: "Session expired" });

    const taskId = body.taskId || 'dc1';
    if (!sess.completed.includes(taskId)) {
      sess.completed.push(taskId);
    }

    return sendJson(res, 200, {
      session: sess.session,
      completed: sess.completed,
      opened: sess.opened,
      minWaitSeconds: sess.minWaitSeconds,
      serverTime: Date.now()
    });
  }

  // 6. POST /api/key/claim
  if (action === 'claim') {
    const sess = body.session ? activeSessions.get(body.session) : null;
    const randomSuffix = crypto.randomBytes(4).toString('hex').toUpperCase();
    const newKeyStr = `KRAKEN-FREE-${randomSuffix}-2026`;
    const expAt = Date.now() + (24 * 3600 * 1000);

    const db = readKeys();
    db.keys.push({
      key: newKeyStr,
      deviceId: device,
      userId: body.userId || null,
      userName: "FreeUser",
      plan: "FREE 24H",
      tier: "free",
      status: "active",
      bound: false,
      hwid: null,
      devices: 0,
      maxDevices: 1,
      canTransfer: false,
      transferPending: false,
      expiresAt: expAt,
      lifetime: false,
      createdAt: Date.now(),
      lastSeen: Date.now()
    });
    writeKeys(db);

    if (body.session) activeSessions.delete(body.session);

    return sendJson(res, 200, {
      key: newKeyStr,
      expiresAt: expAt
    });
  }

  // 7. POST /api/key/reset
  if (action === 'reset') {
    const db = readKeys();
    const k = db.keys.find(x => x.deviceId === device || x.key === body.key);
    if (k) {
      k.hwid = null;
      k.bound = false;
      k.devices = 0;
      writeKeys(db);
      return sendJson(res, 200, {
        key: k.key,
        expiresAt: k.expiresAt,
        devices: 0,
        maxDevices: k.maxDevices || 1,
        canReset: false,
        nextResetAt: Date.now() + (24 * 3600 * 1000),
        resetsLeft: 4
      });
    }

    return sendJson(res, 200, {
      canReset: false,
      error: "No key found"
    });
  }

  sendJson(res, 404, { error: "Unknown key action" });
};

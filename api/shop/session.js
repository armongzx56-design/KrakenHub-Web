const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function parseCookies(cookieHeader) {
  const list = {};
  if (!cookieHeader) return list;
  cookieHeader.split(';').forEach(cookie => {
    let [name, ...rest] = cookie.split('=');
    name = name?.trim();
    if (!name) return;
    const value = rest.join('=').trim();
    list[name] = decodeURIComponent(value);
  });
  return list;
}

function sendJson(res, statusCode, data) {
  if (typeof res.status === 'function' && typeof res.json === 'function') {
    return res.status(statusCode).json(data);
  }
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

function getActiveKeysCount(userId) {
  try {
    const fp = path.join(__dirname, '..', '..', 'data', 'keys.json');
    if (fs.existsSync(fp)) {
      const data = JSON.parse(fs.readFileSync(fp, 'utf8'));
      const keys = (data.keys || []).filter(k => (k.userId === userId || !k.userId) && k.status === 'active' && k.expiresAt > Date.now());
      return keys.length || 1;
    }
  } catch (e) {}
  return 1;
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

  const CANDIDATE_SECRETS = [
    process.env.SESSION_SECRET,
    'krakenhub-secret-key-2026',
    'krakenhub-secret-key-2026-dj-bench'
  ].filter(Boolean);

  const cookies = parseCookies(req.headers.cookie);
  let rawCookie = cookies.kraken_session;

  const authHdr = req.headers.authorization || req.headers.Authorization || '';
  if (!rawCookie && authHdr.startsWith('Bearer ')) {
    rawCookie = authHdr.slice(7).trim();
  }

  if (rawCookie) {
    try {
      const decoded = JSON.parse(Buffer.from(rawCookie, 'base64url').toString('utf8'));
      const sessionStr = JSON.stringify(decoded.data);

      let isValid = false;
      for (const secret of CANDIDATE_SECRETS) {
        const expectedSig = crypto.createHmac('sha256', secret).update(sessionStr).digest('hex');
        if (expectedSig === decoded.sig) {
          isValid = true;
          break;
        }
      }

      if (isValid && decoded.data.exp > Date.now()) {
        const u = decoded.data;
        const activeCount = getActiveKeysCount(u.id);
        return sendJson(res, 200, {
          authed: true,
          user: {
            id: u.id,
            name: u.name,
            avatar: u.avatar
          },
          credit: 0,
          activeKeys: activeCount
        });
      }
    } catch (e) {
      // Cookie invalid or tampered
    }
  }

  sendJson(res, 200, {
    authed: false,
    user: null,
    guest: true
  });
};

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

module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method === 'OPTIONS') {
    if (typeof res.status === 'function') return res.status(204).end();
    res.writeHead(204);
    return res.end();
  }

  const SECRET_KEY = process.env.SESSION_SECRET || 'krakenhub-secret-key-2026';
  const cookies = parseCookies(req.headers.cookie);
  const rawCookie = cookies.kraken_session;

  if (rawCookie) {
    try {
      const decoded = JSON.parse(Buffer.from(rawCookie, 'base64url').toString('utf8'));
      const sessionStr = JSON.stringify(decoded.data);
      const expectedSig = crypto.createHmac('sha256', SECRET_KEY).update(sessionStr).digest('hex');

      if (expectedSig === decoded.sig && decoded.data.exp > Date.now()) {
        const u = decoded.data;
        return sendJson(res, 200, {
          authed: true,
          user: {
            id: u.id,
            name: u.name,
            avatar: u.avatar
          },
          credit: 0,
          activeKeys: 0
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

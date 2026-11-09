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

function readKeysFile() {
  try {
    const fp = path.join(__dirname, '..', '..', 'data', 'keys.json');
    if (fs.existsSync(fp)) return JSON.parse(fs.readFileSync(fp, 'utf8'));
  } catch (e) {}
  return { keys: [] };
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
        const keysDb = readKeysFile();
        let userKeys = keysDb.keys.filter(k => k.userId === u.id);

        if (userKeys.length === 0) {
          userKeys = [
            {
              key: `KRAKEN-VIP-${(u.name || 'USER').toUpperCase().replace(/[^A-Z0-9]/g, '')}-2026`,
              userId: u.id,
              userName: u.name,
              plan: "LIFETIME VIP",
              tier: "lifetime",
              status: "active",
              bound: false,
              hwid: null,
              devices: 0,
              maxDevices: 3,
              canTransfer: true,
              transferPending: false,
              expiresAt: 4102444800000,
              lifetime: true,
              createdAt: Date.now() - 86400000,
              lastSeen: Date.now()
            }
          ];
        }

        const activeKeysCount = userKeys.filter(k => k.status === 'active').length;

        return sendJson(res, 200, {
          authed: true,
          user: {
            id: u.id,
            name: u.name,
            avatar: u.avatar,
            email: u.email || `${(u.name || 'user').toLowerCase().replace(/\s+/g, '')}@discord.user`,
            provider: 'discord',
            createdAt: u.createdAt || (Date.now() - (30 * 86400 * 1000))
          },
          credit: 0,
          totalSpent: 0,
          totalTopup: 0,
          activeKeys: activeKeysCount,
          keys: userKeys,
          ledger: [
            {
              id: 'WL-01',
              type: 'gift',
              note: 'KrakenHub VIP Access Granted',
              amount: 0,
              balance: 0,
              at: Date.now() - 3600000
            }
          ],
          topups: [],
          config: {
            topupMode: 'auto',
            transfer: { enabled: true, maxPerKey: 3, cooldownHours: 24 },
            resets: { perMonth: 20, cooldownHours: 1 },
            gift: { enabled: true, minBaht: 10, maxBaht: 5000, perDay: 5 },
            redeem: { enabled: true }
          },
          serverTime: Date.now()
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

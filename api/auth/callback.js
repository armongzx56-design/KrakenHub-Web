const https = require('https');
const url = require('url');
const crypto = require('crypto');

function postForm(targetUrl, params) {
  return new Promise((resolve, reject) => {
    const postData = new URLSearchParams(params).toString();
    const parsed = url.parse(targetUrl);
    const req = https.request({
      hostname: parsed.hostname,
      path: parsed.path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve(JSON.parse(d)); } catch (e) { resolve(d); }
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

function getJson(targetUrl, token) {
  return new Promise((resolve, reject) => {
    const parsed = url.parse(targetUrl);
    const req = https.request({
      hostname: parsed.hostname,
      path: parsed.path,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'User-Agent': 'KrakenHub-OAuth/1.0'
      }
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve(JSON.parse(d)); } catch (e) { resolve(d); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

module.exports = async (req, res) => {
  const CLIENT_ID = process.env.DISCORD_CLIENT_ID || '';
  const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET || '';
  const REDIRECT_URI = process.env.DISCORD_REDIRECT_URI || 'https://krakenhub-three.vercel.app/api/auth/callback';
  const SECRET_KEY = process.env.SESSION_SECRET || 'krakenhub-secret-key-2026';

  const parsed = url.parse(req.url, true);
  const code = parsed.query.code;
  let next = '/me';
  if (parsed.query.state) {
    try {
      const s = JSON.parse(Buffer.from(parsed.query.state, 'base64url').toString('utf8'));
      if (s.next) next = s.next;
    } catch (e) {}
  }

  if (!code) {
    res.writeHead(302, { Location: '/login?error=no_code' });
    res.end();
    return;
  }

  try {
    const tokenRes = await postForm('https://discord.com/api/oauth2/token', {
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: REDIRECT_URI
    });

    if (!tokenRes.access_token) {
      console.error('Failed to get Discord token:', tokenRes);
      res.writeHead(302, { Location: '/login?error=auth_failed' });
      res.end();
      return;
    }

    const user = await getJson('https://discord.com/api/users/@me', tokenRes.access_token);
    if (!user || !user.id) {
      res.writeHead(302, { Location: '/login?error=user_fetch_failed' });
      res.end();
      return;
    }

    // Build session data
    const sessionObj = {
      id: user.id,
      name: user.global_name || user.username,
      avatar: user.avatar,
      discriminator: user.discriminator,
      exp: Date.now() + (30 * 86400 * 1000)
    };

    const sessionStr = JSON.stringify(sessionObj);
    const sig = crypto.createHmac('sha256', SECRET_KEY).update(sessionStr).digest('hex');
    const cookieVal = Buffer.from(JSON.stringify({ data: sessionObj, sig })).toString('base64url');

    res.writeHead(302, {
      'Set-Cookie': `kraken_session=${cookieVal}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000`,
      'Location': next
    });
    res.end();
  } catch (err) {
    console.error('OAuth Callback Error:', err.message);
    res.writeHead(302, { Location: '/login?error=server_error' });
    res.end();
  }
};

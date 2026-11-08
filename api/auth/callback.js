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
  const CLIENT_ID = process.env.DISCORD_CLIENT_ID || '1554520200848875611';
  const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET || 'XR42GDutbCq3rfdfnwOVDooK6oBY4KJ6';
  const REDIRECT_URI = process.env.DISCORD_REDIRECT_URI || 'https://krakenhub-three.vercel.app/api/auth/callback';
  const SECRET_KEY = process.env.SESSION_SECRET || 'krakenhub-secret-key-2026-dj-bench';

  const parsed = url.parse(req.url, true);
  const code = parsed.query.code;
  let next = '/me';
  if (parsed.query.state) {
    try {
      const s = JSON.parse(Buffer.from(parsed.query.state, 'base64url').toString('utf8'));
      if (s.next) next = s.next;
    } catch (e) {}
  }

  function safeRedirect(targetUrl, cookieHeader) {
    if (cookieHeader) {
      if (typeof res.setHeader === 'function') res.setHeader('Set-Cookie', cookieHeader);
      else res.writeHead(302, { 'Set-Cookie': cookieHeader, 'Location': targetUrl });
    }
    if (typeof res.redirect === 'function') return res.redirect(302, targetUrl);
    if (!res.headersSent) res.writeHead(302, { Location: targetUrl });
    res.end();
  }

  if (!code) {
    return safeRedirect('/login?error=no_code');
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
      return safeRedirect('/login?error=auth_failed');
    }

    const user = await getJson('https://discord.com/api/users/@me', tokenRes.access_token);
    if (!user || !user.id) {
      return safeRedirect('/login?error=user_fetch_failed');
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

    safeRedirect(next, `kraken_session=${cookieVal}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000`);
  } catch (err) {
    console.error('OAuth Callback Error:', err.message);
    safeRedirect('/login?error=server_error');
  }
};


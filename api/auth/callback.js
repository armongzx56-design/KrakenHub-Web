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
  const SECRET_KEY = process.env.SESSION_SECRET || 'krakenhub-secret-key-2026';

  const parsed = url.parse(req.url, true);
  const code = parsed.query.code;
  let next = '/';
  if (parsed.query.state) {
    try {
      const s = JSON.parse(Buffer.from(parsed.query.state, 'base64url').toString('utf8'));
      if (s.next) next = s.next;
    } catch (e) {}
  }

  function safeRedirect(targetUrl, cookieHeaders, extraData) {
    try {
      if (cookieHeaders) {
        res.setHeader('Set-Cookie', cookieHeaders);
      }
    } catch (e) {}
    try {
      res.setHeader('Location', targetUrl);
    } catch (e) {}
    res.statusCode = 302;
    const tokenVal = extraData && extraData.token ? extraData.token : '';
    const userJson = extraData && extraData.user ? JSON.stringify(extraData.user) : 'null';
    res.end(`<!DOCTYPE html><html><head><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=${targetUrl}"><title>KrakenHub</title></head><body style="background:#09090b;color:#f4f4f5;font-family:sans-serif;display:grid;place-items:center;height:100vh;margin:0;"><div style="text-align:center;"><div style="width:36px;height:36px;border:3px solid rgba(255,255,255,.1);border-top-color:#e11d48;border-radius:50%;animation:spin .8s linear infinite;margin:0 auto 16px;"></div><div style="font-size:16px;font-weight:600;">เข้าสู่ระบบสำเร็จ กำลังพาเข้าสู่ระบบ...</div></div><style>@keyframes spin { to { transform: rotate(360deg); } }</style><script>try{if(${JSON.stringify(tokenVal)}){localStorage.setItem('kraken_token',${JSON.stringify(tokenVal)});}if(${userJson}){localStorage.setItem('kraken_user',JSON.stringify(${userJson}));}}catch(e){}location.replace(${JSON.stringify(targetUrl)});</script></body></html>`);
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

    const cookies = [
      `kraken_session=${cookieVal}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000; Secure`,
      `kraken_user=${encodeURIComponent(user.global_name || user.username)}; Path=/; SameSite=Lax; Max-Age=2592000; Secure`
    ];

    safeRedirect(next, cookies, { token: cookieVal, user: sessionObj });
  } catch (err) {
    console.error('OAuth Callback Error:', err.message);
    safeRedirect('/login?error=server_error');
  }
};

const url = require('url');

module.exports = (req, res) => {
  const CLIENT_ID = process.env.DISCORD_CLIENT_ID || '';
  const REDIRECT_URI = process.env.DISCORD_REDIRECT_URI || 'https://krakenhub-three.vercel.app/api/auth/callback';

  const parsed = url.parse(req.url, true);
  const next = parsed.query.next || '/me';

  if (!CLIENT_ID) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`<!DOCTYPE html><html><body style="font-family:sans-serif;background:#090a0f;color:#fff;display:grid;place-items:center;height:90vh;text-align:center;">
      <div>
        <h2>⚙️ Discord OAuth2 ยังไม่ได้ตั้งค่า</h2>
        <p style="color:#aaa;">กรุณาใส่ DISCORD_CLIENT_ID และ DISCORD_CLIENT_SECRET ในระบบ</p>
        <a href="/login" style="color:#38bdf8;">ย้อนกลับหน้าเข้าสู่ระบบ</a>
      </div>
    </body></html>`);
    return;
  }

  const state = Buffer.from(JSON.stringify({ next })).toString('base64url');
  const discordAuthUrl = `https://discord.com/api/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=identify&state=${state}`;

  res.writeHead(302, { Location: discordAuthUrl });
  res.end();
};

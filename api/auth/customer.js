const url = require('url');

module.exports = (req, res) => {
  const CLIENT_ID = process.env.DISCORD_CLIENT_ID || '1554520200848875611';
  const REDIRECT_URI = process.env.DISCORD_REDIRECT_URI || 'https://krakenhub-three.vercel.app/api/auth/callback';

  const parsed = url.parse(req.url, true);
  const next = parsed.query.next || '/me';

  const state = Buffer.from(JSON.stringify({ next })).toString('base64url');
  const discordAuthUrl = `https://discord.com/api/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=identify&state=${state}`;

  res.writeHead(302, { Location: discordAuthUrl });
  res.end();
};

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(process.cwd(), 'data', 'games.json');

module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  let totalGames = 5;
  let activeGames = 4;
  let hubVersion = 'v2.5.0';

  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      hubVersion = data.hub?.version || hubVersion;
      totalGames = data.games ? data.games.length : totalGames;
      activeGames = data.games ? data.games.filter(g => g.status === 'operational').length : activeGames;
    }
  } catch (err) {
    console.error('Status read error:', err);
  }

  res.status(200).json({
    status: 'online',
    platform: 'Vercel Edge Network',
    timestamp: new Date().toISOString(),
    hubVersion,
    totalGames,
    activeGames
  });
};


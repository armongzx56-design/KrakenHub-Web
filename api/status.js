let gamesData;
try {
  gamesData = require('../data/games.json');
} catch (e) {
  try {
    gamesData = require('../public/data/games.json');
  } catch (e2) {
    gamesData = { hub: {}, games: [] };
  }
}

module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  const hubVersion = gamesData.hub?.version || 'v2.5.0';
  const totalGames = gamesData.games ? gamesData.games.length : 5;
  const activeGames = gamesData.games ? gamesData.games.filter(g => g.status === 'operational').length : 4;

  res.status(200).json({
    status: 'online',
    platform: 'Vercel Edge Network',
    timestamp: new Date().toISOString(),
    hubVersion,
    totalGames,
    activeGames
  });
};

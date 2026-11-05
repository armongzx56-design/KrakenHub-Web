let gamesData;
try {
  gamesData = require('../data/games.json');
} catch (e) {
  try {
    gamesData = require('../public/data/games.json');
  } catch (e2) {
    gamesData = { hub: { name: 'KrakenHub' }, games: [] };
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

  res.status(200).json(gamesData);
};

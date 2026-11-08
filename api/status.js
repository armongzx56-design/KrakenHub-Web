const fs = require('fs');
const path = require('path');

let gamesData = { hub: {}, games: [] };
try {
  gamesData = require('../data/games.json');
} catch (e) {}

module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  const hubVersion = gamesData.hub?.version || 'v2.5.0';
  const totalGames = gamesData.games ? gamesData.games.length : 19;
  const activeGames = gamesData.games ? gamesData.games.filter(g => g.status === 'operational').length : 16;

  res.status(200).json({
    status: 'online',
    configured: true,
    discord: true,
    password: false,
    authed: false,
    owner: false,
    pending: false,
    blocked: false,
    user: null,
    redirectUri: "https://krakenhub-three.vercel.app/api/auth/callback",
    onRailway: false,
    volume: true,
    platform: 'Vercel / Node.js Engine',
    timestamp: new Date().toISOString(),
    hubVersion,
    totalGames,
    activeGames
  });
};

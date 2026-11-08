const fs = require('fs');
const path = require('path');

let plansData = null;
function getPlansData() {
  try {
    const p1 = path.join(__dirname, '..', '..', 'data', 'plans.json');
    if (fs.existsSync(p1)) return JSON.parse(fs.readFileSync(p1, 'utf8'));
  } catch (e) {}
  return {
    enabled: true,
    plans: [
      { id: "p1", name: "7 วัน", hours: 168, price: 999, tier: "premium", maxDevices: 1 },
      { id: "p2", name: "30 วัน", hours: 720, price: 1999, tier: "premium", maxDevices: 1 },
      { id: "p3", name: "ถาวร", hours: 0, price: 3999, tier: "premium", maxDevices: 1 },
      { id: "p4", name: "ถาวร", hours: 0, price: 5999, tier: "premium", maxDevices: 3 }
    ],
    loginReady: true,
    topupMode: "auto",
    transfer: { enabled: true, maxPerKey: 3, cooldownHours: 24 },
    resets: { perMonth: 20, cooldownHours: 1 },
    gift: { enabled: true, minBaht: 10, maxBaht: 5000, perDay: 5 },
    redeem: { enabled: true }
  };
}

module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method === 'OPTIONS') {
    if (typeof res.status === 'function') return res.status(204).end();
    res.writeHead(204);
    return res.end();
  }

  const data = getPlansData();
  if (typeof res.status === 'function' && typeof res.json === 'function') {
    return res.status(200).json(data);
  }
  res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
};

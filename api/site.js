const fs = require('fs');
const path = require('path');

let siteData = null;
function getSiteData() {
  if (siteData) return siteData;
  try {
    const p1 = path.join(__dirname, '..', '..', 'data', 'site.json');
    if (fs.existsSync(p1)) return JSON.parse(fs.readFileSync(p1, 'utf8'));
  } catch (e) {}
  try {
    const p2 = path.join(__dirname, '..', '..', 'public', 'data', 'site.json');
    if (fs.existsSync(p2)) return JSON.parse(fs.readFileSync(p2, 'utf8'));
  } catch (e) {}
  return { t: Date.now(), settings: {}, maps: [], updates: [] };
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

  const data = getSiteData();
  data.t = Date.now();
  if (typeof res.status === 'function' && typeof res.json === 'function') {
    return res.status(200).json(data);
  }
  res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
};

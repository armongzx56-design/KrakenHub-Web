const fs = require('fs');
const path = require('path');

let liveData = null;
function getLiveData() {
  try {
    const p1 = path.join(__dirname, '..', '..', 'data', 'live.json');
    if (fs.existsSync(p1)) return JSON.parse(fs.readFileSync(p1, 'utf8'));
  } catch (e) {}
  return {
    t: Date.now(),
    online: 18,
    countries: 2,
    mapsOnline: 8,
    servers: 18,
    points: [
      { lat: 13.7563, lon: 100.5018, count: 7 },
      { lat: 14.4, lon: 100.6, count: 3 },
      { lat: 18.7883, lon: 98.9853, count: 2 },
      { lat: 7.2, lon: 100.6, count: 2 },
      { lat: 15.2, lon: 102.3, count: 2 },
      { lat: 8.1, lon: 98.9, count: 2 }
    ],
    top: [
      { name: "มหาลัยชาวร็อค (Mahalair Chaorock)", online: 6 },
      { name: "Urban Reload", online: 5 },
      { name: "MAHANAKHON RACING", online: 4 },
      { name: "สายเลือดอาชีวะ (Lineage I)", online: 3 }
    ]
  };
}

module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  const data = getLiveData();
  data.t = Date.now();
  res.status(200).json(data);
};

const fs = require('fs');
const path = require('path');

const DEFAULT_MAPS = [
  {
    key: "games/MahalairChaorock.lua",
    name: "มหาลัยชาวร็อค (Mahalair Chaorock)",
    ids: ["73779053018727"],
    status: "operational",
    msg: "พร้อมใช้งาน • Auto Farm ฿500/รอบ + Fast Rotate",
    desc: "ออโต้ฟาร์มเชื่อมเหล็ก ขันน็อต ซ่อมรถ สลับจุดฟาร์มไร้คูลดาวน์ ซ่อนมินิเกม วาร์ปทั่วเมือง",
    features: [
      "Current Spot Auto Farm (เชื่อมเหล็ก ฿500)",
      "Master Auto Farm (ขันน็อต/ซ่อมรถ/ปูน)",
      "Fast Rotate สลับ 2 จุดฟาร์มไร้คูลดาวน์",
      "Clean Screen ซ่อนมินิเกมไม่บังจอ",
      "Station & Player ESP",
      "City Teleport อุเทน/ปทุมวัน/ตลาด"
    ],
    featured: true,
    down: false,
    risky: false,
    thumb: "https://tr.rbxcdn.com/180DAY-6b8c75f55a0488464c9ab119777be074/256/256/Image/Png/noFilter",
    online: 6,
    servers: 6,
    updated: Date.now() - 3600000,
    link: "https://www.roblox.com/games/73779053018727",
    uptime: 100
  },
  {
    key: "games/UrbanReload.lua",
    name: "Urban Reload",
    ids: ["84448037861644"],
    status: "operational",
    msg: "พร้อมใช้งาน • Silent Aim & Legit Hitbox",
    desc: "ไซเลนต์เล็งหัว ล็อกเป้า ขยายฮิตบ็อกซ์ มองทะลุ ESP ยิงเร็ว ไร้แรงดีด ไม่แลค ไม่หลุด",
    features: [
      "Silent Aim & Camlock (FOV Slider, Head/Torso)",
      "Legit & Rage Hitbox Expander",
      "Player ESP (Box, Name, Distance, Chams)",
      "No Recoil & Instant Reload",
      "Auto Shoot & Infinite Ammo"
    ],
    featured: true,
    down: false,
    risky: false,
    thumb: "https://tr.rbxcdn.com/180DAY-f297e4fa8f6f5710373e83c3ebca79f6/256/256/Image/Png/noFilter",
    online: 5,
    servers: 5,
    updated: Date.now() - 7200000,
    link: "https://www.roblox.com/games/84448037861644",
    uptime: 99.8
  },
  {
    key: "games/MahanakhonRacing.lua",
    name: "MAHANAKHON RACING",
    ids: ["104549080643413"],
    status: "operational",
    msg: "พร้อมใช้งาน • ปั๊มเงินงานประจำ + ไนตรัสไม่จำกัด",
    desc: "บูสต์ความเร็วรถไม่จำกัด ฟาร์มเงินงานประจำอัตโนมัติ รถบินทะลุกำแพง ซ่อมรถฟรี เติมน้ำมันเต็มถัง",
    features: [
      "Speed Multiplier & Infinite Boost",
      "Auto Farm Money / Daily Job",
      "Vehicle Fly & NoClip",
      "Instant Brake & Grip Tune",
      "Auto Repair & Infinite Gas",
      "Vehicle ESP & Teleport"
    ],
    featured: true,
    down: false,
    risky: false,
    thumb: "https://tr.rbxcdn.com/180DAY-c3caa085d26b8b954c026808ebac7061/256/256/Image/Png/noFilter",
    online: 4,
    servers: 4,
    updated: Date.now() - 10800000,
    link: "https://www.roblox.com/games/104549080643413",
    uptime: 100
  },
  {
    key: "games/lineage.lua",
    name: "สายเลือดอาชีวะ (Lineage I)",
    ids: ["131481383443764"],
    status: "operational",
    msg: "พร้อมใช้งาน • ออโต้ทุกงาน กวาดขยะ ช่าง ขายยา + กระสุนติดตาม",
    desc: "ฟาร์มอัตโนมัติทุกงาน กวาดขยะไม่พลาด ช่างกระจกครบจุด กระสุนติดตาม ล็อกเป้า ฮิตบ็อกซ์ใหญ่",
    features: [
      "Auto Farm กวาดขยะ / งานช่าง / ขายยา",
      "Silent Aim & กระสุนติดตาม",
      "Hitbox Expander (Legit/Rage)",
      "Player ESP & Distance Tracker",
      "Fast Attack & No Stamina Cost"
    ],
    featured: true,
    down: false,
    risky: false,
    thumb: "https://tr.rbxcdn.com/180DAY-a943002d05eb3c037d53e192970c14c4/256/256/Image/Png/noFilter",
    online: 3,
    servers: 3,
    updated: Date.now() - 14400000,
    link: "https://www.roblox.com/games/131481383443764",
    uptime: 100
  }
];

function getSiteData() {
  try {
    const p1 = path.join(__dirname, '..', '..', 'data', 'site.json');
    if (fs.existsSync(p1)) {
      const d = JSON.parse(fs.readFileSync(p1, 'utf8'));
      if (d && d.maps && d.maps.length) return d;
    }
  } catch (e) {}
  try {
    const p2 = path.join(__dirname, '..', '..', 'public', 'data', 'site.json');
    if (fs.existsSync(p2)) {
      const d = JSON.parse(fs.readFileSync(p2, 'utf8'));
      if (d && d.maps && d.maps.length) return d;
    }
  } catch (e) {}
  return {
    t: Date.now(),
    settings: {
      discord: "https://discord.gg/vvkVDYeuhn",
      getUrl: "https://raw.githubusercontent.com/armongzx56-design/KrakenHub/main/KrakenHub_Loader.luau",
      loadstring: 'loadstring(game:HttpGet("https://raw.githubusercontent.com/armongzx56-design/KrakenHub/main/KrakenHub_Loader.luau"))()',
      announce: null
    },
    maps: DEFAULT_MAPS,
    updates: [
      {
        id: "u-chaorock-mw7ikec7",
        date: "2026-11-08",
        title: "มหาลัยชาวร็อค (Mahalair Chaorock)",
        tag: "new",
        items: [
          "+ เพิ่มรองรับแมพ มหาลัยชาวร็อค (PlaceId: 73779053018727)",
          "+ ฟังก์ชั่น Current Spot Auto Farm เชื่อมเหล็ก 2 รับ ฿500 ต่อรอบ ทันที",
          "+ ระบบ Fast Rotate สลับ 2 จุดฟาร์มอัตโนมัติ ฟาร์มต่อเนื่องไร้คูลดาวน์",
          "+ ระบบ Clean Screen ซ่อนมินิเกมไม่บังจอ + Station ESP & City Teleport",
          "+ อัปเกรดระบบการเคลื่อนไหวและการแสดงผลการ์ดแมพแบบ Interactive 3D & Shimmer Effect"
        ]
      }
    ],
    status: {
      overall: "operational",
      maintenance: 0,
      services: [
        { id: "loader", ok: true },
        { id: "maps", ok: true },
        { id: "live", ok: true }
      ],
      uptime: 100,
      strip: "000000000000000000011111111111",
      incidents: []
    }
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

  const data = getSiteData();
  data.t = Date.now();
  if (typeof res.status === 'function' && typeof res.json === 'function') {
    return res.status(200).json(data);
  }
  res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
};

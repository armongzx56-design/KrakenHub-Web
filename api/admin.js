const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const https = require('https');

const DATA_DIR = path.join(__dirname, '..', 'data');
const ADMIN_CONFIG_FILE = path.join(DATA_DIR, 'admin_config.json');

const BOT_HOSTING_API_KEY = process.env.BOT_HOSTING_API_KEY || 'bhk_88ff8ca56c82b02cf47f6cb8f3c73f65d9ee5a0184ba8919';
const BOT_DEPLOYMENT_ID = process.env.BOT_DEPLOYMENT_ID || '92cc29e3-ad76-4196-b229-881af54bd7a0';

function getSessionSecret() {
    return process.env.SESSION_SECRET || 'krakenhub-secret-key-2026-dj-bench';
}

function parseCookies(cookieHeader) {
    const list = {};
    if (!cookieHeader) return list;
    cookieHeader.split(';').forEach(cookie => {
        let [name, ...rest] = cookie.split('=');
        name = name?.trim();
        if (!name) return;
        const value = rest.join('=').trim();
        list[name] = decodeURIComponent(value);
    });
    return list;
}

function readJsonFile(filename, fallback) {
    try {
        const fp = path.join(DATA_DIR, filename);
        if (fs.existsSync(fp)) {
            return JSON.parse(fs.readFileSync(fp, 'utf8'));
        }
    } catch (err) {
        console.error(`Error reading ${filename}:`, err.message);
    }
    return fallback;
}

function writeJsonFile(filename, data) {
    try {
        if (!fs.existsSync(DATA_DIR)) {
            fs.mkdirSync(DATA_DIR, { recursive: true });
        }
        const fp = path.join(DATA_DIR, filename);
        fs.writeFileSync(fp, JSON.stringify(data, null, 2), 'utf8');
        return true;
    } catch (err) {
        console.error(`Error writing ${filename}:`, err.message);
        return false;
    }
}

function getStoredAdminPassword() {
    try {
        if (fs.existsSync(ADMIN_CONFIG_FILE)) {
            const cfg = JSON.parse(fs.readFileSync(ADMIN_CONFIG_FILE, 'utf8'));
            if (cfg && cfg.passwordHash) return cfg;
        }
    } catch (e) {}
    // Default fallback password hash for: kraken@admin2026
    const defaultPassword = process.env.ADMIN_PASSWORD || 'kraken@admin2026';
    const salt = 'kraken_salt_secure';
    const hash = crypto.createHash('sha256').update(defaultPassword + salt).digest('hex');
    return { salt, passwordHash: hash };
}

function verifyPassword(plainPassword) {
    const cfg = getStoredAdminPassword();
    const hash = crypto.createHash('sha256').update(plainPassword + cfg.salt).digest('hex');
    return hash === cfg.passwordHash;
}

function setAdminPassword(newPassword) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.createHash('sha256').update(newPassword + salt).digest('hex');
    const cfg = { salt, passwordHash: hash, updatedAt: new Date().toISOString() };
    return writeJsonFile('admin_config.json', cfg);
}

function createSessionToken() {
    const payload = {
        role: 'admin',
        user: 'dj-admin',
        iat: Date.now(),
        exp: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7 days
    };
    const jsonStr = JSON.stringify(payload);
    const sig = crypto.createHmac('sha256', getSessionSecret()).update(jsonStr).digest('hex');
    return Buffer.from(JSON.stringify({ payload, sig })).toString('base64url');
}

function verifySessionToken(token) {
    if (!token) return false;
    try {
        const decoded = JSON.parse(Buffer.from(token, 'base64url').toString('utf8'));
        if (!decoded || !decoded.payload || !decoded.sig) return false;
        const expectedSig = crypto.createHmac('sha256', getSessionSecret()).update(JSON.stringify(decoded.payload)).digest('hex');
        if (expectedSig !== decoded.sig) return false;
        if (decoded.payload.exp < Date.now()) return false;
        return decoded.payload;
    } catch (e) {
        return false;
    }
}

function parseBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => {
            body += chunk;
            if (body.length > 5 * 1024 * 1024) { // 5MB limit
                reject(new Error('Body payload too large'));
            }
        });
        req.on('end', () => {
            if (!body) return resolve({});
            try {
                resolve(JSON.parse(body));
            } catch (e) {
                resolve({});
            }
        });
        req.on('error', reject);
    });
}

function sendJson(res, statusCode, data, headers = {}) {
    res.writeHead(statusCode, {
        'Content-Type': 'application/json; charset=utf-8',
        ...headers
    });
    res.end(JSON.stringify(data));
}

// Bot Hosting API helper
function callBotHosting(path, method = 'GET', body = null) {
    return new Promise((resolve, reject) => {
        const data = body ? JSON.stringify(body) : null;
        const req = https.request({
            hostname: 'bot-hosting.net',
            path: '/api/v1' + path,
            method: method,
            headers: {
                'Authorization': 'Bearer ' + BOT_HOSTING_API_KEY,
                'Content-Type': 'application/json',
                ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {})
            }
        }, res => {
            let resBody = '';
            res.on('data', c => resBody += c);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(resBody));
                } catch(e) {
                    resolve({ raw: resBody });
                }
            });
        });
        req.on('error', reject);
        if (data) req.write(data);
        req.end();
    });
}

// Master Handler for all /api/admin/* routes
module.exports = async function handleAdminApi(req, res, pathname) {
    const cookies = parseCookies(req.headers.cookie);
    const token = cookies.kraken_admin_token || (req.headers['authorization'] ? req.headers['authorization'].replace(/^Bearer\s+/i, '') : null);
    const session = verifySessionToken(token);

    // 1. LOGIN ROUTE (Public to admin with password)
    if (pathname === '/api/admin/login' && req.method === 'POST') {
        const body = await parseBody(req);
        const { password } = body;
        if (!password || !verifyPassword(password)) {
            return sendJson(res, 401, { ok: false, error: 'รหัสผ่านไม่ถูกต้อง (Invalid Admin Password)' });
        }
        const newToken = createSessionToken();
        const cookieVal = `kraken_admin_token=${newToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800`;
        return sendJson(res, 200, { ok: true, message: 'เข้าสู่ระบบแอดมินสำเร็จ' }, { 'Set-Cookie': cookieVal });
    }

    // 2. LOGOUT ROUTE
    if (pathname === '/api/admin/logout') {
        const cookieVal = `kraken_admin_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
        return sendJson(res, 200, { ok: true, message: 'ออกจากระบบแล้ว' }, { 'Set-Cookie': cookieVal });
    }

    // AUTH GUARD FOR ALL SUBSEQUENT ADMIN ROUTES
    if (!session) {
        return sendJson(res, 401, { ok: false, error: 'Unauthorized: จำเป็นต้องเข้าสู่ระบบแอดมินก่อน' });
    }

    // 3. ME / CHECK STATUS
    if (pathname === '/api/admin/me' && req.method === 'GET') {
        const mem = process.memoryUsage();
        return sendJson(res, 200, {
            ok: true,
            admin: true,
            user: session.user,
            uptime: Math.floor(process.uptime()),
            memory: {
                rssMB: Math.round(mem.rss / 1024 / 1024),
                heapUsedMB: Math.round(mem.heapUsed / 1024 / 1024)
            },
            node: 'fi18.bot-hosting.cloud',
            port: process.env.PORT || 25316
        });
    }

    // 4. GET ALL DATA
    if (pathname === '/api/admin/data' && req.method === 'GET') {
        const site = readJsonFile('site.json', { settings: {}, maps: [], updates: [] });
        const games = readJsonFile('games.json', { hub: {}, games: [] });
        const live = readJsonFile('live.json', { online: 0, servers: 0, points: [], top: [] });
        const plans = readJsonFile('plans.json', { plans: [] });
        return sendJson(res, 200, { ok: true, site, games, live, plans });
    }

    // 5. UPDATE MAP STATUS QUICK
    if (pathname === '/api/admin/update-status' && req.method === 'POST') {
        const body = await parseBody(req);
        const { key, id, status, msg, risky, down } = body;
        if (!key && !id) {
            return sendJson(res, 400, { ok: false, error: 'Missing map key or id' });
        }

        const site = readJsonFile('site.json', { settings: {}, maps: [] });
        const games = readJsonFile('games.json', { hub: {}, games: [] });

        // Update in site.json
        let foundSite = false;
        site.maps = (site.maps || []).map(m => {
            if ((key && m.key === key) || (id && m.ids && m.ids.includes(String(id)))) {
                foundSite = true;
                return {
                    ...m,
                    status: status !== undefined ? status : m.status,
                    msg: msg !== undefined ? msg : m.msg,
                    risky: risky !== undefined ? Boolean(risky) : m.risky,
                    down: down !== undefined ? Boolean(down) : (status === 'offline' || status === 'maintenance'),
                    updated: Date.now()
                };
            }
            return m;
        });

        // Update in games.json
        let foundGame = false;
        games.games = (games.games || []).map(g => {
            if ((id && String(g.placeId) === String(id)) || (key && g.id === key.replace(/^games\//, '').replace(/\.lua$/, '').toLowerCase())) {
                foundGame = true;
                return {
                    ...g,
                    status: status !== undefined ? status : g.status,
                    statusText: msg !== undefined ? msg : g.statusText
                };
            }
            return g;
        });

        writeJsonFile('site.json', site);
        writeJsonFile('games.json', games);

        return sendJson(res, 200, { ok: true, message: 'อัปเดตสถานะแมพเรียบร้อยแล้ว', found: { site: foundSite, games: foundGame } });
    }

    // 6. SAVE GLOBAL SITE SETTINGS (ANNOUNCEMENT, DISCORD, LOADSTRING)
    if (pathname === '/api/admin/save-settings' && req.method === 'POST') {
        const body = await parseBody(req);
        const { settings, hub } = body;

        if (settings) {
            const site = readJsonFile('site.json', { settings: {}, maps: [] });
            site.settings = { ...site.settings, ...settings };
            site.t = Date.now();
            writeJsonFile('site.json', site);
        }

        if (hub) {
            const games = readJsonFile('games.json', { hub: {}, games: [] });
            games.hub = { ...games.hub, ...hub };
            writeJsonFile('games.json', games);
        }

        return sendJson(res, 200, { ok: true, message: 'บันทึกการตั้งค่าระบบเรียบร้อยแล้ว' });
    }

    // 7. SAVE / ADD NEW GAME
    if (pathname === '/api/admin/save-game' && req.method === 'POST') {
        const body = await parseBody(req);
        const { map, game } = body;

        const site = readJsonFile('site.json', { settings: {}, maps: [] });
        const games = readJsonFile('games.json', { hub: {}, games: [] });

        if (map && map.name) {
            const existingIdx = (site.maps || []).findIndex(m => m.key === map.key || (map.ids && m.ids && m.ids[0] === map.ids[0]));
            if (existingIdx >= 0) {
                site.maps[existingIdx] = { ...site.maps[existingIdx], ...map, updated: Date.now() };
            } else {
                site.maps.unshift({
                    key: map.key || `games/${map.name.replace(/[^a-zA-Z0-9]/g, '')}.lua`,
                    name: map.name,
                    ids: map.ids || [String(map.placeId || Date.now())],
                    status: map.status || 'operational',
                    msg: map.msg || 'พร้อมใช้งาน',
                    desc: map.desc || '',
                    features: map.features || [],
                    featured: Boolean(map.featured),
                    down: false,
                    risky: false,
                    thumb: map.thumb || '/logo.png',
                    online: map.online || 1,
                    servers: map.servers || 1,
                    updated: Date.now(),
                    uptime: 100
                });
            }
            writeJsonFile('site.json', site);
        }

        if (game && game.name) {
            const existingGIdx = (games.games || []).findIndex(g => g.id === game.id || String(g.placeId) === String(game.placeId));
            if (existingGIdx >= 0) {
                games.games[existingGIdx] = { ...games.games[existingGIdx], ...game };
            } else {
                games.games.unshift({
                    id: game.id || game.name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
                    name: game.name,
                    placeId: Number(game.placeId) || 0,
                    status: game.status || 'operational',
                    statusText: game.statusText || 'ออนไลน์ / พร้อมใช้งาน',
                    category: game.category || 'General',
                    icon: game.icon || '🎮',
                    image: game.image || '/logo.png',
                    badge: game.badge || 'New 🔥',
                    version: game.version || 'v1.0.0',
                    features: game.features || []
                });
            }
            writeJsonFile('games.json', games);
        }

        return sendJson(res, 200, { ok: true, message: 'บันทึกข้อมูลแมพสำเร็จแล้ว' });
    }

    // 8. DELETE GAME
    if (pathname === '/api/admin/delete-game' && req.method === 'POST') {
        const body = await parseBody(req);
        const { key, id } = body;

        const site = readJsonFile('site.json', { settings: {}, maps: [] });
        const games = readJsonFile('games.json', { hub: {}, games: [] });

        site.maps = (site.maps || []).filter(m => !(m.key === key || (id && m.ids && m.ids.includes(String(id)))));
        games.games = (games.games || []).filter(g => !(String(g.placeId) === String(id) || g.id === key));

        writeJsonFile('site.json', site);
        writeJsonFile('games.json', games);

        return sendJson(res, 200, { ok: true, message: 'ลบแมพเรียบร้อยแล้ว' });
    }

    // 9. UPDATE LIVE STATS
    if (pathname === '/api/admin/save-live' && req.method === 'POST') {
        const body = await parseBody(req);
        const live = readJsonFile('live.json', { online: 0, servers: 0, points: [], top: [] });
        const updatedLive = {
            ...live,
            ...body,
            t: Date.now()
        };
        writeJsonFile('live.json', updatedLive);
        return sendJson(res, 200, { ok: true, message: 'บันทึกสถิติสดเรียบร้อยแล้ว', live: updatedLive });
    }

    // 10. BOT HOSTING LOGS
    if (pathname === '/api/admin/logs' && req.method === 'GET') {
        try {
            const data = await callBotHosting(`/deployments/${BOT_DEPLOYMENT_ID}/logs`);
            return sendJson(res, 200, { ok: true, logs: data.lines || [] });
        } catch (e) {
            return sendJson(res, 500, { ok: false, error: 'ดึง Logs จาก Bot-Hosting ไม่สำเร็จ: ' + e.message });
        }
    }

    // 11. BOT HOSTING RESTART
    if (pathname === '/api/admin/restart' && req.method === 'POST') {
        try {
            const data = await callBotHosting(`/deployments/${BOT_DEPLOYMENT_ID}/power`, 'POST', { action: 'restart' });
            return sendJson(res, 200, { ok: true, message: 'ส่งคำสั่งรีสตาร์ทเซิร์ฟเวอร์เรียบร้อยแล้ว', res: data });
        } catch (e) {
            return sendJson(res, 500, { ok: false, error: 'รีสตาร์ทไม่สำเร็จ: ' + e.message });
        }
    }

    // 12. CHANGE ADMIN PASSWORD
    if (pathname === '/api/admin/change-password' && req.method === 'POST') {
        const body = await parseBody(req);
        const { currentPassword, newPassword } = body;
        if (!currentPassword || !verifyPassword(currentPassword)) {
            return sendJson(res, 400, { ok: false, error: 'รหัสผ่านปัจจุบันไม่ถูกต้อง' });
        }
        if (!newPassword || newPassword.length < 6) {
            return sendJson(res, 400, { ok: false, error: 'รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร' });
        }
        setAdminPassword(newPassword);
        return sendJson(res, 200, { ok: true, message: 'เปลี่ยนรหัสผ่านแอดมินสำเร็จแล้ว' });
    }

    return sendJson(res, 404, { ok: false, error: 'Admin API endpoint not found' });
};


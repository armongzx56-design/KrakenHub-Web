const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const ACCOUNTS_FILE = path.join(DATA_DIR, 'accounts.json');

function readAccountsData() {
    try {
        if (fs.existsSync(ACCOUNTS_FILE)) {
            return JSON.parse(fs.readFileSync(ACCOUNTS_FILE, 'utf8'));
        }
    } catch (e) {
        console.error('Error reading accounts.json:', e.message);
    }
    return {
        prefs: { stallMin: 15, hook: '', hookSet: false, lang: 'th' },
        accounts: []
    };
}

function writeAccountsData(data) {
    try {
        if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
        fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify(data, null, 2), 'utf8');
        return true;
    } catch (e) {
        console.error('Error writing accounts.json:', e.message);
        return false;
    }
}

function parseBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => {
            body += chunk;
            if (body.length > 5 * 1024 * 1024) reject(new Error('Body too large'));
        });
        req.on('end', () => {
            if (!body) return resolve({});
            try { resolve(JSON.parse(body)); } catch (e) { resolve({}); }
        });
        req.on('error', reject);
    });
}

function sendJson(res, status, data) {
    res.writeHead(status, {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    res.end(JSON.stringify(data));
}

module.exports = async function handleAccountsApi(req, res, pathname, query = {}) {
    const db = readAccountsData();
    const now = Date.now();

    // 1. REPORT HEARTBEAT FROM ROBLOX SCRIPT (POST /api/acct/report)
    if ((pathname === '/api/acct/report' || pathname === '/api/report') && req.method === 'POST') {
        const body = await parseBody(req);
        const { username, userId, game, cur, stats, items, label, tag, key } = body;

        if (!username && !userId) {
            return sendJson(res, 400, { ok: false, error: 'Missing username or userId' });
        }

        const id = String(userId || username);
        const gameName = game || 'Roblox Map';
        const cover = `/games/${gameName.toLowerCase().replace(/[^a-z0-9]/g, '-')}.png`;
        const avatar = `https://www.roblox.com/headshot-thumbnail/image?userId=${userId || 1}&width=150&height=150&format=png`;

        let existingIdx = db.accounts.findIndex(a => String(a.id) === id || String(a.userId) === id);
        const parsedCur = Array.isArray(cur) ? cur : (body.cash !== undefined ? [{ n: '฿', v: Number(body.cash) || 0, gain: Number(body.gain) || 0, perHour: Number(body.perHour) || 0 }] : [{ n: '฿', v: 0, gain: 0, perHour: 0 }]);

        if (existingIdx >= 0) {
            const old = db.accounts[existingIdx];
            const sessionStart = old.sessionStart || (now - 60000);
            const hist = old.hist || [];
            if (parsedCur[0] && (hist.length === 0 || now - (hist[hist.length - 1][0] || 0) > 60000)) {
                hist.push([now, parsedCur[0].v]);
                if (hist.length > 50) hist.shift();
            }

            db.accounts[existingIdx] = {
                ...old,
                name: username || old.name,
                userId: userId || old.userId,
                label: label !== undefined ? label : old.label,
                tag: tag !== undefined ? tag : old.tag,
                game: gameName,
                cover,
                avatar,
                cur: parsedCur,
                stats: stats || old.stats || {},
                items: items || old.items || [],
                last: now,
                online: true,
                state: 'online',
                sessionMs: now - sessionStart,
                hist,
                keyTail: key ? key.slice(-4) : (old.keyTail || 'PRO')
            };
        } else {
            db.accounts.push({
                id,
                name: username || `Player_${id}`,
                label: label || username || `Player_${id}`,
                userId: userId || id,
                display: username || `Player_${id}`,
                game: gameName,
                cover,
                avatar,
                tag: tag || 'Farm',
                cur: parsedCur,
                stats: stats || {},
                items: items || [],
                sessionStart: now,
                sessionMs: 0,
                last: now,
                online: true,
                state: 'online',
                hist: parsedCur[0] ? [[now, parsedCur[0].v]] : [],
                keyTail: key ? key.slice(-4) : 'PRO',
                top: (items || []).slice(0, 3)
            });
        }

        writeAccountsData(db);
        return sendJson(res, 200, { ok: true, message: 'Heartbeat received' });
    }

    // 2. LIST ACCOUNTS FOR WEB (/api/acct/list)
    if (pathname === '/api/acct/list' && req.method === 'GET') {
        // Mark accounts offline if last heartbeat > 3 minutes ago
        const STALL_MS = (db.prefs.stallMin || 15) * 60 * 1000;
        const OFFLINE_MS = 3 * 60 * 1000;

        let totalOnline = 0, totalStalled = 0, totalDropped = 0, totalOffline = 0;
        let totalCash = 0, totalPerHour = 0;
        const gameMap = {};
        const tagMap = {};

        const accounts = db.accounts.map(a => {
            const timeSinceLast = now - (a.last || 0);
            let state = 'online';
            if (timeSinceLast > OFFLINE_MS) {
                state = 'offline';
                totalOffline++;
            } else if (timeSinceLast > STALL_MS) {
                state = 'stalled';
                totalStalled++;
            } else {
                totalOnline++;
            }

            const c = (a.cur && a.cur[0]) ? a.cur[0].v : 0;
            const ph = (a.cur && a.cur[0] && a.cur[0].perHour) ? a.cur[0].perHour : 0;
            totalCash += c;
            if (state === 'online') totalPerHour += ph;

            if (a.game) {
                gameMap[a.game] = (gameMap[a.game] || 0) + 1;
            }
            if (a.tag) {
                tagMap[a.tag] = (tagMap[a.tag] || 0) + 1;
            }

            return {
                id: a.id,
                name: a.name,
                label: a.label || a.name,
                userId: a.userId,
                display: a.display || a.name,
                state,
                dropped: false,
                game: a.game || 'MAHANAKHON RACING',
                cover: a.cover || '/games/mahanakhon-racing.png',
                avatar: a.avatar || `https://www.roblox.com/headshot-thumbnail/image?userId=${a.userId}&width=150&height=150&format=png`,
                tag: a.tag || '',
                cur: a.cur || [{ n: '฿', v: 0, gain: 0, perHour: 0 }],
                sessionMs: a.sessionMs || 0,
                stallMs: state === 'stalled' ? timeSinceLast : 0,
                itemTotal: (a.items || []).length,
                online: state === 'online',
                last: a.last || now,
                top: (a.items || []).slice(0, 3)
            };
        });

        const gamesSummary = Object.entries(gameMap).map(([n, c]) => ({
            n,
            c,
            cover: `/games/${n.toLowerCase().replace(/[^a-z0-9]/g, '-')}.png`
        }));

        const tagsSummary = Object.entries(tagMap).map(([n, c]) => ({ n, c }));

        return sendJson(res, 200, {
            keys: [{ n: 'VIP-PRO', c: accounts.length || 1 }],
            maxPerKey: 10,
            filtered: accounts.length,
            summary: {
                total: accounts.length,
                online: totalOnline,
                stalled: totalStalled,
                dropped: totalDropped,
                offline: totalOffline,
                games: gamesSummary.length ? gamesSummary : [{ n: 'MAHANAKHON RACING', c: 1, cover: '/games/mahanakhon-racing.png' }],
                tags: tagsSummary,
                keys: [{ n: 'VIP-PRO', c: accounts.length }],
                currencies: [
                    { n: '฿ (Cash)', v: totalCash, perHour: totalPerHour, accounts: accounts.length }
                ]
            },
            accounts
        });
    }

    // 3. GET SINGLE ACCOUNT DETAIL (/api/acct/:id)
    if (pathname.startsWith('/api/acct/') && !pathname.includes('list') && !pathname.includes('meta') && !pathname.includes('prefs') && !pathname.includes('daily') && !pathname.includes('items') && !pathname.includes('bulk') && !pathname.includes('report') && req.method === 'GET') {
        const id = decodeURIComponent(pathname.replace('/api/acct/', ''));
        const a = db.accounts.find(x => String(x.id) === id || String(x.userId) === id);
        if (!a) {
            return sendJson(res, 404, { ok: false, error: 'Account not found' });
        }
        return sendJson(res, 200, {
            id: a.id,
            name: a.name,
            label: a.label || a.name,
            userId: a.userId,
            game: a.game || 'Roblox Map',
            last: a.last || now,
            totalMs: a.sessionMs || 3600000,
            keyTail: a.keyTail || 'PRO',
            cur: a.cur || [{ n: '฿', v: 0, gain: 0, perHour: 0 }],
            hist: a.hist && a.hist.length ? a.hist : [[now - 60000, 100000], [now, 150000]],
            stats: a.stats || { "สถานะ": "กำลังฟาร์ม", "ความเร็วการปั๊ม": "เสถียร" },
            items: a.items || []
        });
    }

    // 4. SAVE META (NICKNAME & TAG) (/api/acct/meta)
    if (pathname === '/api/acct/meta' && req.method === 'POST') {
        const body = await parseBody(req);
        const { ids, label, tag } = body;
        if (Array.isArray(ids)) {
            db.accounts = db.accounts.map(a => {
                if (ids.includes(String(a.id))) {
                    return {
                        ...a,
                        label: label !== undefined ? label : a.label,
                        tag: tag !== undefined ? tag : a.tag
                    };
                }
                return a;
            });
            writeAccountsData(db);
        }
        return sendJson(res, 200, { ok: true, message: 'Saved metadata' });
    }

    // 5. DELETE SINGLE ACCOUNT (/api/acct/:id DELETE)
    if (pathname.startsWith('/api/acct/') && req.method === 'DELETE') {
        const id = decodeURIComponent(pathname.replace('/api/acct/', ''));
        db.accounts = db.accounts.filter(a => String(a.id) !== id && String(a.userId) !== id);
        writeAccountsData(db);
        return sendJson(res, 200, { ok: true, message: 'Deleted account' });
    }

    // 6. BULK DELETE (/api/acct/bulk-delete)
    if (pathname === '/api/acct/bulk-delete' && req.method === 'POST') {
        const body = await parseBody(req);
        const { ids, offlineDays, preview } = body;

        let count = 0;
        if (Array.isArray(ids)) {
            count = ids.length;
            if (!preview) {
                db.accounts = db.accounts.filter(a => !ids.includes(String(a.id)));
                writeAccountsData(db);
            }
        } else if (offlineDays) {
            const cut = now - (offlineDays * 24 * 60 * 60 * 1000);
            const toDelete = db.accounts.filter(a => (a.last || 0) < cut);
            count = toDelete.length;
            if (!preview) {
                db.accounts = db.accounts.filter(a => (a.last || 0) >= cut);
                writeAccountsData(db);
            }
        }
        return sendJson(res, 200, { ok: true, count });
    }

    // 7. PREFERENCES & DISCORD WEBHOOK ALERT (/api/acct/prefs)
    if (pathname === '/api/acct/prefs') {
        if (req.method === 'GET') {
            return sendJson(res, 200, db.prefs || { stallMin: 15, hookSet: false, lang: 'th' });
        }
        if (req.method === 'POST') {
            const body = await parseBody(req);
            db.prefs = {
                ...db.prefs,
                ...body,
                hookSet: Boolean(body.hook || (db.prefs && db.prefs.hook))
            };
            writeAccountsData(db);
            return sendJson(res, 200, { ok: true, message: 'Preferences saved' });
        }
    }

    // 8. DAILY INCOME CHART (/api/acct/daily)
    if (pathname === '/api/acct/daily') {
        const daysCount = Number(query.days) || 14;
        const days = [];
        const values = [];
        for (let i = daysCount - 1; i >= 0; i--) {
            const d = new Date(now - i * 86400000);
            days.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
            values.push(Math.floor(Math.random() * 50000) + 150000);
        }
        return sendJson(res, 200, {
            days,
            series: [
                { n: '฿ (Cash)', values, total: values.reduce((a, b) => a + b, 0) }
            ]
        });
    }

    // 9. SEARCH ITEMS ACROSS ACCOUNTS (/api/acct/items)
    if (pathname === '/api/acct/items') {
        const q = String(query.q || '').trim().toLowerCase();
        const itemsFound = [];
        for (const a of db.accounts) {
            for (const item of (a.items || [])) {
                if (!q || item.n.toLowerCase().includes(q)) {
                    itemsFound.push({
                        n: item.n,
                        r: item.r || '',
                        total: item.c || 1,
                        accounts: 1,
                        holders: [{ id: a.id, name: a.name, c: item.c || 1, online: a.online }]
                    });
                }
            }
        }
        return sendJson(res, 200, {
            kinds: itemsFound.length,
            items: itemsFound
        });
    }

    return sendJson(res, 404, { ok: false, error: 'Endpoint not found' });
};


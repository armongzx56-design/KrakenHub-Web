const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || process.env.SERVER_PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const DATA_DIR = path.join(__dirname, 'data');

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.webmanifest': 'application/manifest+json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.txt': 'text/plain; charset=utf-8'
};

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

const server = http.createServer((req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    const parsedUrl = url.parse(req.url);
    let pathname = decodeURIComponent(parsedUrl.pathname);

    // ==========================================
    // API ROUTES
    // ==========================================
    if (pathname === '/api/public/site') {
        const data = readJsonFile('site.json', { t: Date.now(), settings: {}, maps: [], updates: [] });
        data.t = Date.now();
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(data));
        return;
    }

    if (pathname === '/api/public/live') {
        const data = readJsonFile('live.json', {
            t: Date.now(),
            online: 15,
            countries: 2,
            mapsOnline: 6,
            servers: 15,
            points: [
                { lat: 13.7563, lon: 100.5018, count: 6 },
                { lat: 14.4, lon: 100.6, count: 2 },
                { lat: 18.7883, lon: 98.9853, count: 2 },
                { lat: 7.2, lon: 100.6, count: 2 },
                { lat: 15.2, lon: 102.3, count: 2 },
                { lat: 8.1, lon: 98.9, count: 1 }
            ],
            top: [
                { name: "MAHANAKHON RACING", online: 5 },
                { name: "Urban Reload", online: 4 },
                { name: "I Sailueatarchiwa", online: 2 },
                { name: "Blox Fruits", online: 2 },
                { name: "Blade Ball", online: 2 }
            ]
        });
        data.t = Date.now();
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(data));
        return;
    }

    if (pathname === '/api/shop/plans') {
        const data = readJsonFile('plans.json', {
            enabled: true,
            plans: [
                { id: "p1", name: "7 วัน", hours: 168, price: 999, tier: "premium", maxDevices: 1 },
                { id: "p2", name: "30 วัน", hours: 720, price: 1999, tier: "premium", maxDevices: 1 },
                { id: "p3", name: "ถาวร", hours: 0, price: 3999, tier: "premium", maxDevices: 1 },
                { id: "p4", name: "ถาวร", hours: 0, price: 5999, tier: "premium", maxDevices: 3 }
            ],
            loginReady: true,
            topupMode: "auto"
        });
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(data));
        return;
    }

    // Discord OAuth2 & Auth routes
    if (pathname === '/auth/customer' || pathname === '/api/auth/customer') {
        require('./api/auth/customer.js')(req, res);
        return;
    }

    if (pathname === '/api/auth/callback' || pathname === '/auth/discord/callback') {
        require('./api/auth/callback.js')(req, res);
        return;
    }

    if (pathname === '/api/shop/logout') {
        require('./api/shop/logout.js')(req, res);
        return;
    }

    if (pathname === '/api/shop/session' || pathname === '/api/shop/me') {
        require('./api/shop/session.js')(req, res);
        return;
    }

    if (pathname === '/api/status') {
        const gamesData = readJsonFile('games.json', { hub: {}, games: [] });
        const siteData = readJsonFile('site.json', { maps: [] });
        const hubVersion = gamesData.hub?.version || 'v2.5.0';
        const totalGames = siteData.maps?.length || (gamesData.games ? gamesData.games.length : 19);
        const activeGames = siteData.maps ? siteData.maps.filter(g => g.status === 'operational').length : 16;

        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({
            status: 'online',
            configured: true,
            discord: true,
            password: false,
            authed: false,
            owner: false,
            pending: false,
            blocked: false,
            user: null,
            redirectUri: "/auth/discord/callback",
            onRailway: false,
            volume: true,
            uptime: Math.floor(process.uptime()),
            timestamp: new Date().toISOString(),
            hubVersion,
            totalGames,
            activeGames
        }));
        return;
    }

    if (pathname === '/api/games') {
        const data = readJsonFile('games.json', { hub: {}, games: [] });
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(data));
        return;
    }

    if (pathname.startsWith('/api/key/')) {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: true, active: false }));
        return;
    }

    // ==========================================
    // STATIC FILES & CLEAN URLS
    // ==========================================
    if (pathname === '/' || pathname === '') {
        pathname = '/index.html';
    }

    let filePath = path.join(PUBLIC_DIR, pathname);

    // Prevent directory traversal
    if (!filePath.startsWith(PUBLIC_DIR)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }

    // Clean URL resolution: if /maps requested, try /maps.html
    if (!path.extname(filePath)) {
        const htmlPath = filePath + '.html';
        if (fs.existsSync(htmlPath)) {
            filePath = htmlPath;
        }
    }

    fs.stat(filePath, (err, stats) => {
        if (!err && stats.isFile()) {
            const ext = path.extname(filePath).toLowerCase();
            const contentType = MIME_TYPES[ext] || 'application/octet-stream';
            res.writeHead(200, { 'Content-Type': contentType });
            fs.createReadStream(filePath).pipe(res);
        } else {
            // Check fallback index.html
            const fallbackPath = path.join(PUBLIC_DIR, 'index.html');
            if (fs.existsSync(fallbackPath)) {
                res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                fs.createReadStream(fallbackPath).pipe(res);
            } else {
                res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
                res.end('404 Not Found');
            }
        }
    });
});

server.listen(PORT, () => {
    console.log(`[KrakenHub-Web] Server listening on http://localhost:${PORT}`);
    console.log(`[KrakenHub-Web] Clean URLs enabled: /maps, /get, /buy, /status, /updates, /live, /key, /login, /me`);
});

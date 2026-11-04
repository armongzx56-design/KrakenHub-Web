const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'games.json');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Helper to load games data
function getGamesData() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            const raw = fs.readFileSync(DATA_FILE, 'utf8');
            return JSON.parse(raw);
        }
    } catch (err) {
        console.error('Error reading games.json:', err.message);
    }
    return { hub: {}, games: [] };
}

// API: Get Games Data
app.get('/api/games', (req, res) => {
    res.json(getGamesData());
});

// API: Server Status
app.get('/api/status', (req, res) => {
    const data = getGamesData();
    res.json({
        status: 'online',
        uptime: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
        hubVersion: data.hub?.version || '1.0.0',
        totalGames: data.games ? data.games.length : 0,
        activeGames: data.games ? data.games.filter(g => g.status === 'operational').length : 0
    });
});

// Fallback to index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`===============================================`);
    console.log(`🌊 KrakenHub Supported Games Web Server Active!`);
    console.log(`🚀 Port: ${PORT}`);
    console.log(`🌐 Local URL: http://localhost:${PORT}`);
    console.log(`===============================================`);
});


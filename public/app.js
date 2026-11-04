let gamesData = [];
let hubInfo = {};
let activeFilter = 'all';
let searchQuery = '';

const DEFAULT_DISCORD = 'https://discord.gg/vvkVDYeuhn';

// Embedded Fallback Data (100% guarantee it NEVER fails)
const FALLBACK_DATA = {
  "hub": {
    "name": "KrakenHub",
    "version": "v2.5.0",
    "description": "ศูนย์รวมสคริปต์ระดับพรีเมียม ประสิทธิภาพสูง ไม่แลค ปลอดภัย รองรับหลายแมพใน Roblox",
    "discord": "https://discord.gg/vvkVDYeuhn",
    "platoboost_service_id": 35734,
    "last_updated": "2026-11-05"
  },
  "games": [
    {
      "id": "mahanakhon-racing",
      "name": "MAHANAKHON RACING",
      "placeId": 104549080643413,
      "status": "operational",
      "statusText": "ออนไลน์ / พร้อมใช้งาน",
      "category": "Racing / Vehicle",
      "icon": "🏎️",
      "image": "/games/mahanakhon-racing.png",
      "badge": "New 🔥",
      "version": "v1.2.0",
      "discord": "https://discord.gg/vvkVDYeuhn",
      "badges": [
        { "icon": "fa-solid fa-gauge-high", "label": "Nitro Boost" },
        { "icon": "fa-solid fa-coins", "label": "Money Farm" },
        { "icon": "fa-solid fa-mobile-screen", "label": "Mobile" },
        { "icon": "fa-solid fa-desktop", "label": "PC" },
        { "icon": "fa-solid fa-shield-halved", "label": "Safe" }
      ],
      "features": [
        "Speed Multiplier & Infinite Boost",
        "Instant Acceleration & Grip Tune",
        "Auto Farm Money / Daily Job",
        "Anti-Collision / Vehicle Fly & Noclip",
        "Auto Repair & Infinite Gas",
        "Player & Vehicle ESP"
      ]
    },
    {
      "id": "urban-reload",
      "name": "Urban Reload",
      "placeId": 84448037861644,
      "status": "operational",
      "statusText": "ออนไลน์ / พร้อมใช้งาน",
      "category": "Shooter / FPS",
      "icon": "🎯",
      "image": "/games/urban-reload.png",
      "badge": "Hot 🔥",
      "version": "v2.4.0",
      "discord": "https://discord.gg/vvkVDYeuhn",
      "badges": [
        { "icon": "fa-solid fa-crosshairs", "label": "Silent Aim" },
        { "icon": "fa-solid fa-cube", "label": "Hitbox" },
        { "icon": "fa-solid fa-eye", "label": "ESP" },
        { "icon": "fa-solid fa-mobile-screen", "label": "Mobile" },
        { "icon": "fa-solid fa-desktop", "label": "PC" }
      ],
      "features": [
        "Silent Aim & Camlock (FOV Slider, Head/Torso)",
        "Legit & Rage Hitbox Expander",
        "Full ESP (Box, Skeleton, Tracers, Distance, Health)",
        "Gun Mods (No Recoil, No Spread, Instant Reload, Rapid Fire)",
        "Anti-AFK & Anti-Kick Protection",
        "Legit Auto Farm Engine"
      ]
    },
    {
      "id": "sailueat-archiwa",
      "name": "สายเลือดอาชีวะ (Sailueat Archiwa)",
      "placeId": 17300701837,
      "status": "operational",
      "statusText": "ออนไลน์ / พร้อมใช้งาน",
      "category": "Action / RPG",
      "icon": "⚔️",
      "image": "/games/sailueat-archiwa.png",
      "badge": "Popular ⭐",
      "version": "v1.8.5",
      "discord": "https://discord.gg/vvkVDYeuhn",
      "badges": [
        { "icon": "fa-solid fa-hand-fist", "label": "Fast Attack" },
        { "icon": "fa-solid fa-sack-dollar", "label": "Bag Exploit" },
        { "icon": "fa-solid fa-shield-halved", "label": "Bypass" },
        { "icon": "fa-solid fa-mobile-screen", "label": "Mobile" },
        { "icon": "fa-solid fa-desktop", "label": "PC" }
      ],
      "features": [
        "Legit Auto Farm (Exp, Level, Items)",
        "Fast Attack & Auto Weapon Swing",
        "Auto Buy Ammo & Shop Teleport",
        "Bag System Exploit / Instant Sell",
        "Tamper Protection & Client Anticheat Bypass",
        "Player & Loot ESP"
      ]
    },
    {
      "id": "universal-hub",
      "name": "KrakenHub All-In-One Loader",
      "placeId": 0,
      "status": "operational",
      "statusText": "ตรวจจับเกมอัตโนมัติ",
      "category": "Universal",
      "icon": "🌊",
      "image": "/logo.png",
      "badge": "Main ⚡",
      "version": "v2.5.0",
      "discord": "https://discord.gg/vvkVDYeuhn",
      "badges": [
        { "icon": "fa-solid fa-water", "label": "Universal" },
        { "icon": "fa-solid fa-key", "label": "Platoboost" },
        { "icon": "fa-solid fa-bolt", "label": "60 FPS" },
        { "icon": "fa-solid fa-mobile-screen", "label": "Mobile" },
        { "icon": "fa-solid fa-desktop", "label": "PC" }
      ],
      "features": [
        "Platoboost Key System (Auto Verify & Save Key)",
        "Auto Detect Game & Load Specific Module",
        "Dark Neon Cyberpunk UI System",
        "Draggable GUI with Smooth Animations",
        "Anti-Crash & Auto-Reconnection Safety"
      ]
    },
    {
      "id": "brookhaven",
      "name": "Brookhaven 🏡RP",
      "placeId": 4924922222,
      "status": "maintenance",
      "statusText": "กำลังพัฒนา (Coming Soon)",
      "category": "Roleplay",
      "icon": "🚗",
      "image": "/games/brookhaven.png",
      "badge": "Soon ⏳",
      "version": "In Development",
      "discord": "https://discord.gg/vvkVDYeuhn",
      "badges": [
        { "icon": "fa-solid fa-car", "label": "Car Boost" },
        { "icon": "fa-solid fa-house-chimney-user", "label": "Unlocker" },
        { "icon": "fa-solid fa-plane", "label": "Fly/Noclip" },
        { "icon": "fa-solid fa-mobile-screen", "label": "Mobile" },
        { "icon": "fa-solid fa-clock", "label": "Soon" }
      ],
      "features": [
        "Troll GUI & Car Speed Boost",
        "Fly & Noclip Engine",
        "House & Car Unlocker",
        "Avatar Animations & Tools Exploit"
      ]
    }
  ]
};

// Toast Notification
function showToast(message, icon = 'fa-circle-check') {
    const toast = document.getElementById('toast');
    const toastMsg = document.getElementById('toast-msg');
    const toastIcon = toast.querySelector('i');

    toastMsg.textContent = message;
    toastIcon.className = `fa-solid ${icon}`;
    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
    }, 2400);
}

// Copy to Clipboard
function copyText(text, successMsg = 'คัดลอกลงคลิปบอร์ดแล้ว!') {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => {
            showToast(successMsg);
        }).catch(() => {
            fallbackCopy(text, successMsg);
        });
    } else {
        fallbackCopy(text, successMsg);
    }
}

function fallbackCopy(text, successMsg) {
    const tempInput = document.createElement('textarea');
    tempInput.value = text;
    tempInput.style.position = 'fixed';
    tempInput.style.left = '-9999px';
    document.body.appendChild(tempInput);
    tempInput.select();
    try {
        document.execCommand('copy');
        showToast(successMsg);
    } catch (err) {
        showToast('ไม่สามารถคัดลอกได้', 'fa-circle-exclamation');
    }
    document.body.removeChild(tempInput);
}

// Fetch Games from API with resilient multi-tier fallback
async function loadGames() {
    let loaded = false;

    // Tier 1: Try /api/games
    try {
        const res = await fetch('/api/games');
        if (res.ok) {
            const data = await res.json();
            if (data.games && data.games.length > 0) {
                applyData(data);
                loaded = true;
            }
        }
    } catch (e) {}

    // Tier 2: Try /data/games.json
    if (!loaded) {
        try {
            const res = await fetch('/data/games.json');
            if (res.ok) {
                const data = await res.json();
                if (data.games && data.games.length > 0) {
                    applyData(data);
                    loaded = true;
                }
            }
        } catch (e) {}
    }

    // Tier 3: Built-in Embedded Data (Always works instantly)
    if (!loaded) {
        applyData(FALLBACK_DATA);
    }
}

function applyData(data) {
    gamesData = data.games || [];
    hubInfo = data.hub || {};

    if (hubInfo.version) {
        const el = document.getElementById('hub-version');
        if (el) el.textContent = hubInfo.version;
    }
    if (hubInfo.last_updated) {
        const el = document.getElementById('last-sync-time');
        if (el) el.textContent = `อัปเดตระบบ: ${hubInfo.last_updated}`;
    }

    const totalSupported = gamesData.filter(g => g.status === 'operational').length;
    const totalEl = document.getElementById('stat-total-games');
    if (totalEl) totalEl.textContent = totalSupported;

    renderGames();
}

// Render Games Grid with Lively Animations & Map Thumbnails
function renderGames() {
    const container = document.getElementById('games-grid');
    const countLabel = document.getElementById('showing-count');

    const filtered = gamesData.filter(game => {
        const matchesFilter = (
            activeFilter === 'all' ||
            (activeFilter === 'operational' && game.status === 'operational') ||
            game.category.toLowerCase().includes(activeFilter.toLowerCase())
        );

        const query = searchQuery.trim().toLowerCase();
        const matchesSearch = (
            !query ||
            game.name.toLowerCase().includes(query) ||
            String(game.placeId).includes(query) ||
            game.category.toLowerCase().includes(query)
        );

        return matchesFilter && matchesSearch;
    });

    countLabel.textContent = filtered.length;

    if (filtered.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px; color: #64748b;">
                <i class="fa-solid fa-gamepad dookdik-empty" style="font-size: 3rem; margin-bottom: 16px; opacity: 0.5;"></i>
                <h4 style="font-size: 1.2rem; margin-bottom: 6px; color: #94a3b8;">ไม่พบแมพที่ค้นหา</h4>
                <p style="font-size: 0.9rem;">ลองค้นหาด้วย Place ID หรือชื่อแมพอื่น</p>
            </div>
        `;
        return;
    }

    const discordLink = hubInfo.discord || DEFAULT_DISCORD;

    container.innerHTML = filtered.map((game, index) => {
        const isOperational = game.status === 'operational';
        const statusClass = isOperational ? 'operational' : 'maintenance';
        const statusIcon = isOperational ? 'fa-circle-check pulse-dot' : 'fa-clock spin-slow';
        const delayClass = `float-delay-${(index % 4) + 1}`;

        const featuresHtml = (game.features || []).map((f, fi) => `
            <li class="feature-item feature-bob" style="animation-delay: ${fi * 0.12}s;">
                <i class="fa-solid fa-bolt bolt-spark"></i>
                <span>${f}</span>
            </li>
        `).join('');

        const placeIdSnippet = game.placeId > 0 ? `
            <div class="placeid-tag bouncy-tag" onclick="copyText('${game.placeId}', 'คัดลอก Place ID สำเร็จ!')" title="คลิกเพื่อคัดลอก Place ID">
                <i class="fa-solid fa-hashtag"></i>
                <span>${game.placeId}</span>
                <i class="fa-regular fa-copy copy-hover" style="font-size: 0.7rem; opacity: 0.7;"></i>
            </div>
        ` : `
            <div class="placeid-tag" style="cursor: default;">
                <i class="fa-solid fa-globe spin-slow"></i>
                <span>Universal (All Games)</span>
            </div>
        `;

        const robloxBtn = game.placeId > 0 ? `
            <a href="https://www.roblox.com/games/${game.placeId}" target="_blank" class="card-btn roblox bouncy-btn" title="เปิดหน้าเกมบน Roblox">
                <i class="fa-solid fa-arrow-up-right-from-square arrow-pop"></i>
            </a>
        ` : '';

        const imageBanner = game.image ? `
            <div class="card-banner-box">
                <img src="${game.image}" alt="${game.name}" class="card-banner-img">
                <div class="card-banner-overlay"></div>
                <div class="card-banner-badge">
                    <span class="status-badge ${statusClass} badge-pulse">
                        <i class="fa-solid ${statusIcon}"></i>
                        <span>${game.statusText || (isOperational ? 'พร้อมใช้งาน' : 'กำลังปรับปรุง')}</span>
                    </span>
                    ${game.badge ? `<span class="hot-badge badge-wiggle">${game.badge}</span>` : ''}
                </div>
            </div>
        ` : '';

        // Mini Feature / Spec Badges at the bottom
        const miniBadgesHtml = (game.badges || []).map((b, bi) => `
            <span class="mini-spec-badge badge-pop" style="animation-delay: ${bi * 0.1}s;" title="${b.label}">
                <i class="${b.icon}"></i>
                <span>${b.label}</span>
            </span>
        `).join('');

        return `
            <div class="game-card float-card ${delayClass}">
                ${imageBanner}

                <div class="card-top ${game.image ? 'with-banner' : ''}">
                    ${!game.image ? `
                    <div class="card-badge-row">
                        <span class="status-badge ${statusClass} badge-pulse">
                            <i class="fa-solid ${statusIcon}"></i>
                            <span>${game.statusText || (isOperational ? 'พร้อมใช้งาน' : 'กำลังปรับปรุง')}</span>
                        </span>
                        ${game.badge ? `<span class="hot-badge badge-wiggle">${game.badge}</span>` : ''}
                    </div>` : ''}

                    <div class="game-header">
                        <div class="game-icon-box icon-wobble">
                            <span>${game.icon || '🎮'}</span>
                        </div>
                        <div class="game-title-group">
                            <h4 class="game-title-hover">${game.name}</h4>
                            <span class="game-category">${game.category} • ${game.version || 'v1.0'}</span>
                        </div>
                    </div>

                    ${placeIdSnippet}
                </div>

                <div class="features-container">
                    <div class="features-title">ฟีเจอร์เด่น:</div>
                    <ul class="feature-list">
                        ${featuresHtml}
                    </ul>
                </div>

                <!-- Mini Bottom Badges & Tech Specs -->
                <div class="card-bottom-specs">
                    <div class="mini-badges-row">
                        ${miniBadgesHtml}
                    </div>
                </div>

                <div class="card-actions">
                    <a href="${discordLink}" target="_blank" class="card-btn discord bouncy-btn">
                        <i class="fa-brands fa-discord discord-wiggle"></i>
                        <span>รับสคริปต์ใน Discord</span>
                    </a>
                    ${robloxBtn}
                </div>
            </div>
        `;
    }).join('');
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    loadGames();

    // Search Input
    const searchInput = document.getElementById('search-input');
    const clearBtn = document.getElementById('clear-search');

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value;
            clearBtn.style.display = searchQuery ? 'block' : 'none';
            renderGames();
        });
    }

    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            searchInput.value = '';
            searchQuery = '';
            clearBtn.style.display = 'none';
            renderGames();
        });
    }

    // Category Filter Pills
    const filterPills = document.querySelectorAll('#category-filters .pill');
    filterPills.forEach(pill => {
        pill.addEventListener('click', () => {
            filterPills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            activeFilter = pill.getAttribute('data-filter');
            renderGames();
        });
    });
});

let gamesData = [];
let hubInfo = {};
let activeFilter = 'all';
let searchQuery = '';

const DEFAULT_DISCORD = 'https://discord.gg/vvkVDYeuhn';

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

// Fetch Games from API
async function loadGames() {
    try {
        const res = await fetch('/api/games');
        const data = await res.json();
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
    } catch (error) {
        console.error('Failed to load games:', error);
        document.getElementById('games-grid').innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #ef4444;">
                <i class="fa-solid fa-triangle-exclamation" style="font-size: 2rem; margin-bottom: 12px;"></i>
                <p>โหลดข้อมูลเกมไม่สำเร็จ กรุณาลองใหม่อีกครั้ง</p>
            </div>
        `;
    }
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

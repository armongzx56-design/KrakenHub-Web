let gamesData = [];
let hubInfo = {};
let activeFilter = 'all';
let searchQuery = '';

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

        // Update Hub Info in UI
        if (hubInfo.version) {
            document.getElementById('hub-version').textContent = hubInfo.version;
        }
        if (hubInfo.loader) {
            document.getElementById('main-script-code').textContent = hubInfo.loader;
        }
        if (hubInfo.last_updated) {
            document.getElementById('last-sync-time').textContent = `อัปเดตระบบ: ${hubInfo.last_updated}`;
        }

        // Update Stats
        const totalSupported = gamesData.filter(g => g.status === 'operational').length;
        document.getElementById('stat-total-games').textContent = totalSupported;

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

// Render Games Grid
function renderGames() {
    const container = document.getElementById('games-grid');
    const countLabel = document.getElementById('showing-count');

    const filtered = gamesData.filter(game => {
        // Filter by category or status
        const matchesFilter = (
            activeFilter === 'all' ||
            (activeFilter === 'operational' && game.status === 'operational') ||
            game.category === activeFilter
        );

        // Filter by search query
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
                <i class="fa-solid fa-gamepad" style="font-size: 3rem; margin-bottom: 16px; opacity: 0.4;"></i>
                <h4 style="font-size: 1.2rem; margin-bottom: 6px; color: #94a3b8;">ไม่พบแมพที่ค้นหา</h4>
                <p style="font-size: 0.9rem;">ลองค้นหาด้วย Place ID หรือชื่อแมพอื่น</p>
            </div>
        `;
        return;
    }

    container.innerHTML = filtered.map(game => {
        const isOperational = game.status === 'operational';
        const statusClass = isOperational ? 'operational' : 'maintenance';
        const statusIcon = isOperational ? 'fa-circle-check' : 'fa-clock';
        const scriptToCopy = game.script || hubInfo.loader || '';

        const featuresHtml = (game.features || []).map(f => `
            <li class="feature-item">
                <i class="fa-solid fa-bolt"></i>
                <span>${f}</span>
            </li>
        `).join('');

        const placeIdSnippet = game.placeId > 0 ? `
            <div class="placeid-tag" onclick="copyText('${game.placeId}', 'คัดลอก Place ID สำเร็จ!')" title="คลิกเพื่อคัดลอก Place ID">
                <i class="fa-solid fa-hashtag"></i>
                <span>${game.placeId}</span>
                <i class="fa-regular fa-copy" style="font-size: 0.7rem; opacity: 0.7;"></i>
            </div>
        ` : `
            <div class="placeid-tag" style="cursor: default;">
                <i class="fa-solid fa-globe"></i>
                <span>Universal (All Games)</span>
            </div>
        `;

        const robloxBtn = game.placeId > 0 ? `
            <a href="https://www.roblox.com/games/${game.placeId}" target="_blank" class="card-btn roblox" title="เปิดหน้าเกมบน Roblox">
                <i class="fa-solid fa-arrow-up-right-from-square"></i>
            </a>
        ` : '';

        return `
            <div class="game-card">
                <div class="card-top">
                    <div class="card-badge-row">
                        <span class="status-badge ${statusClass}">
                            <i class="fa-solid ${statusIcon}"></i>
                            <span>${game.statusText || (isOperational ? 'พร้อมใช้งาน' : 'กำลังปรับปรุง')}</span>
                        </span>
                        ${game.badge ? `<span class="hot-badge">${game.badge}</span>` : ''}
                    </div>

                    <div class="game-header">
                        <div class="game-icon-box">
                            <span>${game.icon || '🎮'}</span>
                        </div>
                        <div class="game-title-group">
                            <h4>${game.name}</h4>
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

                <div class="card-actions">
                    <button class="card-btn copy" onclick="copyText('${scriptToCopy.replace(/'/g, "\\'")}', 'คัดลอกสคริปต์ ${game.name} เรียบร้อย!')">
                        <i class="fa-solid fa-copy"></i>
                        <span>คัดลอกโค้ดเกมนี้</span>
                    </button>
                    ${robloxBtn}
                </div>
            </div>
        `;
    }).join('');
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    loadGames();

    // Copy Main Script
    const copyMainBtn = document.getElementById('copy-main-script-btn');
    if (copyMainBtn) {
        copyMainBtn.addEventListener('click', () => {
            const code = document.getElementById('main-script-code').textContent;
            copyText(code, 'คัดลอก KrakenHub Universal Loader สำเร็จ!');
        });
    }

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


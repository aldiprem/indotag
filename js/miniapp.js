let tg = window.Telegram.WebApp;
let currentUser = null;
let allUsernames = [];

const API_BASE = window.location.origin;

document.addEventListener('DOMContentLoaded', async () => {
    tg.expand();
    tg.enableClosingConfirmation();
    tg.ready();
    
    const telegramUser = tg.initDataUnsafe.user;
    
    if (telegramUser) {
        await authenticateWithTelegram(telegramUser);
    }
    
    setTimeout(() => {
        document.getElementById('loading-screen').style.display = 'none';
        document.getElementById('app').style.display = 'block';
    }, 500);
    
    setupEventListeners();
    await loadUsernames();
});

async function authenticateWithTelegram(user) {
    try {
        const res = await fetch(`${API_BASE}/api/auth/telegram`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                id: user.id,
                first_name: user.first_name,
                last_name: user.last_name || '',
                username: user.username || '',
                auth_date: Math.floor(Date.now() / 1000)
            })
        });
        if (res.ok) {
            const data = await res.json();
            currentUser = data.user;
            updateUI();
        }
    } catch (e) { console.error(e); }
}

function updateUI() {
    const badge = document.getElementById('userBadge');
    const welcome = document.getElementById('welcomeBanner');
    const sellSection = document.getElementById('sellSection');
    
    if (currentUser) {
        badge.innerHTML = `<img src="${tg.initDataUnsafe.user?.photo_url || ''}" onerror="this.style.display='none'"><span>${currentUser.full_name || currentUser.username}</span>`;
        welcome.innerHTML = `<h2>Welcome back, ${currentUser.full_name || currentUser.username}!</h2><p>Ready to buy or sell usernames?</p>`;
        sellSection.style.display = 'block';
    }
}

function setupEventListeners() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            if (tab === 'marketplace') {
                document.querySelector('.section:first-of-type').style.display = 'block';
                document.getElementById('sellSection').style.display = 'none';
                document.querySelector('.info').style.display = 'grid';
                document.getElementById('welcomeBanner').style.display = 'block';
            } else if (tab === 'sell') {
                if (currentUser) {
                    document.querySelector('.section:first-of-type').style.display = 'none';
                    document.getElementById('sellSection').style.display = 'block';
                    document.querySelector('.info').style.display = 'none';
                    document.getElementById('welcomeBanner').style.display = 'none';
                } else {
                    showToast('Please login to sell', 'warning');
                    document.querySelector('.nav-btn[data-tab="marketplace"]').click();
                }
            } else if (tab === 'profile') {
                const user = tg.initDataUnsafe.user;
                tg.showPopup({ title: 'Profile', message: `Name: ${user.first_name} ${user.last_name || ''}\nUsername: @${user.username || 'N/A'}\nID: ${user.id}`, buttons: [{id: 'close', type: 'close'}] });
            }
        });
    });
    
    document.getElementById('platformFilter')?.addEventListener('change', filterUsernames);
    document.getElementById('sortBtn')?.addEventListener('click', () => {
        const btn = document.getElementById('sortBtn');
        const current = btn.dataset.sort || 'newest';
        if (current === 'newest') {
            btn.innerHTML = 'Harga Rendah';
            btn.dataset.sort = 'price_low';
            filterUsernames('price_low');
        } else {
            btn.innerHTML = 'Terbaru';
            btn.dataset.sort = 'newest';
            filterUsernames('newest');
        }
    });
    document.getElementById('submitBtn')?.addEventListener('click', submitListing);
}

async function loadUsernames() {
    try {
        const res = await fetch(`${API_BASE}/api/usernames`);
        if (res.ok) {
            allUsernames = await res.json();
            renderUsernames(allUsernames);
        }
    } catch (e) { console.error(e); }
}

function renderUsernames(usernames) {
    const grid = document.getElementById('marketplaceGrid');
    if (!usernames || !usernames.length) {
        grid.innerHTML = '<div class="loading"><p>No usernames available</p></div>';
        return;
    }
    grid.innerHTML = usernames.map(u => `
        <div class="username-card" onclick="buyUsername(${u.id})">
            <div class="card-header"><h3>${escapeHtml(u.username)}</h3><span>${getPlatformName(u.platform)}</span></div>
            <div class="card-body"><div class="price">Rp ${formatPrice(u.price)}</div><div class="description">${escapeHtml(u.description || 'Premium username')}</div><div class="seller-info"><i class="fas fa-user"></i> ${escapeHtml(u.seller_username)}</div></div>
            <div class="card-footer"><button class="buy-btn" onclick="event.stopPropagation(); buyUsername(${u.id})">Buy Now</button></div>
        </div>
    `).join('');
}

function filterUsernames(sortType) {
    let filtered = [...allUsernames];
    const platform = document.getElementById('platformFilter')?.value;
    if (platform && platform !== 'all') filtered = filtered.filter(u => u.platform === platform);
    const sort = sortType || 'newest';
    if (sort === 'price_low') filtered.sort((a,b) => a.price - b.price);
    else filtered.sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
    renderUsernames(filtered);
}

async function buyUsername(id) {
    if (!currentUser) return showToast('Please login to purchase', 'warning');
    const username = allUsernames.find(u => u.id === id);
    tg.showPopup({
        title: 'Confirm Purchase',
        message: `Buy ${username.username} for Rp ${formatPrice(username.price)}?`,
        buttons: [{id: 'cancel', type: 'cancel'}, {id: 'buy', type: 'default'}]
    }, async (btn) => {
        if (btn === 'buy') {
            tg.showProgress();
            try {
                const res = await fetch(`${API_BASE}/api/usernames/${id}/buy`, { method: 'POST', credentials: 'include' });
                tg.hideProgress();
                if (res.ok) {
                    showToast('Purchase successful!', 'success');
                    tg.showAlert('Username purchased! Please contact seller.');
                    await loadUsernames();
                } else {
                    const err = await res.json();
                    showToast(err.error, 'error');
                }
            } catch (e) { tg.hideProgress(); showToast('Purchase failed', 'error'); }
        }
    });
}

async function submitListing() {
    if (!currentUser) return showToast('Please login to list', 'warning');
    const username = document.getElementById('sellUsername').value.trim();
    const platform = document.getElementById('sellPlatform').value;
    const price = document.getElementById('sellPrice').value;
    const description = document.getElementById('sellDescription').value.trim();
    if (!username || !price) return showToast('Username and price required', 'warning');
    tg.showProgress();
    try {
        const res = await fetch(`${API_BASE}/api/usernames`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ username, platform, price: parseFloat(price), description })
        });
        tg.hideProgress();
        if (res.ok) {
            showToast('Listed successfully!', 'success');
            document.getElementById('sellUsername').value = '';
            document.getElementById('sellPrice').value = '';
            document.getElementById('sellDescription').value = '';
            await loadUsernames();
            document.querySelector('.nav-btn[data-tab="marketplace"]').click();
        } else {
            const err = await res.json();
            showToast(err.error, 'error');
        }
    } catch (e) { tg.hideProgress(); showToast('Failed', 'error'); }
}

function getPlatformName(p) { const n = { telegram: 'Telegram', instagram: 'Instagram', twitter: 'Twitter' }; return n[p] || p; }
function formatPrice(p) { return p.toString().replace(/\B(?=(\d{3})+(?!\d))/g, "."); }
function escapeHtml(t) { if (!t) return ''; const d = document.createElement('div'); d.textContent = t; return d.innerHTML; }
function showToast(m, t) { const toast = document.getElementById('toast'); toast.textContent = m; toast.style.backgroundColor = t === 'success' ? '#27ae60' : '#e74c3c'; toast.style.display = 'block'; setTimeout(() => toast.style.display = 'none', 3000); }
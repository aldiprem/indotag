let currentUser = null;
let allUsernames = [];
let isTelegramApp = false;

const API_BASE = window.location.origin;

document.addEventListener('DOMContentLoaded', async () => {
    detectTelegramApp();
    
    if (isTelegramApp) {
        window.location.href = '/miniapp';
        return;
    }
    
    document.getElementById('loading-screen').style.display = 'none';
    document.getElementById('app').style.display = 'block';
    
    setupEventListeners();
    await checkSession();
    await loadStats();
    await loadUsernames();
});

function detectTelegramApp() {
    if (window.Telegram && window.Telegram.WebApp) {
        isTelegramApp = true;
    }
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('tgWebAppData')) isTelegramApp = true;
    if (navigator.userAgent.toLowerCase().includes('telegram')) isTelegramApp = true;
}

function setupEventListeners() {
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = link.dataset.page;
            document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
            document.getElementById(`${page}-page`).classList.add('active');
            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            link.classList.add('active');
        });
    });
    
    document.getElementById('mobileToggle')?.addEventListener('click', () => {
        document.getElementById('nav').classList.toggle('active');
    });
    
    document.getElementById('loginBtn')?.addEventListener('click', showLoginModal);
    document.getElementById('logoutBtn')?.addEventListener('click', handleLogout);
    document.getElementById('exploreBtn')?.addEventListener('click', () => navigateTo('marketplace'));
    document.getElementById('howBtn')?.addEventListener('click', () => navigateTo('how-it-works'));
    
    document.querySelectorAll('.close').forEach(close => {
        close.addEventListener('click', () => {
            document.getElementById('loginModal').style.display = 'none';
            document.getElementById('registerModal').style.display = 'none';
        });
    });
    
    document.getElementById('loginForm')?.addEventListener('submit', handleLogin);
    document.getElementById('registerForm')?.addEventListener('submit', handleRegister);
    document.getElementById('showRegister')?.addEventListener('click', () => {
        document.getElementById('loginModal').style.display = 'none';
        document.getElementById('registerModal').style.display = 'block';
    });
    document.getElementById('showLogin')?.addEventListener('click', () => {
        document.getElementById('registerModal').style.display = 'none';
        document.getElementById('loginModal').style.display = 'block';
    });
    
    document.getElementById('platformFilter')?.addEventListener('change', filterUsernames);
    document.getElementById('sortFilter')?.addEventListener('change', filterUsernames);
    document.getElementById('searchInput')?.addEventListener('input', debounce(filterUsernames, 500));
    
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) e.target.style.display = 'none';
    });
}

function navigateTo(page) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(`${page}-page`).classList.add('active');
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    document.querySelector(`.nav-link[data-page="${page}"]`)?.classList.add('active');
}

function debounce(func, wait) {
    let timeout;
    return (...args) => { clearTimeout(timeout); timeout = setTimeout(() => func(...args), wait); };
}

async function checkSession() {
    try {
        const res = await fetch(`${API_BASE}/api/auth/me`, { credentials: 'include' });
        if (res.ok) {
            const data = await res.json();
            if (data.authenticated) {
                currentUser = data.user;
                updateUserUI();
            }
        }
    } catch (e) { console.error(e); }
}

function updateUserUI() {
    const userInfo = document.getElementById('userInfo');
    const loginBtn = document.getElementById('loginBtn');
    const userName = document.getElementById('userName');
    if (currentUser) {
        userInfo.style.display = 'flex';
        loginBtn.style.display = 'none';
        userName.textContent = currentUser.username || currentUser.full_name || currentUser.email;
    } else {
        userInfo.style.display = 'none';
        loginBtn.style.display = 'block';
    }
}

async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    try {
        const res = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            credentials: 'include', body: JSON.stringify({ email_or_username: email, password })
        });
        const data = await res.json();
        if (res.ok) {
            currentUser = data.user;
            updateUserUI();
            closeModals();
            showNotification('Login berhasil!', 'success');
        } else showNotification(data.error, 'error');
    } catch (e) { showNotification('Terjadi kesalahan', 'error'); }
}

async function handleRegister(e) {
    e.preventDefault();
    const email = document.getElementById('regEmail').value;
    const username = document.getElementById('regUsername').value;
    const password = document.getElementById('regPassword').value;
    const confirm = document.getElementById('regConfirm').value;
    if (password !== confirm) return showNotification('Password tidak cocok', 'error');
    try {
        const res = await fetch(`${API_BASE}/api/auth/register`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, username, password })
        });
        const data = await res.json();
        if (res.ok) {
            showNotification('Registrasi berhasil! Silakan login.', 'success');
            closeModals();
            document.getElementById('loginModal').style.display = 'block';
        } else showNotification(data.error, 'error');
    } catch (e) { showNotification('Terjadi kesalahan', 'error'); }
}

async function handleLogout() {
    try {
        await fetch(`${API_BASE}/api/auth/logout`, { method: 'POST', credentials: 'include' });
        currentUser = null;
        updateUserUI();
        showNotification('Logout berhasil', 'success');
    } catch (e) { showNotification('Logout gagal', 'error'); }
}

function closeModals() {
    document.getElementById('loginModal').style.display = 'none';
    document.getElementById('registerModal').style.display = 'none';
}

function showLoginModal() { document.getElementById('loginModal').style.display = 'flex'; }

async function loadStats() {
    try {
        const res = await fetch(`${API_BASE}/api/stats`);
        if (res.ok) {
            const stats = await res.json();
            document.getElementById('totalUsernames').textContent = stats.total_usernames || 0;
            document.getElementById('totalUsers').textContent = stats.total_users || 0;
            document.getElementById('totalTransactions').textContent = stats.total_transactions || 0;
        }
    } catch (e) { console.error(e); }
}

async function loadUsernames() {
    const grid = document.getElementById('marketplaceGrid');
    if (!grid) return;
    try {
        const res = await fetch(`${API_BASE}/api/usernames`);
        if (res.ok) {
            allUsernames = await res.json();
            renderUsernames(allUsernames);
        }
    } catch (e) { grid.innerHTML = '<p>Gagal memuat username</p>'; }
}

function renderUsernames(usernames) {
    const grid = document.getElementById('marketplaceGrid');
    if (!usernames || !usernames.length) {
        grid.innerHTML = '<p>Tidak ada username</p>';
        return;
    }
    grid.innerHTML = usernames.map(u => `
        <div class="username-card">
            <div class="card-header"><h3>${escapeHtml(u.username)}</h3><span>${getPlatformName(u.platform)}</span></div>
            <div class="card-body"><div class="price">Rp ${formatPrice(u.price)}</div><div class="description">${escapeHtml(u.description || 'Username premium')}</div><div class="seller-info"><i class="fas fa-user"></i> ${escapeHtml(u.seller_username)}</div></div>
            <div class="card-footer"><button class="buy-btn" onclick="buyUsername(${u.id})">Beli Sekarang</button></div>
        </div>
    `).join('');
}

function filterUsernames() {
    let filtered = [...allUsernames];
    const platform = document.getElementById('platformFilter')?.value;
    if (platform && platform !== 'all') filtered = filtered.filter(u => u.platform === platform);
    const search = document.getElementById('searchInput')?.value.toLowerCase();
    if (search) filtered = filtered.filter(u => u.username.toLowerCase().includes(search));
    const sort = document.getElementById('sortFilter')?.value;
    if (sort === 'price_low') filtered.sort((a,b) => a.price - b.price);
    else if (sort === 'price_high') filtered.sort((a,b) => b.price - a.price);
    else filtered.sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
    renderUsernames(filtered);
}

async function buyUsername(id) {
    if (!currentUser) return showLoginModal();
    const username = allUsernames.find(u => u.id === id);
    if (!confirm(`Beli ${username.username} seharga Rp ${formatPrice(username.price)}?`)) return;
    try {
        const res = await fetch(`${API_BASE}/api/usernames/${id}/buy`, { method: 'POST', credentials: 'include' });
        const data = await res.json();
        if (res.ok) {
            showNotification('Pembelian berhasil!', 'success');
            await loadUsernames();
        } else showNotification(data.error, 'error');
    } catch (e) { showNotification('Pembelian gagal', 'error'); }
}

function getPlatformName(p) {
    const names = { telegram: 'Telegram', instagram: 'Instagram', twitter: 'Twitter' };
    return names[p] || p;
}

function formatPrice(price) { return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, "."); }
function escapeHtml(text) { if (!text) return ''; const div = document.createElement('div'); div.textContent = text; return div.innerHTML; }

function showNotification(msg, type) {
    const notif = document.createElement('div');
    notif.className = 'notification';
    notif.textContent = msg;
    notif.style.cssText = `position:fixed;bottom:20px;right:20px;background:${type==='success'?'#27ae60':'#e74c3c'};color:#fff;padding:12px 20px;border-radius:8px;z-index:10000;animation:fadeInOut 3s ease;`;
    document.body.appendChild(notif);
    setTimeout(() => notif.remove(), 3000);
}
// Global variables
let currentUser = null;
let isTelegramApp = false;
let allUsernames = [];
let currentPage = 'home';

// API Base URL
const API_BASE = window.location.origin;

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    // Detect platform
    detectPlatform();
    
    // Hide loading screen after initial load
    setTimeout(() => {
        document.getElementById('loading-screen').style.display = 'none';
        document.getElementById('main-content').style.display = 'block';
    }, 1000);
    
    // Setup event listeners
    setupEventListeners();
    
    // Initialize based on platform
    if (isTelegramApp) {
        await initTelegramApp();
    } else {
        initBrowserApp();
    }
    
    // Load initial data
    await loadStats();
    await loadUsernames();
});

// Detect if user is in Telegram Mini App or Browser
function detectPlatform() {
    // Check if in Telegram Web App
    if (window.Telegram && window.Telegram.WebApp) {
        isTelegramApp = true;
        console.log('Running in Telegram Mini App');
    } else {
        // Check URL parameters for Telegram data
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('tgWebAppData')) {
            isTelegramApp = true;
        } else {
            isTelegramApp = false;
            console.log('Running in Browser');
        }
    }
}

// Setup all event listeners
function setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = link.dataset.page;
            if (page) {
                navigateTo(page);
            }
        });
    });
    
    // Mobile menu toggle
    const mobileToggle = document.getElementById('mobileMenuToggle');
    const navMenu = document.getElementById('navMenu');
    if (mobileToggle) {
        mobileToggle.addEventListener('click', () => {
            navMenu.classList.toggle('active');
        });
    }
    
    // Login/Logout
    const loginBtn = document.getElementById('loginBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    
    if (loginBtn) {
        loginBtn.addEventListener('click', showLoginModal);
    }
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
    
    // Modal close
    document.querySelectorAll('.close-modal').forEach(close => {
        close.addEventListener('click', () => {
            document.getElementById('loginModal').style.display = 'none';
            document.getElementById('registerModal').style.display = 'none';
        });
    });
    
    // Login form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    // Register form
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }
    
    // Show register modal
    const showRegister = document.getElementById('showRegister');
    if (showRegister) {
        showRegister.addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('loginModal').style.display = 'none';
            document.getElementById('registerModal').style.display = 'block';
        });
    }
    
    // Show login modal
    const showLogin = document.getElementById('showLogin');
    if (showLogin) {
        showLogin.addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('registerModal').style.display = 'none';
            document.getElementById('loginModal').style.display = 'block';
        });
    }
    
    // Marketplace filters
    const platformFilter = document.getElementById('platformFilter');
    const sortFilter = document.getElementById('sortFilter');
    const searchInput = document.getElementById('searchUsername');
    
    if (platformFilter) platformFilter.addEventListener('change', filterUsernames);
    if (sortFilter) sortFilter.addEventListener('change', filterUsernames);
    if (searchInput) searchInput.addEventListener('input', filterUsernames);
    
    // Hero buttons
    const exploreBtn = document.getElementById('exploreMarketplaceBtn');
    const howItWorksBtn = document.getElementById('howItWorksBtn');
    
    if (exploreBtn) {
        exploreBtn.addEventListener('click', () => navigateTo('marketplace'));
    }
    if (howItWorksBtn) {
        howItWorksBtn.addEventListener('click', () => navigateTo('how-it-works'));
    }
    
    // Prevent scroll refresh on top
    const scrollContainer = document.getElementById('scrollContainer');
    if (scrollContainer) {
        scrollContainer.addEventListener('scroll', (e) => {
            // Prevent default browser refresh behavior
            if (scrollContainer.scrollTop <= 0) {
                e.preventDefault();
            }
        });
    }
}

// Initialize Telegram Mini App
async function initTelegramApp() {
    try {
        // Get Telegram user data
        let tgUser = null;
        
        if (window.Telegram && window.Telegram.WebApp) {
            const tg = window.Telegram.WebApp;
            tgUser = tg.initDataUnsafe?.user;
            tg.expand(); // Expand to full screen
        }
        
        if (tgUser) {
            // Authenticate with backend
            const response = await fetch(`${API_BASE}/api/auth/telegram`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    id: tgUser.id,
                    first_name: tgUser.first_name,
                    last_name: tgUser.last_name,
                    username: tgUser.username,
                    auth_date: Math.floor(Date.now() / 1000),
                    hash: 'telegram-web-app-auth' // In production, use proper hash
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                currentUser = data.user;
                updateUserUI();
            }
        }
    } catch (error) {
        console.error('Error initializing Telegram app:', error);
    }
}

// Initialize Browser App
function initBrowserApp() {
    // Check for existing session
    checkSession();
    
    // Show login button
    if (!currentUser) {
        const loginBtn = document.getElementById('loginBtn');
        if (loginBtn) loginBtn.style.display = 'block';
    }
}

// Check existing session
async function checkSession() {
    try {
        const response = await fetch(`${API_BASE}/api/auth/me`, {
            credentials: 'include'
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.authenticated) {
                currentUser = data.user;
                updateUserUI();
            }
        }
    } catch (error) {
        console.error('Error checking session:', error);
    }
}

// Update UI based on user
function updateUserUI() {
    const userInfo = document.getElementById('userInfo');
    const loginBtn = document.getElementById('loginBtn');
    
    if (currentUser) {
        userInfo.style.display = 'flex';
        loginBtn.style.display = 'none';
        
        // Update user info
        const userName = document.getElementById('userName');
        const userAvatar = document.getElementById('userAvatar');
        
        if (userName) {
            userName.textContent = currentUser.username || currentUser.full_name || currentUser.email;
        }
        if (userAvatar && currentUser.avatar) {
            userAvatar.src = currentUser.avatar;
        }
    } else {
        userInfo.style.display = 'none';
        if (!isTelegramApp) {
            loginBtn.style.display = 'block';
        }
    }
}

// Handle login
async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    try {
        const response = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({ email_or_username: email, password })
        });
        
        if (response.ok) {
            const data = await response.json();
            currentUser = data.user;
            updateUserUI();
            closeModals();
            showNotification('Login berhasil!', 'success');
        } else {
            const error = await response.json();
            showNotification(error.error || 'Login gagal', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showNotification('Terjadi kesalahan', 'error');
    }
}

// Handle register
async function handleRegister(e) {
    e.preventDefault();
    
    const email = document.getElementById('regEmail').value;
    const username = document.getElementById('regUsername').value;
    const password = document.getElementById('regPassword').value;
    const confirmPassword = document.getElementById('regConfirmPassword').value;
    
    if (password !== confirmPassword) {
        showNotification('Password tidak cocok', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/api/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, username, password })
        });
        
        if (response.ok) {
            showNotification('Registrasi berhasil! Silakan login.', 'success');
            closeModals();
            document.getElementById('loginModal').style.display = 'block';
        } else {
            const error = await response.json();
            showNotification(error.error || 'Registrasi gagal', 'error');
        }
    } catch (error) {
        console.error('Register error:', error);
        showNotification('Terjadi kesalahan', 'error');
    }
}

// Handle logout
async function handleLogout() {
    try {
        await fetch(`${API_BASE}/api/auth/logout`, {
            method: 'POST',
            credentials: 'include'
        });
        
        currentUser = null;
        updateUserUI();
        showNotification('Logout berhasil', 'success');
    } catch (error) {
        console.error('Logout error:', error);
    }
}

// Show login modal
function showLoginModal() {
    document.getElementById('loginModal').style.display = 'block';
}

// Close modals
function closeModals() {
    document.getElementById('loginModal').style.display = 'none';
    document.getElementById('registerModal').style.display = 'none';
}

// Navigate to page
function navigateTo(page) {
    // Update active page
    document.querySelectorAll('.page').forEach(p => {
        p.classList.remove('active');
    });
    document.getElementById(`${page}-page`).classList.add('active');
    
    // Update active nav link
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.dataset.page === page) {
            link.classList.add('active');
        }
    });
    
    currentPage = page;
    
    // Scroll to top
    const scrollContainer = document.getElementById('scrollContainer');
    if (scrollContainer) {
        scrollContainer.scrollTop = 0;
    }
    
    // Close mobile menu if open
    const navMenu = document.getElementById('navMenu');
    if (navMenu && navMenu.classList.contains('active')) {
        navMenu.classList.remove('active');
    }
}

// Load statistics
async function loadStats() {
    // In production, fetch from API
    // For now, use dummy data
    const stats = {
        totalUsernames: 1234,
        totalUsers: 567,
        totalTransactions: 890
    };
    
    const totalUsernamesEl = document.getElementById('totalUsernames');
    const totalUsersEl = document.getElementById('totalUsers');
    const totalTransactionsEl = document.getElementById('totalTransactions');
    
    if (totalUsernamesEl) totalUsernamesEl.textContent = stats.totalUsernames;
    if (totalUsersEl) totalUsersEl.textContent = stats.totalUsers;
    if (totalTransactionsEl) totalTransactionsEl.textContent = stats.totalTransactions;
}

// Load usernames
async function loadUsernames() {
    try {
        // In production, fetch from API
        // const response = await fetch(`${API_BASE}/api/usernames`);
        // allUsernames = await response.json();
        
        // Dummy data for now
        allUsernames = [
            {
                id: 1,
                username: '@john_doe',
                platform: 'telegram',
                price: 500000,
                description: 'Username premium, mudah diingat',
                seller: { username: 'seller1' }
            },
            {
                id: 2,
                username: '@jane_doe',
                platform: 'instagram',
                price: 750000,
                description: 'Instagram username premium',
                seller: { username: 'seller2' }
            },
            {
                id: 3,
                username: '@tech_news',
                platform: 'twitter',
                price: 1000000,
                description: 'Cocok untuk tech enthusiast',
                seller: { username: 'seller3' }
            }
        ];
        
        renderUsernames(allUsernames);
    } catch (error) {
        console.error('Error loading usernames:', error);
        showNotification('Gagal memuat username', 'error');
    }
}

// Render usernames to grid
function renderUsernames(usernames) {
    const grid = document.getElementById('marketplaceGrid');
    if (!grid) return;
    
    if (usernames.length === 0) {
        grid.innerHTML = '<div class="text-center" style="padding: 50px;"><p>Tidak ada username ditemukan</p></div>';
        return;
    }
    
    grid.innerHTML = usernames.map(username => `
        <div class="username-card" data-id="${username.id}">
            <div class="card-header">
                <h3>${username.username}</h3>
                <span class="platform-badge">
                    <i class="fab fa-${getPlatformIcon(username.platform)}"></i>
                    ${getPlatformName(username.platform)}
                </span>
            </div>
            <div class="card-body">
                <div class="price">Rp ${formatPrice(username.price)}</div>
                <div class="description">${username.description || 'Username premium dengan harga terbaik'}</div>
                <div class="seller-info">
                    <i class="fas fa-user"></i>
                    <span>Penjual: ${username.seller.username}</span>
                </div>
            </div>
            <div class="card-footer">
                <button class="buy-btn" onclick="buyUsername(${username.id})">
                    <i class="fas fa-shopping-cart"></i> Beli Sekarang
                </button>
            </div>
        </div>
    `).join('');
}

// Filter usernames
function filterUsernames() {
    let filtered = [...allUsernames];
    
    // Filter by platform
    const platform = document.getElementById('platformFilter')?.value;
    if (platform && platform !== 'all') {
        filtered = filtered.filter(u => u.platform === platform);
    }
    
    // Filter by search
    const search = document.getElementById('searchUsername')?.value.toLowerCase();
    if (search) {
        filtered = filtered.filter(u => u.username.toLowerCase().includes(search));
    }
    
    // Sort
    const sort = document.getElementById('sortFilter')?.value;
    if (sort === 'price_low') {
        filtered.sort((a, b) => a.price - b.price);
    } else if (sort === 'price_high') {
        filtered.sort((a, b) => b.price - a.price);
    } else if (sort === 'newest') {
        filtered.sort((a, b) => b.id - a.id);
    }
    
    renderUsernames(filtered);
}

// Buy username
async function buyUsername(usernameId) {
    if (!currentUser) {
        if (isTelegramApp) {
            showNotification('Silakan login terlebih dahulu', 'warning');
        } else {
            showLoginModal();
        }
        return;
    }
    
    // In production, proceed with purchase
    showNotification('Fitur pembelian akan segera tersedia', 'info');
}

// Helper functions
function getPlatformIcon(platform) {
    const icons = {
        telegram: 'telegram',
        instagram: 'instagram',
        twitter: 'twitter',
        tiktok: 'tiktok'
    };
    return icons[platform] || 'globe';
}

function getPlatformName(platform) {
    const names = {
        telegram: 'Telegram',
        instagram: 'Instagram',
        twitter: 'Twitter/X',
        tiktok: 'TikTok'
    };
    return names[platform] || platform;
}

function formatPrice(price) {
    return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;
    
    // Add styles
    notification.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        background: ${type === 'success' ? '#27ae60' : type === 'error' ? '#e74c3c' : '#3498db'};
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        z-index: 10000;
        animation: slideInRight 0.3s ease;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    `;
    
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Add animation styles
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);
// =====================================================
// Indotag Marketplace - Main JavaScript
// =====================================================

// Global variables
let currentUser = null;
let isTelegramApp = false;
let allUsernames = [];
let currentPage = 'home';
let redirectAttempted = false; // Prevent redirect loop

// API Base URL
const API_BASE = window.location.origin;

// =====================================================
// Initialize on page load
// =====================================================
document.addEventListener('DOMContentLoaded', async () => {
    // Check if we're already on miniapp page to prevent loop
    if (window.location.pathname === '/miniapp') {
        console.log('Already on miniapp page, skipping redirect');
        return;
    }
    
    // Detect platform
    detectPlatform();
    
    // Jika di Telegram Mini App dan belum pernah redirect, redirect ke halaman khusus
    if (isTelegramApp && !redirectAttempted && window.location.pathname !== '/miniapp') {
        console.log('Detected Telegram Mini App, redirecting to /miniapp...');
        redirectAttempted = true;
        window.location.href = '/miniapp';
        return;
    }
    
    // Hide loading screen after initial load
    setTimeout(() => {
        const loadingScreen = document.getElementById('loading-screen');
        const mainContent = document.getElementById('main-content');
        if (loadingScreen) loadingScreen.style.display = 'none';
        if (mainContent) mainContent.style.display = 'block';
    }, 500);
    
    // Setup event listeners
    setupEventListeners();
    
    // Initialize browser app
    initBrowserApp();
    
    // Load initial data
    await loadStats();
    await loadUsernames();
});

// =====================================================
// Detect if user is in Telegram Mini App or Browser
// =====================================================
function detectPlatform() {
    // Skip detection if already on miniapp
    if (window.location.pathname === '/miniapp') {
        isTelegramApp = true;
        return;
    }
    
    // Method 1: Check for Telegram WebApp object
    if (window.Telegram && window.Telegram.WebApp) {
        isTelegramApp = true;
        console.log('Running in Telegram Mini App (WebApp detected)');
        return;
    }
    
    // Method 2: Check URL parameters for Telegram data
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('tgWebAppData') || urlParams.get('tgWebAppVersion') || urlParams.get('tgWebAppPlatform')) {
        isTelegramApp = true;
        console.log('Running in Telegram Mini App (URL param detected)');
        return;
    }
    
    // Method 3: Check user agent for Telegram
    const userAgent = navigator.userAgent.toLowerCase();
    if (userAgent.includes('telegram') || userAgent.includes('tgweb')) {
        isTelegramApp = true;
        console.log('Running in Telegram Mini App (User Agent detected)');
        return;
    }
    
    // Not in Telegram
    isTelegramApp = false;
    console.log('Running in Browser');
}

// =====================================================
// Setup all event listeners
// =====================================================
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
    if (searchInput) searchInput.addEventListener('input', debounce(filterUsernames, 500));
    
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
        let startY = 0;
        scrollContainer.addEventListener('touchstart', (e) => {
            startY = e.touches[0].clientY;
        });
        scrollContainer.addEventListener('touchmove', (e) => {
            if (scrollContainer.scrollTop <= 0 && e.touches[0].clientY > startY) {
                e.preventDefault();
            }
        });
    }
    
    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        const loginModal = document.getElementById('loginModal');
        const registerModal = document.getElementById('registerModal');
        if (e.target === loginModal) loginModal.style.display = 'none';
        if (e.target === registerModal) registerModal.style.display = 'none';
    });
}

// =====================================================
// Utility Functions
// =====================================================
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// =====================================================
// Browser App Initialization
// =====================================================
function initBrowserApp() {
    // Check for existing session
    checkSession();
    
    // Show login button
    if (!currentUser) {
        const loginBtn = document.getElementById('loginBtn');
        if (loginBtn) loginBtn.style.display = 'block';
    }
}

// =====================================================
// Session Management
// =====================================================
async function checkSession() {
    try {
        const response = await fetch(`${API_BASE}/api/auth/me`, {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            }
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

// =====================================================
// UI Update Functions
// =====================================================
function updateUserUI() {
    const userInfo = document.getElementById('userInfo');
    const loginBtn = document.getElementById('loginBtn');
    
    if (currentUser) {
        if (userInfo) userInfo.style.display = 'flex';
        if (loginBtn) loginBtn.style.display = 'none';
        
        // Update user info
        const userName = document.getElementById('userName');
        const userAvatar = document.getElementById('userAvatar');
        
        if (userName) {
            userName.textContent = currentUser.username || currentUser.full_name || currentUser.email || 'User';
        }
        if (userAvatar && currentUser.avatar) {
            userAvatar.src = currentUser.avatar;
        }
    } else {
        if (userInfo) userInfo.style.display = 'none';
        if (loginBtn && !isTelegramApp) loginBtn.style.display = 'block';
    }
}

// =====================================================
// Authentication Handlers
// =====================================================
async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    if (!email || !password) {
        showNotification('Email/Username dan password harus diisi', 'warning');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({ email_or_username: email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            currentUser = data.user;
            updateUserUI();
            closeModals();
            showNotification('Login berhasil!', 'success');
        } else {
            showNotification(data.error || 'Login gagal', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showNotification('Terjadi kesalahan', 'error');
    }
}

async function handleRegister(e) {
    e.preventDefault();
    
    const email = document.getElementById('regEmail').value;
    const username = document.getElementById('regUsername').value;
    const password = document.getElementById('regPassword').value;
    const confirmPassword = document.getElementById('regConfirmPassword').value;
    
    if (!email || !password) {
        showNotification('Email dan password harus diisi', 'warning');
        return;
    }
    
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
        
        const data = await response.json();
        
        if (response.ok) {
            showNotification('Registrasi berhasil! Silakan login.', 'success');
            closeModals();
            document.getElementById('loginModal').style.display = 'block';
        } else {
            showNotification(data.error || 'Registrasi gagal', 'error');
        }
    } catch (error) {
        console.error('Register error:', error);
        showNotification('Terjadi kesalahan', 'error');
    }
}

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
        showNotification('Logout gagal', 'error');
    }
}

// =====================================================
// Modal Functions
// =====================================================
function showLoginModal() {
    document.getElementById('loginModal').style.display = 'block';
}

function closeModals() {
    const loginModal = document.getElementById('loginModal');
    const registerModal = document.getElementById('registerModal');
    if (loginModal) loginModal.style.display = 'none';
    if (registerModal) registerModal.style.display = 'none';
}

// =====================================================
// Navigation
// =====================================================
function navigateTo(page) {
    // Update active page
    document.querySelectorAll('.page').forEach(p => {
        p.classList.remove('active');
    });
    const targetPage = document.getElementById(`${page}-page`);
    if (targetPage) targetPage.classList.add('active');
    
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

// =====================================================
// Data Loading Functions
// =====================================================
async function loadStats() {
    try {
        const response = await fetch(`${API_BASE}/api/stats`);
        if (response.ok) {
            const stats = await response.json();
            
            const totalUsernamesEl = document.getElementById('totalUsernames');
            const totalUsersEl = document.getElementById('totalUsers');
            const totalTransactionsEl = document.getElementById('totalTransactions');
            
            if (totalUsernamesEl) totalUsernamesEl.textContent = stats.total_usernames || 0;
            if (totalUsersEl) totalUsersEl.textContent = stats.total_users || 0;
            if (totalTransactionsEl) totalTransactionsEl.textContent = stats.total_transactions || 0;
        }
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

async function loadUsernames() {
    const grid = document.getElementById('marketplaceGrid');
    if (!grid) return;
    
    try {
        const response = await fetch(`${API_BASE}/api/usernames`);
        if (response.ok) {
            allUsernames = await response.json();
            renderUsernames(allUsernames);
        } else {
            throw new Error('Failed to load usernames');
        }
    } catch (error) {
        console.error('Error loading usernames:', error);
        grid.innerHTML = '<div class="text-center" style="padding: 50px;"><p>Gagal memuat username. Silakan refresh halaman.</p></div>';
        showNotification('Gagal memuat username', 'error');
    }
}

// =====================================================
// Render Functions
// =====================================================
function renderUsernames(usernames) {
    const grid = document.getElementById('marketplaceGrid');
    if (!grid) return;
    
    if (!usernames || usernames.length === 0) {
        grid.innerHTML = '<div class="text-center" style="padding: 50px;"><p>Tidak ada username ditemukan</p></div>';
        return;
    }
    
    grid.innerHTML = usernames.map(username => `
        <div class="username-card" data-id="${username.id}">
            <div class="card-header">
                <h3>${escapeHtml(username.username)}</h3>
                <span class="platform-badge">
                    <i class="fab fa-${getPlatformIcon(username.platform)}"></i>
                    ${getPlatformName(username.platform)}
                </span>
            </div>
            <div class="card-body">
                <div class="price">Rp ${formatPrice(username.price)}</div>
                <div class="description">${escapeHtml(username.description || 'Username premium dengan harga terbaik')}</div>
                <div class="seller-info">
                    <i class="fas fa-user"></i>
                    <span>Penjual: ${escapeHtml(username.seller_username || 'User')}</span>
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

// =====================================================
// Filter Functions
// =====================================================
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
        filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }
    
    renderUsernames(filtered);
}

// =====================================================
// Buy Function
// =====================================================
async function buyUsername(usernameId) {
    if (!currentUser) {
        showLoginModal();
        showNotification('Silakan login terlebih dahulu', 'warning');
        return;
    }
    
    const username = allUsernames.find(u => u.id === usernameId);
    if (!username) return;
    
    if (confirm(`Apakah Anda yakin ingin membeli ${username.username} seharga Rp ${formatPrice(username.price)}?`)) {
        try {
            const response = await fetch(`${API_BASE}/api/usernames/${usernameId}/buy`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include'
            });
            
            const data = await response.json();
            
            if (response.ok) {
                showNotification('Pembelian berhasil! Silakan selesaikan pembayaran.', 'success');
                await loadUsernames();
            } else {
                showNotification(data.error || 'Pembelian gagal', 'error');
            }
        } catch (error) {
            console.error('Error buying username:', error);
            showNotification('Pembelian gagal', 'error');
        }
    }
}

// =====================================================
// Helper Functions
// =====================================================
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

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// =====================================================
// Notification System
// =====================================================
function showNotification(message, type = 'info') {
    // Remove existing notification
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    
    const icons = {
        success: 'check-circle',
        error: 'exclamation-circle',
        warning: 'exclamation-triangle',
        info: 'info-circle'
    };
    
    notification.innerHTML = `
        <i class="fas fa-${icons[type] || icons.info}"></i>
        <span>${escapeHtml(message)}</span>
    `;
    
    // Add styles
    notification.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        background: ${type === 'success' ? '#27ae60' : type === 'error' ? '#e74c3c' : type === 'warning' ? '#f39c12' : '#3498db'};
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        z-index: 10000;
        animation: slideInRight 0.3s ease;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 14px;
        max-width: 350px;
    `;
    
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Add animation styles if not already added
if (!document.getElementById('notification-styles')) {
    const style = document.createElement('style');
    style.id = 'notification-styles';
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
}
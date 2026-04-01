// Global variables
let telegramUser = null;
let tg = null;

// Check if running in Telegram
function isTelegramWebApp() {
    // Cek apakah di Telegram WebApp
    return !!(window.Telegram && window.Telegram.WebApp);
}

// Initialize Telegram WebApp
function initTelegramWebApp() {
    console.log('Current path:', window.location.pathname);
    console.log('Is Telegram WebApp:', isTelegramWebApp());
    
    if (isTelegramWebApp()) {
        // Ini di Telegram
        tg = window.Telegram.WebApp;
        tg.ready();
        tg.expand();
        
        console.log('Running in Telegram WebApp');
        
        // Get user data from Telegram
        if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
            telegramUser = tg.initDataUnsafe.user;
            authenticateTelegramUser();
        } else if (tg.initData) {
            // Parse init data
            const params = new URLSearchParams(tg.initData);
            const userData = params.get('user');
            if (userData) {
                telegramUser = JSON.parse(decodeURIComponent(userData));
                authenticateTelegramUser();
            }
        }
        
        // Jika di root path dan di Telegram, redirect ke miniapp
        if (window.location.pathname === '/' || window.location.pathname === '') {
            console.log('Redirecting to miniapp...');
            window.location.href = '/miniapp';
        } else if (window.location.pathname === '/miniapp') {
            // Load MiniApp content
            loadMiniAppContent();
        }
    } else {
        // Tidak di Telegram, tampilkan konten biasa
        console.log('Running in regular browser');
        
        // Jika sedang di halaman miniapp, redirect ke home
        if (window.location.pathname === '/miniapp') {
            console.log('Redirecting to home...');
            window.location.href = '/';
        } else {
            // Load regular website content
            loadRegularContent();
        }
    }
}

// Authenticate with backend
async function authenticateTelegramUser() {
    try {
        const response = await fetch('/api/telegram/auth', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                telegram_data: telegramUser
            })
        });
        
        const result = await response.json();
        if (result.success) {
            telegramUser = result.user;
            if (window.location.pathname === '/miniapp') {
                displayUserProfile();
            }
        }
    } catch (error) {
        console.error('Authentication error:', error);
    }
}

// Display user profile in MiniApp
function displayUserProfile() {
    const profileDiv = document.getElementById('userProfile');
    if (profileDiv && telegramUser) {
        profileDiv.innerHTML = `
            <img src="${telegramUser.photo_url || 'https://via.placeholder.com/80'}" 
                 alt="Profile" class="user-avatar">
            <div class="user-name">${telegramUser.first_name || ''} ${telegramUser.last_name || ''}</div>
            <div class="user-username">@${telegramUser.username || 'username'}</div>
            <div class="user-id">ID: ${telegramUser.id || ''}</div>
            <button class="logout-btn" onclick="logout()">Logout</button>
        `;
    }
}

// Load MiniApp content
async function loadMiniAppContent() {
    console.log('Loading MiniApp content...');
    
    // Tampilkan loading
    const profileDiv = document.getElementById('userProfile');
    if (profileDiv) {
        profileDiv.innerHTML = '<div class="loading-spinner"></div>';
    }
    
    if (telegramUser) {
        displayUserProfile();
    } else {
        // Jika belum ada user data, coba ambil dari session
        try {
            const response = await fetch('/api/user/profile');
            const result = await response.json();
            if (result.success) {
                telegramUser = result.user;
                displayUserProfile();
            }
        } catch (error) {
            console.error('Error getting profile:', error);
        }
    }
}

// Load regular website content
function loadRegularContent() {
    console.log('Loading regular website content...');
    
    // Load products from API
    loadProducts();
    
    // Setup event listeners
    setupEventListeners();
}

// Load products from API
async function loadProducts() {
    const productsGrid = document.getElementById('productsGrid');
    if (!productsGrid) return;
    
    // Tampilkan loading
    productsGrid.innerHTML = '<div class="loading-spinner"></div>';
    
    try {
        const response = await fetch('/api/products');
        const products = await response.json();
        displayProducts(products);
    } catch (error) {
        console.error('Error loading products:', error);
        productsGrid.innerHTML = '<p>Gagal memuat produk. Silakan refresh halaman.</p>';
    }
}

// Display products in grid
function displayProducts(products) {
    const productsGrid = document.getElementById('productsGrid');
    if (!productsGrid) return;
    
    if (!products || products.length === 0) {
        productsGrid.innerHTML = '<p>Belum ada produk tersedia</p>';
        return;
    }
    
    productsGrid.innerHTML = products.map(product => `
        <div class="product-card">
            <h3>${escapeHtml(product.name)}</h3>
            <p>${escapeHtml(product.description)}</p>
            <div class="price">Rp ${product.price.toLocaleString()}</div>
            <button class="btn-buy" onclick="buyProduct(${product.id})">Beli</button>
        </div>
    `).join('');
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Setup event listeners
function setupEventListeners() {
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            alert('Fitur login akan segera hadir!');
        });
    }
    
    const getStartedBtn = document.getElementById('getStartedBtn');
    if (getStartedBtn) {
        getStartedBtn.addEventListener('click', () => {
            alert('Silakan akses melalui Telegram untuk pengalaman terbaik!');
        });
    }
}

// Buy product function
function buyProduct(productId) {
    if (isTelegramWebApp() && tg) {
        tg.showAlert('Fitur pembelian akan segera hadir!');
    } else {
        alert('Silakan akses melalui Telegram untuk membeli produk');
    }
}

// Logout function
async function logout() {
    try {
        const response = await fetch('/api/telegram/logout', {
            method: 'POST'
        });
        
        if (response.ok) {
            if (tg) {
                tg.close();
            }
            window.location.href = '/';
        }
    } catch (error) {
        console.error('Logout error:', error);
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', initTelegramWebApp);
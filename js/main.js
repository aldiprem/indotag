// Global variables
let telegramUser = null;
let tg = null;

// Check if running in Telegram
function isTelegramWebApp() {
    return window.Telegram && window.Telegram.WebApp;
}

// Initialize Telegram WebApp
function initTelegramWebApp() {
    if (isTelegramWebApp()) {
        tg = window.Telegram.WebApp;
        tg.ready();
        tg.expand();
        
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
        
        // Check if current page is miniapp
        if (window.location.pathname === '/miniapp') {
            loadMiniAppContent();
        } else {
            // Redirect to miniapp if in Telegram
            window.location.href = '/miniapp';
        }
    } else {
        // Not in Telegram, show regular content
        if (window.location.pathname === '/miniapp') {
            window.location.href = '/';
        } else {
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
    if (telegramUser) {
        displayUserProfile();
    }
}

// Load regular website content
function loadRegularContent() {
    // Load products from API
    loadProducts();
    
    // Setup event listeners
    setupEventListeners();
}

// Load products from API
async function loadProducts() {
    try {
        const response = await fetch('/api/products');
        const products = await response.json();
        displayProducts(products);
    } catch (error) {
        console.error('Error loading products:', error);
        displayProducts([]);
    }
}

// Display products in grid
function displayProducts(products) {
    const productsGrid = document.getElementById('productsGrid');
    if (!productsGrid) return;
    
    if (products.length === 0) {
        productsGrid.innerHTML = '<p>No products available</p>';
        return;
    }
    
    productsGrid.innerHTML = products.map(product => `
        <div class="product-card">
            <h3>${product.name}</h3>
            <p>${product.description}</p>
            <div class="price">Rp ${product.price.toLocaleString()}</div>
            <button class="btn-buy" onclick="buyProduct(${product.id})">Beli</button>
        </div>
    `).join('');
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
            if (isTelegramWebApp()) {
                window.location.href = '/miniapp';
            } else {
                alert('Download Telegram untuk pengalaman terbaik!');
            }
        });
    }
}

// Buy product function
function buyProduct(productId) {
    if (isTelegramWebApp()) {
        tg.showAlert('Fitur pembelian akan segera hadir!');
    } else {
        alert('Silakan login melalui Telegram untuk membeli produk');
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
// MiniApp JavaScript
let tg = null;
let telegramUser = null;

// Initialize MiniApp
function initMiniApp() {
    console.log('Initializing MiniApp...');
    
    // Check if running in Telegram
    if (window.Telegram && window.Telegram.WebApp) {
        tg = window.Telegram.WebApp;
        
        // Safe call to Telegram methods
        try {
            tg.ready();
            tg.expand();
            console.log('Running in Telegram WebApp');
        } catch(e) {
            console.error('Error initializing Telegram:', e);
        }
        
        // Get user data
        try {
            if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
                telegramUser = tg.initDataUnsafe.user;
                authenticateUser();
            } else if (tg.initData) {
                const params = new URLSearchParams(tg.initData);
                const userData = params.get('user');
                if (userData) {
                    telegramUser = JSON.parse(decodeURIComponent(userData));
                    authenticateUser();
                } else {
                    loadDemoProfile();
                }
            } else {
                loadDemoProfile();
            }
        } catch(e) {
            console.error('Error getting user data:', e);
            loadDemoProfile();
        }
    } else {
        // Not in Telegram - show demo
        console.log('Not in Telegram, showing demo');
        loadDemoProfile();
    }
    
    // Load products
    loadProducts();
}

// Authenticate user with backend
async function authenticateUser() {
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
            displayUserProfile();
            showToast(`Selamat datang ${telegramUser.first_name || 'Pengguna'}!`);
        } else {
            loadDemoProfile();
        }
    } catch (error) {
        console.error('Auth error:', error);
        loadDemoProfile();
    }
}

// Display user profile
function displayUserProfile() {
    const userSection = document.getElementById('userSection');
    if (userSection && telegramUser) {
        userSection.innerHTML = `
            <div class="user-profile">
                <img src="${telegramUser.photo_url || 'https://via.placeholder.com/60'}" 
                     alt="Profile" class="user-avatar" onerror="this.src='https://via.placeholder.com/60'">
                <div class="user-info">
                    <div class="user-name">${escapeHtml(telegramUser.first_name || '')} ${escapeHtml(telegramUser.last_name || '')}</div>
                    <div class="user-username">@${escapeHtml(telegramUser.username || 'username')}</div>
                    <button class="logout-btn" onclick="logout()">Logout</button>
                </div>
            </div>
        `;
    }
}

// Load demo profile
function loadDemoProfile() {
    const userSection = document.getElementById('userSection');
    if (userSection) {
        userSection.innerHTML = `
            <div class="user-profile">
                <img src="https://via.placeholder.com/60" alt="Profile" class="user-avatar">
                <div class="user-info">
                    <div class="user-name">Pengunjung</div>
                    <div class="user-username">Mode Demo</div>
                    <button class="logout-btn" onclick="loginDemo()">Login via Telegram</button>
                </div>
            </div>
        `;
    }
}

// Load products from API
async function loadProducts() {
    const productsList = document.getElementById('productsList');
    if (!productsList) return;
    
    productsList.innerHTML = '<div class="loading-spinner"></div>';
    
    try {
        const response = await fetch('/api/products');
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const products = await response.json();
        displayProducts(products);
    } catch (error) {
        console.error('Error loading products:', error);
        productsList.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📦</div>
                <p>Gagal memuat produk</p>
                <small style="color:#999">Silakan coba lagi nanti</small>
            </div>
        `;
    }
}

// Display products
function displayProducts(products) {
    const productsList = document.getElementById('productsList');
    if (!productsList) return;
    
    if (!products || products.length === 0) {
        productsList.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🛍️</div>
                <p>Belum ada produk</p>
            </div>
        `;
        return;
    }
    
    productsList.innerHTML = products.map(product => `
        <div class="product-item" onclick="buyProduct(${product.id})">
            <div class="product-icon">
                ${getProductIcon(product.name)}
            </div>
            <div class="product-details">
                <div class="product-name">${escapeHtml(product.name)}</div>
                <div class="product-desc">${escapeHtml(product.description)}</div>
                <div class="product-price">Rp ${Number(product.price).toLocaleString()}</div>
            </div>
            <button class="buy-btn" onclick="event.stopPropagation(); buyProduct(${product.id})">Beli</button>
        </div>
    `).join('');
}

// Get product icon based on name
function getProductIcon(name) {
    const icons = {
        'Premium': '⭐',
        'Standard': '🌟',
        'Basic': '✨'
    };
    
    for (const [key, icon] of Object.entries(icons)) {
        if (name && name.includes(key)) return icon;
    }
    return '📦';
}

// Buy product
function buyProduct(productId) {
    if (tg && telegramUser && telegramUser.id) {
        try {
            tg.showAlert('Fitur pembelian akan segera hadir!');
            if (tg.HapticFeedback) {
                tg.HapticFeedback.impactOccurred('medium');
            }
        } catch(e) {
            showToast('Fitur pembelian akan segera hadir!');
        }
    } else {
        showToast('Silakan login melalui Telegram terlebih dahulu');
    }
}

// Show feature
function showFeature(feature) {
    const messages = {
        marketplace: 'Fitur marketplace akan segera hadir!',
        pricing: 'Lihat paket harga spesial untuk Anda',
        profile: 'Lengkapi profil Anda untuk pengalaman terbaik',
        support: 'Hubungi support di support@indotag.site'
    };
    
    const message = messages[feature] || 'Fitur sedang dalam pengembangan';
    
    if (tg) {
        try {
            tg.showAlert(message);
            if (tg.HapticFeedback) {
                tg.HapticFeedback.impactOccurred('light');
            }
        } catch(e) {
            showToast(message);
        }
    } else {
        showToast(message);
    }
}

// Navigate
function navigateTo(page) {
    // Update active state
    const navItems = document.querySelectorAll('.nav-item');
    if (navItems && event && event.currentTarget) {
        navItems.forEach(item => {
            item.classList.remove('active');
        });
        event.currentTarget.classList.add('active');
    }
    
    const messages = {
        home: 'Beranda',
        shop: 'Toko',
        orders: 'Pesanan',
        profile: 'Profil'
    };
    
    const message = `Halaman ${messages[page]} sedang dalam pengembangan`;
    
    if (tg) {
        try {
            tg.showAlert(message);
            if (tg.HapticFeedback) {
                tg.HapticFeedback.impactOccurred('light');
            }
        } catch(e) {
            showToast(message);
        }
    } else {
        showToast(message);
    }
}

// Logout function
async function logout() {
    try {
        const response = await fetch('/api/telegram/logout', {
            method: 'POST'
        });
        
        if (response.ok) {
            showToast('Logout berhasil');
            if (tg) {
                try {
                    tg.close();
                } catch(e) {
                    console.log('Telegram close error:', e);
                }
            }
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        }
    } catch (error) {
        console.error('Logout error:', error);
        showToast('Logout gagal, silakan coba lagi');
    }
}

// Login demo
function loginDemo() {
    showToast('Buka melalui Telegram untuk login otomatis dengan akun Telegram Anda');
}

// Show toast message
function showToast(message) {
    // Remove existing toast
    const existingToast = document.querySelector('.toast-message');
    if (existingToast) {
        existingToast.remove();
    }
    
    // Create new toast
    const toast = document.createElement('div');
    toast.className = 'toast-message';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    // Add style if not exists
    if (!document.querySelector('#toast-style')) {
        const style = document.createElement('style');
        style.id = 'toast-style';
        style.textContent = `
            .toast-message {
                position: fixed;
                bottom: 80px;
                left: 50%;
                transform: translateX(-50%);
                background: rgba(0, 0, 0, 0.8);
                color: white;
                padding: 10px 20px;
                border-radius: 8px;
                font-size: 14px;
                z-index: 1000;
                animation: fadeInUp 0.3s ease;
                white-space: nowrap;
                max-width: 90%;
                white-space: normal;
                text-align: center;
            }
            @keyframes fadeInUp {
                from {
                    opacity: 0;
                    transform: translateX(-50%) translateY(20px);
                }
                to {
                    opacity: 1;
                    transform: translateX(-50%) translateY(0);
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    // Remove after 2 seconds
    setTimeout(() => {
        if (toast && toast.remove) {
            toast.remove();
        }
    }, 2000);
}

// Escape HTML
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Initialize on load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMiniApp);
} else {
    initMiniApp();
}
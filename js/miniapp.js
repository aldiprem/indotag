// MiniApp JavaScript
let tg = null;
let telegramUser = null;

// Initialize MiniApp
function initMiniApp() {
    console.log('Initializing MiniApp...');
    
    // Check if running in Telegram
    if (window.Telegram && window.Telegram.WebApp) {
        tg = window.Telegram.WebApp;
        
        try {
            tg.ready();
            tg.expand();
            console.log('Running in Telegram WebApp');
        } catch(e) {
            console.error('Error initializing Telegram:', e);
        }
        
        // LANGSUNG AMBIL DATA USER DARI TELEGRAM, GA PAKE API
        try {
            if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
                telegramUser = tg.initDataUnsafe.user;
                console.log('User data from Telegram:', telegramUser);
                // LANGSUNG TAMPILIN, GA USAH AUTH KE BACKEND
                displayUserProfile();
                showToast(`Halo ${telegramUser.first_name || telegramUser.username}!`);
            } else {
                console.log('No user data found');
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

// Display user profile - LANGSUNG DARI DATA TELEGRAM
function displayUserProfile() {
    const userSection = document.getElementById('userSection');
    if (userSection && telegramUser) {
        // Buat avatar dari inisial nama
        const initial = telegramUser.first_name ? telegramUser.first_name.charAt(0).toUpperCase() : 
                       (telegramUser.username ? telegramUser.username.charAt(0).toUpperCase() : 'U');
        const colors = ['#0088cc', '#34a853', '#ea4335', '#fbbc04', '#9c27b0'];
        const colorIndex = (telegramUser.id || Math.floor(Math.random() * colors.length)) % colors.length;
        const bgColor = colors[colorIndex];
        
        const avatarSvg = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60' viewBox='0 0 60 60'%3E%3Crect width='60' height='60' fill='${bgColor}'/%3E%3Ctext x='30' y='40' font-size='28' text-anchor='middle' fill='white' font-weight='bold'%3E${initial}%3C/text%3E%3C/svg%3E`;
        
        userSection.innerHTML = `
            <div class="user-profile">
                <img src="${avatarSvg}" alt="Profile" class="user-avatar" style="width:60px;height:60px;border-radius:50%;">
                <div class="user-info">
                    <div class="user-name">${escapeHtml(telegramUser.first_name || '')} ${escapeHtml(telegramUser.last_name || '')}</div>
                    <div class="user-username">@${escapeHtml(telegramUser.username || 'unknown')}</div>
                    <div class="user-id" style="font-size:12px;color:#999;">ID: ${telegramUser.id || ''}</div>
                    <button class="logout-btn" onclick="closeMiniApp()">Tutup</button>
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
                <div style="width:60px;height:60px;background:#0088cc;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:30px;color:white;">
                    👤
                </div>
                <div class="user-info">
                    <div class="user-name">Pengunjung</div>
                    <div class="user-username">Buka di Telegram</div>
                    <button class="logout-btn" onclick="alert('Buka melalui Telegram untuk login otomatis')">Info</button>
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
                <small>Silakan coba lagi nanti</small>
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

// Get product icon
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
    if (tg) {
        try {
            tg.showAlert('Fitur pembelian akan segera hadir!');
            if (tg.HapticFeedback) {
                tg.HapticFeedback.impactOccurred('medium');
            }
        } catch(e) {
            showToast('Fitur pembelian akan segera hadir!');
        }
    } else {
        showToast('Silakan akses melalui Telegram');
    }
}

// Show feature
function showFeature(feature) {
    const messages = {
        marketplace: 'Fitur marketplace akan segera hadir!',
        pricing: 'Lihat paket harga spesial untuk Anda',
        profile: 'Profil Anda sudah terhubung dengan Telegram',
        support: 'Hubungi support@indotag.site'
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
        } catch(e) {
            showToast(message);
        }
    } else {
        showToast(message);
    }
}

// Close MiniApp
function closeMiniApp() {
    if (tg) {
        try {
            tg.close();
        } catch(e) {
            console.log('Close error:', e);
            window.close();
        }
    } else {
        window.close();
    }
}

// Show toast message
function showToast(message) {
    const existingToast = document.querySelector('.toast-message');
    if (existingToast) {
        existingToast.remove();
    }
    
    const toast = document.createElement('div');
    toast.className = 'toast-message';
    toast.textContent = message;
    document.body.appendChild(toast);
    
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
                max-width: 90%;
                text-align: center;
                white-space: normal;
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

// Initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMiniApp);
} else {
    initMiniApp();
}
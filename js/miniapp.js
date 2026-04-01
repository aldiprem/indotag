// MiniApp JavaScript - CLEAN VERSION, NO API CALLS
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
            console.log('✅ Running in Telegram WebApp');
        } catch(e) {
            console.error('Error initializing Telegram:', e);
        }
        
        // LANGSUNG AMBIL DATA DARI TELEGRAM
        try {
            if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
                telegramUser = tg.initDataUnsafe.user;
                console.log('✅ User data from Telegram:', telegramUser);
                console.log('   - ID:', telegramUser.id);
                console.log('   - First name:', telegramUser.first_name);
                console.log('   - Username:', telegramUser.username);
                // LANGSUNG TAMPILIN
                displayUserProfile();
            } else {
                console.log('⚠️ No user data found in initDataUnsafe');
                console.log('initDataUnsafe:', tg.initDataUnsafe);
                loadDemoProfile();
            }
        } catch(e) {
            console.error('❌ Error getting user data:', e);
            loadDemoProfile();
        }
    } else {
        console.log('❌ Not in Telegram, showing demo');
        console.log('window.Telegram:', window.Telegram);
        loadDemoProfile();
    }
    
    // Load products
    loadProducts();
}

// Display user profile - LANGSUNG DARI TELEGRAM
function displayUserProfile() {
    const userSection = document.getElementById('userSection');
    if (userSection && telegramUser) {
        // Buat avatar dari inisial nama
        const firstName = telegramUser.first_name || '';
        const lastName = telegramUser.last_name || '';
        const username = telegramUser.username || 'unknown';
        const userId = telegramUser.id || '';
        
        const initial = firstName ? firstName.charAt(0).toUpperCase() : 
                       (username ? username.charAt(0).toUpperCase() : 'U');
        const colors = ['#0088cc', '#34a853', '#ea4335', '#fbbc04', '#9c27b0', '#ff5722'];
        const colorIndex = (userId % colors.length) || 0;
        const bgColor = colors[colorIndex];
        
        const avatarSvg = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60' viewBox='0 0 60 60'%3E%3Crect width='60' height='60' fill='${bgColor}'/%3E%3Ctext x='30' y='40' font-size='28' text-anchor='middle' fill='white' font-weight='bold'%3E${initial}%3C/text%3E%3C/svg%3E`;
        
        userSection.innerHTML = `
            <div class="user-profile">
                <img src="${avatarSvg}" alt="Profile" class="user-avatar" style="width:60px;height:60px;border-radius:50%;">
                <div class="user-info">
                    <div class="user-name" style="font-size:18px;font-weight:bold;">${escapeHtml(firstName)} ${escapeHtml(lastName)}</div>
                    <div class="user-username" style="color:#666;margin:5px 0;">@${escapeHtml(username)}</div>
                    <div class="user-id" style="font-size:11px;color:#999;margin-bottom:10px;">ID: ${userId}</div>
                    <button class="logout-btn" onclick="closeMiniApp()" style="background:#dc3545;color:white;border:none;padding:8px 20px;border-radius:20px;cursor:pointer;">Tutup</button>
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
                    <div class="user-name" style="font-size:18px;font-weight:bold;">Mode Demo</div>
                    <div class="user-username" style="color:#666;margin:5px 0;">Buka di Telegram App</div>
                    <button class="logout-btn" onclick="alert('Buka melalui aplikasi Telegram untuk melihat data user')" style="background:#0088cc;color:white;border:none;padding:8px 20px;border-radius:20px;cursor:pointer;">Info</button>
                </div>
            </div>
        `;
    }
}

// Load products
async function loadProducts() {
    const productsList = document.getElementById('productsList');
    if (!productsList) return;
    
    productsList.innerHTML = '<div class="loading-spinner"></div>';
    
    try {
        const response = await fetch('/api/products');
        const products = await response.json();
        displayProducts(products);
    } catch (error) {
        console.error('Error loading products:', error);
        productsList.innerHTML = '<div class="empty-state"><p>Gagal memuat produk</p></div>';
    }
}

// Display products
function displayProducts(products) {
    const productsList = document.getElementById('productsList');
    if (!productsList) return;
    
    if (!products || products.length === 0) {
        productsList.innerHTML = '<div class="empty-state"><p>Belum ada produk</p></div>';
        return;
    }
    
    productsList.innerHTML = products.map(product => `
        <div class="product-item" onclick="buyProduct(${product.id})" style="background:#f5f5f5;border-radius:12px;padding:12px;margin-bottom:10px;display:flex;align-items:center;gap:12px;cursor:pointer;">
            <div style="width:50px;height:50px;background:#0088cc;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:24px;">
                ${getProductIcon(product.name)}
            </div>
            <div style="flex:1;">
                <div style="font-weight:bold;">${escapeHtml(product.name)}</div>
                <div style="font-size:12px;color:#666;">${escapeHtml(product.description)}</div>
                <div style="color:#0088cc;font-weight:bold;margin-top:5px;">Rp ${Number(product.price).toLocaleString()}</div>
            </div>
            <button onclick="event.stopPropagation(); buyProduct(${product.id})" style="background:#28a745;color:white;border:none;padding:8px 16px;border-radius:8px;cursor:pointer;">Beli</button>
        </div>
    `).join('');
}

function getProductIcon(name) {
    if (name.includes('Premium')) return '⭐';
    if (name.includes('Standard')) return '🌟';
    if (name.includes('Basic')) return '✨';
    return '📦';
}

function buyProduct(productId) {
    if (tg) {
        tg.showAlert('Fitur pembelian akan segera hadir!');
    } else {
        alert('Fitur pembelian akan segera hadir!');
    }
}

function showFeature(feature) {
    const messages = {
        marketplace: 'Fitur marketplace akan segera hadir!',
        pricing: 'Lihat paket harga spesial',
        profile: `Halo ${telegramUser?.first_name || 'Pengunjung'}!`,
        support: 'Hubungi support@indotag.site'
    };
    const msg = messages[feature] || 'Fitur sedang dikembangkan';
    if (tg) tg.showAlert(msg);
    else alert(msg);
}

function navigateTo(page) {
    const navItems = document.querySelectorAll('.nav-item');
    if (event && event.currentTarget) {
        navItems.forEach(item => item.classList.remove('active'));
        event.currentTarget.classList.add('active');
    }
    const msg = `Halaman ${page} sedang dikembangkan`;
    if (tg) tg.showAlert(msg);
    else alert(msg);
}

function closeMiniApp() {
    if (tg) tg.close();
    else window.close();
}

function showToast(message) {
    alert(message);
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Start
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMiniApp);
} else {
    initMiniApp();
}
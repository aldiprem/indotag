// MiniApp JavaScript - FIXED VERSION
let tg = null;
let telegramUser = null;

function initMiniApp() {
    console.log('=== MINIAPP FIXED VERSION ===');
    
    if (window.Telegram && window.Telegram.WebApp) {
        tg = window.Telegram.WebApp;
        
        try {
            tg.ready();
            tg.expand();
            console.log('✅ Running in Telegram WebApp');
        } catch(e) {
            console.error('Error:', e);
        }
        
        try {
            if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
                telegramUser = tg.initDataUnsafe.user;
                console.log('✅ User:', telegramUser.first_name, '@' + telegramUser.username);
                displayUserProfile();
            } else {
                console.log('No user data');
                loadDemoProfile();
            }
        } catch(e) {
            console.error('Error:', e);
            loadDemoProfile();
        }
    } else {
        console.log('Not in Telegram');
        loadDemoProfile();
    }
    
    loadProducts();
}

function displayUserProfile() {
    const userSection = document.getElementById('userSection');
    if (userSection && telegramUser) {
        const firstName = telegramUser.first_name || '';
        const username = telegramUser.username || 'unknown';
        const userId = telegramUser.id || '';
        const initial = firstName ? firstName.charAt(0).toUpperCase() : 
                       (username ? username.charAt(0).toUpperCase() : 'U');
        
        userSection.innerHTML = `
            <div style="background:#f5f5f5;border-radius:16px;padding:20px;margin:16px;display:flex;align-items:center;gap:16px;">
                <div style="width:60px;height:60px;background:#0088cc;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:28px;color:white;font-weight:bold;">
                    ${initial}
                </div>
                <div style="flex:1;">
                    <div style="font-size:18px;font-weight:bold;">${escapeHtml(firstName)}</div>
                    <div style="color:#666;">@${escapeHtml(username)}</div>
                    <div style="font-size:11px;color:#999;">ID: ${userId}</div>
                    <button onclick="closeMiniApp()" style="background:#dc3545;color:white;border:none;padding:6px 16px;border-radius:20px;margin-top:8px;cursor:pointer;">Tutup</button>
                </div>
            </div>
        `;
    }
}

function loadDemoProfile() {
    const userSection = document.getElementById('userSection');
    if (userSection) {
        userSection.innerHTML = `
            <div style="background:#f5f5f5;border-radius:16px;padding:20px;margin:16px;display:flex;align-items:center;gap:16px;">
                <div style="width:60px;height:60px;background:#0088cc;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:30px;color:white;">👤</div>
                <div style="flex:1;">
                    <div style="font-size:18px;font-weight:bold;">Mode Demo</div>
                    <div style="color:#666;">Buka di Telegram App</div>
                    <button onclick="alert('Buka melalui Telegram untuk login')" style="background:#0088cc;color:white;border:none;padding:6px 16px;border-radius:20px;margin-top:8px;cursor:pointer;">Info</button>
                </div>
            </div>
        `;
    }
}

async function loadProducts() {
    const productsList = document.getElementById('productsList');
    if (!productsList) return;
    
    productsList.innerHTML = '<div style="text-align:center;padding:20px;"><div class="loading-spinner"></div><p>Memuat...</p></div>';
    
    try {
        const response = await fetch('/api/products');
        const products = await response.json();
        displayProducts(products);
    } catch (error) {
        console.error('Error:', error);
        productsList.innerHTML = '<div style="text-align:center;padding:20px;">Gagal memuat produk</div>';
    }
}

function displayProducts(products) {
    const productsList = document.getElementById('productsList');
    if (!productsList) return;
    
    if (!products || products.length === 0) {
        productsList.innerHTML = '<div style="text-align:center;padding:20px;">Belum ada produk</div>';
        return;
    }
    
    productsList.innerHTML = products.map(product => `
        <div onclick="buyProduct(${product.id})" style="background:#f5f5f5;border-radius:12px;padding:12px;margin-bottom:10px;display:flex;align-items:center;gap:12px;cursor:pointer;">
            <div style="width:50px;height:50px;background:#0088cc;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:24px;">${getIcon(product.name)}</div>
            <div style="flex:1;">
                <div style="font-weight:bold;">${escapeHtml(product.name)}</div>
                <div style="font-size:12px;color:#666;">${escapeHtml(product.description)}</div>
                <div style="color:#0088cc;font-weight:bold;">Rp ${Number(product.price).toLocaleString()}</div>
            </div>
            <button onclick="event.stopPropagation(); buyProduct(${product.id})" style="background:#28a745;color:white;border:none;padding:8px 16px;border-radius:8px;cursor:pointer;">Beli</button>
        </div>
    `).join('');
}

function getIcon(name) {
    if (name.includes('Premium')) return '⭐';
    if (name.includes('Standard')) return '🌟';
    if (name.includes('Basic')) return '✨';
    return '📦';
}

function buyProduct(id) {
    if (tg) tg.showAlert('Fitur pembelian akan segera hadir!');
    else alert('Fitur pembelian akan segera hadir!');
}

function showFeature(feature) {
    const msg = {
        marketplace: 'Fitur marketplace akan segera hadir!',
        pricing: 'Lihat paket harga spesial untuk Anda',
        profile: telegramUser ? `Halo ${telegramUser.first_name}!` : 'Login untuk melihat profil',
        support: 'Hubungi support@indotag.site'
    }[feature] || 'Fitur sedang dikembangkan';
    
    if (tg) tg.showAlert(msg);
    else alert(msg);
}

function navigateTo(page) {
    const items = document.querySelectorAll('.nav-item');
    if (event && event.currentTarget) {
        items.forEach(i => i.classList.remove('active'));
        event.currentTarget.classList.add('active');
    }
    if (tg) tg.showAlert(`Halaman ${page} sedang dikembangkan`);
    else alert(`Halaman ${page} sedang dikembangkan`);
}

function closeMiniApp() {
    if (tg) tg.close();
    else window.close();
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

document.addEventListener('DOMContentLoaded', initMiniApp);
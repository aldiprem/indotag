let tg = null;
let telegramUser = null;

function initMiniApp() {
    console.log('Initializing MiniApp...');
    
    // Mencegah pull-to-refresh di mobile
    document.body.addEventListener('touchmove', function(e) {
        if (e.target === document.body) {
            e.preventDefault();
        }
    }, { passive: false });
    
    if (window.Telegram && window.Telegram.WebApp) {
        tg = window.Telegram.WebApp;
        
        try {
            tg.ready();
            tg.expand();
            console.log('Running in Telegram WebApp');
        } catch(e) {
            console.error('Error:', e);
        }
        
        try {
            if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
                telegramUser = tg.initDataUnsafe.user;
                console.log('User data:', telegramUser);
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
        const lastName = telegramUser.last_name || '';
        const username = telegramUser.username || 'unknown';
        const userId = telegramUser.id || '';
        const photoUrl = telegramUser.photo_url;
        
        // Jika ada foto profil, tampilkan foto, jika tidak tampilkan placeholder
        const avatarHtml = photoUrl ? 
            `<img src="${photoUrl}" alt="${firstName}" class="user-avatar" onerror="this.style.display='none'; this.parentElement.innerHTML = '<div class=\'user-avatar-placeholder\'>${firstName.charAt(0).toUpperCase() || 'U'}</div>'">` :
            `<div class="user-avatar-placeholder">${firstName ? firstName.charAt(0).toUpperCase() : 'U'}</div>`;
        
        userSection.innerHTML = `
            <div class="user-profile">
                ${avatarHtml}
                <div class="user-info">
                    <div class="user-name">${escapeHtml(firstName)} ${escapeHtml(lastName)}</div>
                    <div class="user-username">@${escapeHtml(username)}</div>
                    <button class="logout-btn" onclick="closeMiniApp()">Tutup</button>
                </div>
            </div>
        `;
    }
}

function loadDemoProfile() {
    const userSection = document.getElementById('userSection');
    if (userSection) {
        userSection.innerHTML = `
            <div class="user-profile">
                <div class="user-avatar-placeholder">👤</div>
                <div class="user-info">
                    <div class="user-name">Mode Demo</div>
                    <div class="user-username">Buka di Telegram App</div>
                    <button class="logout-btn" onclick="alert('Buka melalui Telegram untuk login')">Info</button>
                </div>
            </div>
        `;
    }
}

async function loadProducts() {
    const productsList = document.getElementById('productsList');
    if (!productsList) return;
    
    productsList.innerHTML = '<div class="loading-spinner"></div>';
    
    try {
        const response = await fetch('/api/products');
        const products = await response.json();
        displayProducts(products);
    } catch (error) {
        console.error('Error:', error);
        productsList.innerHTML = '<div class="empty-state">Gagal memuat produk</div>';
    }
}

function displayProducts(products) {
    const productsList = document.getElementById('productsList');
    if (!productsList) return;
    
    if (!products || products.length === 0) {
        productsList.innerHTML = '<div class="empty-state">Belum ada produk</div>';
        return;
    }
    
    productsList.innerHTML = products.map(product => `
        <div class="product-item" onclick="buyProduct(${product.id})">
            <div class="product-icon">${getIcon(product.name)}</div>
            <div class="product-details">
                <div class="product-name">${escapeHtml(product.name)}</div>
                <div class="product-desc">${escapeHtml(product.description)}</div>
                <div class="product-price">Rp ${Number(product.price).toLocaleString()}</div>
            </div>
            <button class="buy-btn" onclick="event.stopPropagation(); buyProduct(${product.id})">Beli</button>
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
    const messages = {
        marketplace: 'Fitur marketplace akan segera hadir!',
        pricing: 'Lihat paket harga spesial untuk Anda',
        profile: telegramUser ? `Halo ${telegramUser.first_name}!` : 'Login untuk melihat profil',
        support: 'Hubungi support@indotag.site'
    };
    const msg = messages[feature] || 'Fitur sedang dikembangkan';
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
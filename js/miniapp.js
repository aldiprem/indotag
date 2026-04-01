// Main website JavaScript
let telegramUser = null;

// Initialize website
function initWebsite() {
    console.log('Initializing website...');
    
    // Load products
    loadProducts();
    
    // Setup event listeners
    setupEventListeners();
    
    // Check if running in Telegram (just for info, no redirect)
    if (window.Telegram && window.Telegram.WebApp) {
        console.log('This page is opened in Telegram but staying on website');
        // Optional: Show banner to open MiniApp
        showTelegramBanner();
    }
}

// Load products from API
async function loadProducts() {
    const productsGrid = document.getElementById('productsGrid');
    if (!productsGrid) return;
    
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
            <div class="price">Rp ${Number(product.price).toLocaleString()}</div>
            <button class="btn-buy" onclick="buyProduct(${product.id})">Beli</button>
        </div>
    `).join('');
}

// Show Telegram banner
function showTelegramBanner() {
    const banner = document.createElement('div');
    banner.className = 'telegram-banner';
    banner.innerHTML = `
        <div class="banner-content">
            <span>📱 Buka di Telegram MiniApp untuk pengalaman lebih baik!</span>
            <button onclick="openMiniApp()">Buka MiniApp</button>
        </div>
    `;
    document.body.insertBefore(banner, document.body.firstChild);
    
    // Add styles for banner
    const style = document.createElement('style');
    style.textContent = `
        .telegram-banner {
            background: linear-gradient(135deg, #0088cc, #006699);
            color: white;
            padding: 12px;
            text-align: center;
            position: sticky;
            top: 0;
            z-index: 1000;
        }
        .banner-content {
            display: flex;
            justify-content: space-between;
            align-items: center;
            max-width: 1200px;
            margin: 0 auto;
            gap: 16px;
        }
        .telegram-banner button {
            background: white;
            color: #0088cc;
            border: none;
            padding: 6px 16px;
            border-radius: 20px;
            cursor: pointer;
            font-weight: bold;
        }
        @media (max-width: 768px) {
            .banner-content {
                flex-direction: column;
            }
        }
    `;
    document.head.appendChild(style);
}

// Open MiniApp
function openMiniApp() {
    window.open('/miniapp', '_blank');
}

// Escape HTML
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Buy product
function buyProduct(productId) {
    alert('Fitur pembelian akan segera hadir! Silakan login terlebih dahulu.');
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
            alert('Mulai perjalanan digital Anda bersama IndoTag!');
        });
    }
    
    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', initWebsite);
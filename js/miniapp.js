// =====================================================
// Telegram Mini App - Indotag Marketplace
// =====================================================

let tg = window.Telegram.WebApp;
let currentUser = null;
let allUsernames = [];
let currentTab = 'marketplace';

// API Base URL
const API_BASE = window.location.origin;

// =====================================================
// Initialize Telegram Mini App
// =====================================================

document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Initialize Telegram WebApp
        tg.expand();
        tg.enableClosingConfirmation();
        tg.ready();
        
        // Get user data from Telegram
        const initData = tg.initDataUnsafe;
        const telegramUser = initData.user;
        
        console.log('Telegram User Data:', telegramUser);
        
        if (telegramUser) {
            // Authenticate with backend using Telegram user data
            await authenticateWithTelegram(telegramUser);
        } else {
            console.log('No Telegram user data found');
            showToast('Please open this app from Telegram', 'warning');
        }
        
        // Hide loading screen
        setTimeout(() => {
            const loadingScreen = document.getElementById('loading-screen');
            const mainContent = document.getElementById('main-content');
            if (loadingScreen) loadingScreen.style.display = 'none';
            if (mainContent) mainContent.style.display = 'block';
        }, 500);
        
        // Setup event listeners
        setupEventListeners();
        
        // Load initial data
        await loadUsernames();
        await loadStats();
        
    } catch (error) {
        console.error('Error initializing Mini App:', error);
        showToast('Failed to initialize app', 'error');
    }
});

// =====================================================
// Authentication Functions
// =====================================================

async function authenticateWithTelegram(telegramUser) {
    try {
        // Create auth data for backend
        const authData = {
            id: telegramUser.id,
            first_name: telegramUser.first_name,
            last_name: telegramUser.last_name || '',
            username: telegramUser.username || '',
            auth_date: Math.floor(Date.now() / 1000)
        };
        
        console.log('Sending auth data to backend:', authData);
        
        const response = await fetch(`${API_BASE}/api/auth/telegram`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify(authData)
        });
        
        if (response.ok) {
            const data = await response.json();
            currentUser = data.user;
            console.log('Authentication successful:', currentUser);
            updateUserUI();
            showToast(`Welcome ${currentUser.full_name || currentUser.username || 'User'}!`, 'success');
        } else {
            const error = await response.json();
            console.error('Authentication failed:', error);
            showToast('Authentication failed: ' + (error.error || 'Unknown error'), 'error');
        }
    } catch (error) {
        console.error('Error authenticating with Telegram:', error);
        showToast('Failed to authenticate', 'error');
    }
}

// =====================================================
// UI Update Functions
// =====================================================

function updateUserUI() {
    const userBadge = document.getElementById('userBadge');
    const userName = document.getElementById('userName');
    const userAvatar = document.getElementById('userAvatar');
    const welcomeBanner = document.getElementById('welcomeBanner');
    const sellSection = document.getElementById('sellSection');
    
    if (currentUser) {
        // Update user name
        const displayName = currentUser.full_name || currentUser.username || 'User';
        userName.textContent = displayName;
        
        // Try to get avatar from Telegram
        if (window.Telegram.WebApp.initDataUnsafe.user) {
            const photoUrl = window.Telegram.WebApp.initDataUnsafe.user.photo_url;
            if (photoUrl) {
                userAvatar.src = photoUrl;
                userAvatar.style.display = 'block';
            }
        }
        
        // Update welcome banner
        if (welcomeBanner) {
            welcomeBanner.innerHTML = `
                <h2>Welcome back, ${displayName}!</h2>
                <p>Ready to buy or sell usernames?</p>
            `;
        }
        
        // Show sell section
        if (sellSection) {
            sellSection.style.display = 'block';
        }
        
        // Update Telegram main button if needed
        tg.MainButton.setText('Profile');
        tg.MainButton.onClick(() => showTelegramProfile());
        tg.MainButton.show();
        
    } else {
        if (welcomeBanner) {
            welcomeBanner.innerHTML = `
                <h2>Welcome to Indotag!</h2>
                <p>Login with Telegram to start buying and selling</p>
            `;
        }
        
        tg.MainButton.hide();
    }
}

// =====================================================
// Event Listeners
// =====================================================

function setupEventListeners() {
    // Bottom navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            const tab = item.dataset.tab;
            switchTab(tab);
        });
    });
    
    // Platform filter
    const platformFilter = document.getElementById('platformFilter');
    if (platformFilter) {
        platformFilter.addEventListener('change', () => filterUsernames());
    }
    
    // Sort button
    const sortBtn = document.getElementById('sortBtn');
    if (sortBtn) {
        sortBtn.addEventListener('click', () => {
            const currentSort = sortBtn.dataset.sort || 'newest';
            if (currentSort === 'newest') {
                sortBtn.innerHTML = '<i class="fas fa-sort-amount-down"></i> Harga Rendah';
                sortBtn.dataset.sort = 'price_low';
                filterUsernames('price_low');
            } else {
                sortBtn.innerHTML = '<i class="fas fa-sort-amount-up"></i> Terbaru';
                sortBtn.dataset.sort = 'newest';
                filterUsernames('newest');
            }
        });
    }
    
    // Search input
    const searchInput = document.getElementById('searchUsername');
    if (searchInput) {
        let timeout;
        searchInput.addEventListener('input', () => {
            clearTimeout(timeout);
            timeout = setTimeout(() => filterUsernames(), 500);
        });
    }
    
    // Submit listing
    const submitBtn = document.getElementById('submitListingBtn');
    if (submitBtn) {
        submitBtn.addEventListener('click', submitListing);
    }
    
    // Prevent scroll refresh
    const scrollContainer = document.getElementById('scrollContainer');
    if (scrollContainer) {
        scrollContainer.addEventListener('touchstart', (e) => {
            if (scrollContainer.scrollTop <= 0 && e.touches[0].clientY > 50) {
                e.preventDefault();
            }
        });
    }
    
    // Handle back button in Telegram
    tg.onEvent('backButtonClicked', () => {
        if (currentTab !== 'marketplace') {
            switchTab('marketplace');
        } else {
            tg.close();
        }
    });
}

// =====================================================
// Tab Navigation
// =====================================================

function switchTab(tab) {
    currentTab = tab;
    
    // Update active state
    document.querySelectorAll('.nav-item').forEach(item => {
        if (item.dataset.tab === tab) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
    
    // Show/hide sections
    const marketplaceSection = document.querySelector('.marketplace-section');
    const sellSection = document.getElementById('sellSection');
    const infoSection = document.querySelector('.info-section');
    const welcomeBanner = document.getElementById('welcomeBanner');
    const searchSection = document.querySelector('.filters');
    
    if (tab === 'marketplace') {
        if (marketplaceSection) marketplaceSection.style.display = 'block';
        if (sellSection) sellSection.style.display = 'none';
        if (infoSection) infoSection.style.display = 'grid';
        if (welcomeBanner) welcomeBanner.style.display = 'block';
        if (searchSection) searchSection.style.display = 'flex';
        tg.BackButton.hide();
    } else if (tab === 'sell') {
        if (currentUser) {
            if (marketplaceSection) marketplaceSection.style.display = 'none';
            if (sellSection) sellSection.style.display = 'block';
            if (infoSection) infoSection.style.display = 'none';
            if (welcomeBanner) welcomeBanner.style.display = 'none';
            if (searchSection) searchSection.style.display = 'none';
            tg.BackButton.show();
        } else {
            showToast('Please login to sell usernames', 'warning');
            switchTab('marketplace');
        }
    } else if (tab === 'profile') {
        showTelegramProfile();
    }
}

// =====================================================
// Marketplace Functions
// =====================================================

async function loadUsernames() {
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
        const grid = document.getElementById('marketplaceGrid');
        if (grid) {
            grid.innerHTML = '<div class="loading-spinner"><p>Failed to load usernames. Please try again.</p></div>';
        }
    }
}

function renderUsernames(usernames) {
    const grid = document.getElementById('marketplaceGrid');
    if (!grid) return;
    
    if (!usernames || usernames.length === 0) {
        grid.innerHTML = '<div class="loading-spinner"><p>No usernames available</p></div>';
        return;
    }
    
    grid.innerHTML = usernames.map(username => `
        <div class="username-card" onclick="buyUsername(${username.id})">
            <div class="card-header">
                <h3>${escapeHtml(username.username)}</h3>
                <span class="platform-badge">
                    <i class="fab fa-${getPlatformIcon(username.platform)}"></i>
                    ${getPlatformName(username.platform)}
                </span>
            </div>
            <div class="card-body">
                <div class="price">Rp ${formatPrice(username.price)}</div>
                <div class="description">${escapeHtml(username.description || 'Premium username available')}</div>
                <div class="seller-info">
                    <i class="fas fa-user"></i>
                    <span>Seller: ${escapeHtml(username.seller_username || 'User')}</span>
                </div>
            </div>
            <div class="card-footer">
                <button class="buy-btn" onclick="event.stopPropagation(); buyUsername(${username.id})">
                    <i class="fas fa-shopping-cart"></i> Buy Now
                </button>
            </div>
        </div>
    `).join('');
}

function filterUsernames(sortType = null) {
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
    const sort = sortType || 'newest';
    if (sort === 'price_low') {
        filtered.sort((a, b) => a.price - b.price);
    } else if (sort === 'price_high') {
        filtered.sort((a, b) => b.price - a.price);
    } else {
        filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }
    
    renderUsernames(filtered);
}

// =====================================================
// Purchase Functions
// =====================================================

async function buyUsername(usernameId) {
    if (!currentUser) {
        showToast('Please login to purchase', 'warning');
        return;
    }
    
    const username = allUsernames.find(u => u.id === usernameId);
    if (!username) return;
    
    // Show confirmation popup
    tg.showPopup({
        title: 'Confirm Purchase',
        message: `Buy ${username.username} for Rp ${formatPrice(username.price)}?`,
        buttons: [
            {id: 'cancel', type: 'cancel', text: 'Cancel'},
            {id: 'buy', type: 'default', text: 'Buy Now'}
        ]
    }, async (buttonId) => {
        if (buttonId === 'buy') {
            try {
                tg.showProgress();
                
                const response = await fetch(`${API_BASE}/api/usernames/${usernameId}/buy`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    credentials: 'include'
                });
                
                tg.hideProgress();
                
                if (response.ok) {
                    const data = await response.json();
                    showToast('Purchase successful!', 'success');
                    tg.showAlert('Username purchased successfully!\n\nPlease contact seller to complete the transfer.');
                    await loadUsernames();
                } else {
                    const error = await response.json();
                    showToast(error.error || 'Purchase failed', 'error');
                }
            } catch (error) {
                tg.hideProgress();
                console.error('Error buying username:', error);
                showToast('Purchase failed', 'error');
            }
        }
    });
}

// =====================================================
// Listing Functions
// =====================================================

async function submitListing() {
    if (!currentUser) {
        showToast('Please login to list usernames', 'warning');
        return;
    }
    
    const username = document.getElementById('sellUsername').value.trim();
    const platform = document.getElementById('sellPlatform').value;
    const price = document.getElementById('sellPrice').value;
    const description = document.getElementById('sellDescription').value.trim();
    
    if (!username || !price) {
        showToast('Please fill in username and price', 'warning');
        return;
    }
    
    if (isNaN(price) || price <= 0) {
        showToast('Please enter a valid price', 'warning');
        return;
    }
    
    tg.showProgress();
    
    try {
        const response = await fetch(`${API_BASE}/api/usernames`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({ 
                username, 
                platform, 
                price: parseFloat(price), 
                description 
            })
        });
        
        tg.hideProgress();
        
        if (response.ok) {
            showToast('Username listed successfully!', 'success');
            // Clear form
            document.getElementById('sellUsername').value = '';
            document.getElementById('sellPrice').value = '';
            document.getElementById('sellDescription').value = '';
            await loadUsernames();
            switchTab('marketplace');
        } else {
            const error = await response.json();
            showToast(error.error || 'Failed to list username', 'error');
        }
    } catch (error) {
        tg.hideProgress();
        console.error('Error submitting listing:', error);
        showToast('Failed to list username', 'error');
    }
}

// =====================================================
// Stats Functions
// =====================================================

async function loadStats() {
    try {
        const response = await fetch(`${API_BASE}/api/stats`);
        if (response.ok) {
            const stats = await response.json();
            
            const totalUsernames = document.getElementById('totalUsernames');
            const totalUsers = document.getElementById('totalUsers');
            const totalTransactions = document.getElementById('totalTransactions');
            
            if (totalUsernames) totalUsernames.textContent = stats.total_usernames || 0;
            if (totalUsers) totalUsers.textContent = stats.total_users || 0;
            if (totalTransactions) totalTransactions.textContent = stats.total_transactions || 0;
        }
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// =====================================================
// Profile Functions
// =====================================================

function showTelegramProfile() {
    const user = window.Telegram.WebApp.initDataUnsafe.user;
    if (user) {
        const message = `Name: ${user.first_name} ${user.last_name || ''}\nUsername: @${user.username || 'N/A'}\nID: ${user.id}`;
        tg.showPopup({
            title: 'Your Profile',
            message: message,
            buttons: [{id: 'close', type: 'close', text: 'Close'}]
        });
    } else {
        showToast('Profile not available', 'warning');
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
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    
    toast.textContent = message;
    toast.style.backgroundColor = type === 'success' ? '#27ae60' : type === 'error' ? '#e74c3c' : '#3498db';
    toast.style.display = 'block';
    
    setTimeout(() => {
        toast.style.display = 'none';
    }, 3000);
}
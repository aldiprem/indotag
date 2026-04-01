// Telegram Mini App initialization
let tg = window.Telegram.WebApp;
let currentUser = null;
let allUsernames = [];
let currentTab = 'marketplace';

// API Base URL
const API_BASE = window.location.origin;

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    // Initialize Telegram WebApp
    tg.expand();
    tg.enableClosingConfirmation();
    
    // Get user data from Telegram
    const initData = tg.initDataUnsafe;
    const user = initData.user;
    
    if (user) {
        await authenticateUser(user);
    }
    
    // Hide loading screen
    setTimeout(() => {
        document.getElementById('loading-screen').style.display = 'none';
        document.getElementById('main-content').style.display = 'block';
    }, 500);
    
    // Setup event listeners
    setupEventListeners();
    
    // Load initial data
    await loadUsernames();
});

// Authenticate user with backend
async function authenticateUser(telegramUser) {
    try {
        const response = await fetch(`${API_BASE}/api/auth/telegram`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                id: telegramUser.id,
                first_name: telegramUser.first_name,
                last_name: telegramUser.last_name,
                username: telegramUser.username,
                auth_date: Math.floor(Date.now() / 1000),
                hash: 'telegram-web-app-auth'
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            currentUser = data.user;
            updateUserUI();
        }
    } catch (error) {
        console.error('Error authenticating user:', error);
    }
}

// Update UI based on user
function updateUserUI() {
    const userBadge = document.getElementById('userBadge');
    const userName = document.getElementById('userName');
    const userAvatar = document.getElementById('userAvatar');
    const welcomeBanner = document.getElementById('welcomeBanner');
    const sellSection = document.getElementById('sellSection');
    
    if (currentUser) {
        userName.textContent = currentUser.username || currentUser.full_name || 'User';
        
        // Try to get avatar from Telegram
        if (window.Telegram.WebApp.initDataUnsafe.user) {
            const photoUrl = window.Telegram.WebApp.initDataUnsafe.user.photo_url;
            if (photoUrl) {
                userAvatar.src = photoUrl;
                userAvatar.style.display = 'block';
            }
        }
        
        // Update welcome banner
        welcomeBanner.innerHTML = `
            <h2>Welcome back, ${currentUser.full_name || currentUser.username || 'User'}!</h2>
            <p>Ready to buy or sell usernames?</p>
        `;
        
        // Show sell section
        sellSection.style.display = 'block';
    } else {
        welcomeBanner.innerHTML = `
            <h2>Welcome to Indotag!</h2>
            <p>Login with Telegram to start buying and selling</p>
        `;
    }
}

// Setup event listeners
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
        platformFilter.addEventListener('change', filterUsernames);
    }
    
    // Sort button
    const sortBtn = document.getElementById('sortBtn');
    if (sortBtn) {
        sortBtn.addEventListener('click', () => {
            const currentSort = sortBtn.innerHTML.includes('Terbaru') ? 'price_low' : 'newest';
            if (currentSort === 'newest') {
                sortBtn.innerHTML = '<i class="fas fa-sort-amount-down"></i> Harga Rendah';
                filterUsernames('price_low');
            } else {
                sortBtn.innerHTML = '<i class="fas fa-sort-amount-up"></i> Terbaru';
                filterUsernames('newest');
            }
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
            if (scrollContainer.scrollTop <= 0) {
                e.preventDefault();
            }
        });
    }
}

// Switch between tabs
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
    
    if (tab === 'marketplace') {
        marketplaceSection.style.display = 'block';
        sellSection.style.display = currentUser ? 'block' : 'none';
        infoSection.style.display = 'grid';
        welcomeBanner.style.display = 'block';
    } else if (tab === 'sell') {
        if (currentUser) {
            marketplaceSection.style.display = 'none';
            sellSection.style.display = 'block';
            infoSection.style.display = 'none';
            welcomeBanner.style.display = 'none';
        } else {
            showToast('Please login to sell usernames', 'warning');
            switchTab('marketplace');
        }
    } else if (tab === 'profile') {
        showTelegramProfile();
    }
}

// Load usernames from API
async function loadUsernames() {
    try {
        const response = await fetch(`${API_BASE}/api/usernames`);
        if (response.ok) {
            allUsernames = await response.json();
            renderUsernames(allUsernames);
        }
    } catch (error) {
        console.error('Error loading usernames:', error);
        showToast('Failed to load usernames', 'error');
    }
}

// Render usernames
function renderUsernames(usernames) {
    const grid = document.getElementById('marketplaceGrid');
    if (!grid) return;
    
    if (usernames.length === 0) {
        grid.innerHTML = '<div class="loading-spinner"><p>No usernames available</p></div>';
        return;
    }
    
    grid.innerHTML = usernames.map(username => `
        <div class="username-card" onclick="buyUsername(${username.id})">
            <div class="card-header">
                <h3>${username.username}</h3>
                <span class="platform-badge">
                    <i class="fab fa-${getPlatformIcon(username.platform)}"></i>
                    ${getPlatformName(username.platform)}
                </span>
            </div>
            <div class="card-body">
                <div class="price">Rp ${formatPrice(username.price)}</div>
                <div class="description">${username.description || 'Premium username available'}</div>
                <div class="seller-info">
                    <i class="fas fa-user"></i>
                    <span>Seller: ${username.seller_username || 'User'}</span>
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

// Filter usernames
function filterUsernames(sortType = null) {
    let filtered = [...allUsernames];
    
    // Filter by platform
    const platform = document.getElementById('platformFilter')?.value;
    if (platform && platform !== 'all') {
        filtered = filtered.filter(u => u.platform === platform);
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

// Buy username
async function buyUsername(usernameId) {
    if (!currentUser) {
        showToast('Please login to purchase', 'warning');
        return;
    }
    
    // Send confirmation to Telegram
    tg.showPopup({
        title: 'Confirm Purchase',
        message: 'Are you sure you want to buy this username?',
        buttons: [
            {id: 'cancel', type: 'cancel', text: 'Cancel'},
            {id: 'buy', type: 'default', text: 'Buy Now'}
        ]
    }, async (buttonId) => {
        if (buttonId === 'buy') {
            try {
                const response = await fetch(`${API_BASE}/api/usernames/${usernameId}/buy`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    credentials: 'include'
                });
                
                if (response.ok) {
                    showToast('Purchase successful!', 'success');
                    tg.showAlert('Username purchased successfully!');
                    await loadUsernames();
                } else {
                    const error = await response.json();
                    showToast(error.error || 'Purchase failed', 'error');
                }
            } catch (error) {
                console.error('Error buying username:', error);
                showToast('Purchase failed', 'error');
            }
        }
    });
}

// Submit listing
async function submitListing() {
    if (!currentUser) {
        showToast('Please login to list usernames', 'warning');
        return;
    }
    
    const username = document.getElementById('sellUsername').value;
    const platform = document.getElementById('sellPlatform').value;
    const price = document.getElementById('sellPrice').value;
    const description = document.getElementById('sellDescription').value;
    
    if (!username || !price) {
        showToast('Please fill in all required fields', 'warning');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/api/usernames`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({ username, platform, price, description })
        });
        
        if (response.ok) {
            showToast('Username listed successfully!', 'success');
            // Clear form
            document.getElementById('sellUsername').value = '';
            document.getElementById('sellPrice').value = '';
            document.getElementById('sellDescription').value = '';
            await loadUsernames();
        } else {
            const error = await response.json();
            showToast(error.error || 'Failed to list username', 'error');
        }
    } catch (error) {
        console.error('Error submitting listing:', error);
        showToast('Failed to list username', 'error');
    }
}

// Show Telegram profile
function showTelegramProfile() {
    const user = window.Telegram.WebApp.initDataUnsafe.user;
    if (user) {
        tg.showPopup({
            title: 'Your Profile',
            message: `Name: ${user.first_name} ${user.last_name || ''}\nUsername: @${user.username || 'N/A'}\nID: ${user.id}`,
            buttons: [{id: 'close', type: 'close', text: 'Close'}]
        });
    } else {
        showToast('Profile not available', 'warning');
    }
}

// Helper functions
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

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.style.display = 'block';
    
    setTimeout(() => {
        toast.style.display = 'none';
    }, 2000);
}
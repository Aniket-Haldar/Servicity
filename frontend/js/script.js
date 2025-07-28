function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
}

const API_BASE_URL = 'https://servicity.onrender.com';
let isAdmin = false; 

const servicesContainer = document.getElementById('services-container');
const searchInput = document.getElementById('service-search');
const searchBtn = document.getElementById('search-btn');

document.querySelector('.hamburger')?.addEventListener('click', function() {
    document.querySelector('.nav-links')?.classList.toggle('active');
});

document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        e.preventDefault();
        const targetId = this.getAttribute('href');
        if (targetId === '#') return;
        const targetElement = document.querySelector(targetId);
        if (targetElement) {
            window.scrollTo({
                top: targetElement.offsetTop - 70,
                behavior: 'smooth'
            });
            document.querySelector('.nav-links')?.classList.remove('active');
        }
    });
});

window.addEventListener('scroll', function() {
    const navbar = document.querySelector('.navbar');
    if (navbar) {
        navbar.style.boxShadow = window.scrollY > 50 
            ? '0 4px 12px rgba(0, 0, 0, 0.1)' 
            : 'none';
    }
});

async function fetchAndDisplayServices(searchQuery = '') {
    try {
        servicesContainer.innerHTML = `
            <div class="loading-spinner">
                <div class="spinner"></div>
                <p>Loading services...</p>
            </div>
        `;

        const url = `${API_BASE_URL}/services${searchQuery ? `?search=${encodeURIComponent(searchQuery)}` : ''}`;
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        let services = await response.json();

        services = services.map(service => ({
            id: service.id || service.ID,
            name: service.name || service.Name,
            description: service.description || service.Description,
            price: service.price || service.Price,
            image_url: service.image_url || service.ImageURL,
            provider_id: service.provider_id || service.ProviderID
        }));

        servicesContainer.innerHTML = '';

        if (!services || services.length === 0) {
            servicesContainer.innerHTML = `
                <div class="error-message">
                    <p>No services found. ${searchQuery ? 'Try a different search.' : ''}</p>
                </div>
            `;
            return;
        }

        renderServices(services);

    } catch (error) {
        console.error('Error fetching services:', error);
        servicesContainer.innerHTML = `
            <div class="error-message">
                <p>Failed to load services. Please try again later.</p>
                <button class="btn btn-outline" id="retry-btn">Retry</button>
            </div>
        `;
        document.getElementById('retry-btn')?.addEventListener('click', () => fetchAndDisplayServices());
    }
}

function renderServices(services) {
    services.forEach(service => {
        const serviceCard = document.createElement('div');
        serviceCard.className = 'service-card';
        serviceCard.innerHTML = `
            <div class="service-img" style="background-image: url('${service.image_url || 'images/default-service.jpeg'}');"></div>
            <div class="service-info">
                <h3>${service.name}</h3>
                ${service.description ? `<p class="service-description">${service.description}</p>` : ''}
                ${service.price ? `<p class="service-price">From ₹${service.price}</p>` : ''}
                <button class="btn btn-outline book-btn" data-service-id="${service.id}">Book Now</button>
                ${isAdmin ? `<button class="btn btn-danger delete-btn" data-service-id="${service.id}">Delete</button>` : ''}
            </div>
        `;
        servicesContainer.appendChild(serviceCard);
    });

    setupServiceInteractions();
}

function setupServiceInteractions() {
    document.querySelectorAll('.book-btn').forEach(button => {
        button.addEventListener('click', function() {
            const serviceId = this.getAttribute('data-service-id');
            bookService(serviceId);
        });
    });

    if (isAdmin) {
        document.querySelectorAll('.delete-btn').forEach(button => {
            button.addEventListener('click', function() {
                const serviceId = this.getAttribute('data-service-id');
                if (confirm('Are you sure you want to delete this service?')) {
                    deleteService(serviceId);
                }
            });
        });
    }
}

async function bookService(serviceId) {
    const token = getCookie('token');
    if (!token) {
        window.location.href = `${API_BASE_URL}/auth/google/login`;
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/booking`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                service_id: Number(serviceId),
                booking_time: new Date().toISOString()
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Booking failed: ${errorText}`);
        }
        window.location.href = `/frontend/html/booking.html?serviceId=${serviceId}`;

    } catch (error) {
        console.error('Booking failed:', error);
        alert('Booking failed. Please try again.');
    }
}
async function deleteService(serviceId) {
    const token = getCookie('token');
    if (!token) {
        window.location.href = `${API_BASE_URL}/auth/google/login`;
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/services/${serviceId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Delete failed');
        }

        alert('Service deleted successfully');
        fetchAndDisplayServices(); 

    } catch (error) {
        console.error('Delete failed:', error);
        alert('Failed to delete service');
    }
}

searchBtn?.addEventListener('click', () => {
    fetchAndDisplayServices(searchInput.value.trim());
});

searchInput?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        fetchAndDisplayServices(searchInput.value.trim());
    }
});

document.getElementById('dashboard-link')?.addEventListener('click', async function(e) {
    e.preventDefault();
    const token = getCookie('token');
    if (!token) {
        window.location.href = `${API_BASE_URL}/auth/google/login`;
        return;
    }
    try {
        const response = await fetch(`${API_BASE_URL}/profile/details`, {
            headers: { 'Authorization': `bearer ${token}` }
        });
        if (!response.ok) throw new Error('Failed to fetch user profile');
        const data = await response.json();
        console.log(data);

       
        if (!data.role || data.role.trim() === "") {
            window.location.href = 'application_status_admin.html';
            return;
        }

        if (data.role === 'Provider' && data.profile.status == 'Approved') {
            window.location.href = 'dashboard_provider.html';
        } else if (data.role === 'Admin') {
            window.location.href = 'dashboard_admin.html';
        } else if (data.role === 'Customer') {
            window.location.href = 'dashboard_customer.html';
        } else if (data.role === 'Provider' && data.status != 'Approved') {
            window.location.href = 'application_status.html';
        } else {
            window.location.href = `${API_BASE_URL}/auth/google/login`;
        }
    } catch (err) {
        alert('Error determining dashboard: ' + err.message);
    }
});

async function checkAuthStatus() {
    const token = localStorage.getItem('token') || getCookie('token');
    if (!token) return false;

    try {
        const response = await fetch(`${API_BASE_URL}/profile/details`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) return false;

        const data = await response.json();

        if (data.name) {
            document.getElementById('user-info').style.display = 'block';
            document.getElementById('google-login').style.display = 'none';
            document.querySelector('.user-name').textContent = data.name;
            document.getElementById('dashboard-link').style.display = '';

            if (data.role && data.role.toLowerCase() === 'admin') {
                isAdmin = true;
            }
            if (data.role && data.role.toLowerCase() === 'provider') {
                isAdmin = true; 
            }
            return true;
        }
        return false;
    } catch (error) {
        console.error('Auth check failed:', error);
        return false;
    }
}

function showAuthButtons() {
    document.getElementById('google-login')?.style.setProperty('display', '');
    document.getElementById('register-provider-btn')?.style.setProperty('display', '');
    document.getElementById('register-admin-btn')?.style.setProperty('display', '');
    document.querySelector('.profile-dropdown')?.style.setProperty('display', 'none');
}

function showProfileDropdown(profile) {
    document.getElementById('google-login')?.style.setProperty('display', 'none');
    document.getElementById('register-provider-btn')?.style.setProperty('display', 'none');
    document.getElementById('register-admin-btn')?.style.setProperty('display', 'none');
    document.querySelector('.profile-dropdown')?.style.setProperty('display', '');
    if (profile) {
        document.querySelector('.user-name').textContent = profile.name || '';
        document.querySelector('.user-email').textContent = profile.email || '';
    }
}
async function getUserProfile() {
    const token = localStorage.getItem('token') || getCookie('token');
    if (!token) return null;
    try {
        const response = await fetch(`${API_BASE_URL}/profile/details`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) return null;
        return await response.json();
    } catch (err) {
        return null;
    }
}
async function updateAuthUI() {
    const profile = await getUserProfile();
    if (profile && profile.name) {
        showProfileDropdown(profile);
    } else {
        showAuthButtons();
    }
}

async function fetchNotifications() {
    const token = localStorage.getItem('token') || getCookie('token');
    if (!token) return [];
    try {
        const res = await fetch(`${API_BASE_URL}/notifications`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.status !== 200) return [];
        return await res.json();
    } catch {
        return [];
    }
}

function renderNotifications(notifications) {
    const dropdown = document.getElementById('notification-dropdown');
    const countSpan = document.getElementById('notification-count');
    const unread = notifications.filter(n => !n.read);

    if (unread.length > 0) {
        countSpan.style.display = '';
        countSpan.textContent = unread.length;
    } else {
        countSpan.style.display = 'none';
    }

    if (notifications.length === 0) {
        dropdown.innerHTML = `<div class="notification-empty">No notifications</div>`;
        return;
    }

    dropdown.innerHTML = notifications.map(n => `
        <div class="notification-item${n.read ? '' : ' unread'}" data-id="${n.ID || n.id}">
            <div>${n.Message || n.message}</div>
            <div style="font-size:12px;color:#888;">${(new Date(n.CreatedAt || n.created_at)).toLocaleString()}</div>
        </div>
    `).join('');
}

async function markNotificationRead(notificationId) {
    const token = localStorage.getItem('token') || getCookie('token');
    if (!token) return;
    await fetch(`${API_BASE_URL}/notifications/mark-read`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ id: Number(notificationId) })
    });
}

async function setupNotificationSystem() {
    const bell = document.getElementById('notification-bell');
    const dropdown = document.getElementById('notification-dropdown');
    const token = localStorage.getItem('token') || getCookie('token');
    if (token) {
        bell.style.display = 'inline-block';
        // Poll and show notifications
        async function poll() {
            const notifications = await fetchNotifications();
            renderNotifications(notifications);
        }
        poll();
        setInterval(poll, 20000);

        // Dropdown toggle
        bell.onclick = function(e) {
            e.stopPropagation();
            dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
        };

        // Mark as read on click
        dropdown.onclick = async function(e) {
            const item = e.target.closest('.notification-item');
            if (item && item.dataset.id) {
                await markNotificationRead(item.dataset.id);
                item.classList.remove('unread');
            }
        };

        // Hide dropdown on click outside
        document.addEventListener('click', function(e) {
            if (!bell.contains(e.target) && !dropdown.contains(e.target)) {
                dropdown.style.display = 'none';
            }
        });
    } else {
        bell.style.display = 'none';
    }
}
document.addEventListener('DOMContentLoaded', async () => {
    fetchAndDisplayServices();
    await updateAuthUI();
    await checkAuthStatus();
    await setupNotificationSystem();
   
    document.getElementById('profile-icon')?.addEventListener('click', function(e) {
        e.preventDefault();
        document.getElementById('auth-dropdown')?.classList.toggle('show');
    });

    document.addEventListener('click', function(e) {
        if (!e.target.closest('.profile-dropdown')) {
            document.getElementById('auth-dropdown')?.classList.remove('show');
        }
    });

 
    document.getElementById('google-login')?.addEventListener('click', async function(e) {
        e.preventDefault();
        const token = localStorage.getItem('token') || getCookie('token');
        if (!token) {
            window.location.href = `${API_BASE_URL}/auth/google/login`;
            return;
        }
        const profile = await getUserProfile();
        if (!profile || !profile.role) {
            window.location.href = 'onboarding.html';
            return;
        }
        if (profile.role === 'Provider' && profile.profile?.status === 'Approved') {
            window.location.href = 'dashboard_provider.html';
        } else if (profile.role === 'Admin') {
            window.location.href = 'dashboard_admin.html';
        } else if (profile.role === 'Customer') {
            window.location.href = 'dashboard_customer.html';
        } else if (profile.role === 'Provider' && profile.status !== 'Approved') {
            window.location.href = 'application_status.html';
        }
    });


    document.getElementById('register-provider-btn')?.addEventListener('click', function(e) {
        e.preventDefault();
        window.location.href = `${API_BASE_URL}/auth/google/login?next=/frontend/html/onboarding_provider.html`;
    });


    document.getElementById('register-admin-btn')?.addEventListener('click', function(e) {
        e.preventDefault();
        window.location.href = `${API_BASE_URL}/auth/google/login?next=/frontend/html/onboarding_admin.html`;
    });

    document.getElementById('logout-btn')?.addEventListener('click', function(e) {
        e.preventDefault();
        localStorage.removeItem('token');
        document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        document.getElementById('dashboard-link').style.display = 'none';
        window.location.reload();
    });
});
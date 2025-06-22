const API_BASE_URL = 'http://localhost:3000';

// Cookie Helper
function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
}

function getToken() {
    return localStorage.getItem('token') || getCookie('token');
}

let userIsBlocked = false;

function blockScreen() {
    document.body.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#f8fafc;">
            <div style="background:#fff;padding:2.5em 2em;border-radius:12px;box-shadow:0 2px 24px #0002;text-align:center;">
                <h2 style="color:#ef4444;margin-bottom:1em;">Account Blocked</h2>
                <p style="color:#374151;font-size:1.1em;margin-bottom:2em;">Your account has been blocked by the admin. You cannot access provider features.</p>
                <a href="./index.html" class="btn btn-primary" style="text-decoration:none;">Go to Home</a>
            </div>
        </div>
    `;
}

async function fetchProviderProfileAndBlock() {
    const token = getToken();
    if (!token) {
        blockScreen();
        return false;
    }
    try {
        const res = await fetch(`${API_BASE_URL}/profile/details`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) {
            blockScreen();
            return false;
        }
        const data = await res.json();
        userIsBlocked = (data.blocked === true || data.blocked === 1);
        if (userIsBlocked) {
            blockScreen();
            return false;
        }
        // Set nav user name and email if needed
        if (data.name) {
            const navUserName = document.querySelector('.user-name');
            if (navUserName) navUserName.textContent = data.name;
        }
        if (data.email) {
            const userEmail = document.querySelector('.user-email');
            if (userEmail) userEmail.textContent = data.email;
        }
        const userInfo = document.getElementById('user-info');
        if (userInfo) userInfo.style.display = 'block';
        const googleLogin = document.getElementById('google-login');
        if (googleLogin) googleLogin.style.display = 'none';
        return true;
    } catch (err) {
        blockScreen();
        return false;
    }
}

// ---- Service Management ----
async function fetchServices() {
    if (userIsBlocked) return;
    const token = getToken();
    const container = document.getElementById('provider-services');
    if (!container) return;
    container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div>Loading your services...</div>';
    try {
        const res = await fetch(`${API_BASE_URL}/services/provider`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to fetch services');
        const data = await res.json();
        container.innerHTML = '';
        if (Array.isArray(data) && data.length) {
            data.forEach(service => {
                const id = service.id || service.ID;
                const card = document.createElement('div');
                card.className = 'dashboard-card service-card';
                card.innerHTML = `
                    <div><strong>${service.name || service.Name}</strong></div>
                    <div>${service.description || service.Description || ""}</div>
                    <div>₹${service.price || service.Price}</div>
                    <div><em>Category:</em> ${service.category || service.Category || ""}</div>
                    <div class="service-actions">
                        <button class="btn btn-outline edit-service-btn" data-id="${id}" ${userIsBlocked ? 'disabled' : ''}>Edit</button>
                        <button class="btn btn-danger delete-service-btn" data-id="${id}" ${userIsBlocked ? 'disabled' : ''}>Delete</button>
                    </div>
                `;
                container.appendChild(card);
            });
            if (!userIsBlocked) setupServiceActions(data);
        } else {
            container.innerHTML = '<em>No services found.</em>';
        }
    } catch (err) {
        container.innerHTML = '<div class="error-message">Error loading services.</div>';
    }
}

function setupServiceActions(services) {
    document.querySelectorAll('.edit-service-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            if (userIsBlocked) return;
            const id = this.getAttribute('data-id');
            const service = services.find(s => String((s.id || s.ID)) === String(id));
            if (!service) return;
            document.getElementById('service-id').value = service.id || service.ID || '';
            document.getElementById('service-name').value = service.name || service.Name || '';
            document.getElementById('service-description').value = service.description || service.Description || '';
            document.getElementById('service-price').value = service.price || service.Price || '';
            document.getElementById('service-category').value = service.category || service.Category || '';
            document.getElementById('service-image-url').value = service.image_url || service.ImageURL || '';
            document.getElementById('service-form-container').style.display = '';
        });
    });
    document.querySelectorAll('.delete-service-btn').forEach(btn => {
        btn.addEventListener('click', async function() {
            if (userIsBlocked) return;
            const id = this.getAttribute('data-id');
            if (!id || !confirm('Delete this service?')) return;
            const token = getToken();
            try {
                const res = await fetch(`${API_BASE_URL}/services/${id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!res.ok) throw new Error('Failed to delete service');
                await fetchServices();
            } catch (err) {
                alert('Error deleting service');
            }
        });
    });
}

// ---- Service Form ----
const serviceForm = document.getElementById('service-form');
if (serviceForm) {
    serviceForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        if (userIsBlocked) {
            alert('Your account is blocked. Action not allowed.');
            return;
        }
        const id = document.getElementById('service-id').value;
        const name = document.getElementById('service-name').value.trim();
        const description = document.getElementById('service-description').value.trim();
        const price = document.getElementById('service-price').value;
        const category = document.getElementById('service-category').value.trim();
        const image_url = document.getElementById('service-image-url').value.trim();
        const token = getToken();
        const body = { name, description, price, category, image_url };
        try {
            let url = `${API_BASE_URL}/services`;
            let method = 'POST';
            if (id) {
                url = `${API_BASE_URL}/services/${id}`;
                method = 'PUT';
            }
            const res = await fetch(url, {
                method,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });
            if (!res.ok) throw new Error('Failed to save service');
            document.getElementById('service-form-container').style.display = 'none';
            await fetchServices();
        } catch (err) {
            alert('Error saving service');
        }
    });
}
document.getElementById('show-create-form')?.addEventListener('click', function() {
    if (userIsBlocked) {
        alert('Your account is blocked. Action not allowed.');
        return;
    }
    document.getElementById('service-id').value = '';
    document.getElementById('service-name').value = '';
    document.getElementById('service-description').value = '';
    document.getElementById('service-price').value = '';
    document.getElementById('service-category').value = '';
    document.getElementById('service-image-url').value = '';
    document.getElementById('service-form-container').style.display = '';
});
document.getElementById('cancel-form')?.addEventListener('click', function() {
    document.getElementById('service-form-container').style.display = 'none';
});

// ---- Bookings ----
async function fetchBookings() {
    if (userIsBlocked) return;
    const token = getToken();
    const container = document.getElementById('provider-bookings');
    if (!container) return;
    container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div>Loading bookings...</div>';
    try {
        const res = await fetch(`${API_BASE_URL}/booking/provider`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to fetch bookings');
        const data = await res.json();
        container.innerHTML = '';
        if (Array.isArray(data) && data.length) {
            data.forEach(b => {
                const bookingId = b.id || b.ID;
                const card = document.createElement('div');
                card.className = 'dashboard-card booking-card';
                card.innerHTML = `
                    <div><strong>${b.serviceName || b.service || "Service"}</strong></div>
                    <div><em>Customer:</em> ${b.customerName || b.customer || ""}</div>
                    <div>Date: ${b.booking_time ? new Date(b.booking_time).toLocaleString() : "Unknown"}</div>
                    <div>Status: ${b.status || "Pending"}</div>
                `;
                container.appendChild(card);
            });
        } else {
            container.innerHTML = '<em>No bookings found.</em>';
        }
    } catch (err) {
        container.innerHTML = '<div class="error-message">Error loading bookings.</div>';
    }
}

// ---- Reviews ----
async function fetchReviews() {
    if (userIsBlocked) return;
    const token = getToken();
    const container = document.getElementById('provider-reviews-container');
    if (!container) return;
    container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div>Loading reviews...</div>';
    try {
        const res = await fetch(`${API_BASE_URL}/reviews/provider`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to fetch reviews');
        const data = await res.json();
        container.innerHTML = '';
        if (Array.isArray(data) && data.length) {
            data.forEach(r => {
                const card = document.createElement('div');
                card.className = 'dashboard-card review-card';
                card.innerHTML = `
                    <div><strong>${r.serviceName || r.service || "Service"}</strong></div>
                    <div>Rating: <span style="color:#FFD700">${r.rating || r.Rating} ★</span></div>
                    <div>${r.comment || r.Comment || ""}</div>
                    <div><em>By:</em> ${r.customerName || r.customer || ""}</div>
                `;
                container.appendChild(card);
            });
        } else {
            container.innerHTML = '<em>No reviews found.</em>';
        }
    } catch (err) {
        container.innerHTML = '<div class="error-message">Error loading reviews.</div>';
    }
}

// ---- Initialization ----
document.addEventListener('DOMContentLoaded', async () => {
    if (!await fetchProviderProfileAndBlock()) return;
    await fetchServices();
    await fetchBookings();
    await fetchReviews();

    // Profile dropdown + hamburger
    document.querySelector('.hamburger')?.addEventListener('click', function() {
        document.querySelector('.nav-links')?.classList.toggle('active');
    });
    document.getElementById('profile-icon')?.addEventListener('click', function(e) {
        e.preventDefault();
        document.getElementById('auth-dropdown')?.classList.toggle('show');
    });
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.profile-dropdown')) {
            document.getElementById('auth-dropdown')?.classList.remove('show');
        }
    });
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function() {
            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            this.classList.add('active');
        });
    });
    // Logout
    document.getElementById('logout-btn')?.addEventListener('click', function(e) {
        e.preventDefault();
        localStorage.removeItem('token');
        document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        window.location.reload();
    });
    // Google OAuth handler
    document.getElementById('google-login')?.addEventListener('click', function(e) {
        e.preventDefault();
        window.location.href = `${API_BASE_URL}/auth/google/login`;
    });
});
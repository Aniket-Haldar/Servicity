const API_BASE_URL = 'http://localhost:3000';

function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
}

function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe.toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
function formatDate(dateString) {
    if (!dateString) return "Unknown";
    try {
        const date = new Date(dateString);
        return isNaN(date.getTime()) ? "Invalid Date" : date.toLocaleString();
    } catch (e) {
        return "Unknown";
    }
}

async function showAuthUI() {
    const token = getCookie('token');
    const userInfo = document.getElementById('user-info');
    const googleLogin = document.getElementById('google-login');
    const userNameSpan = document.querySelector('.user-name');
    const userEmailDiv = document.querySelector('.user-email');
    if (!token) {
        if (userInfo) userInfo.style.display = "none";
        if (googleLogin) googleLogin.style.display = "block";
        if (userNameSpan) userNameSpan.textContent = "";
        if (userEmailDiv) userEmailDiv.textContent = "";
        return;
    }
    try {
        const res = await fetch(`${API_BASE_URL}/profile/details`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error("Not logged in");
        const data = await res.json();
        if (googleLogin) googleLogin.style.display = "none";
        if (userInfo) userInfo.style.display = "block";
        if (userNameSpan) userNameSpan.textContent = data.name || data.Name || "";
        if (userEmailDiv) userEmailDiv.textContent = data.email || data.Email || "";
    } catch {
        if (userInfo) userInfo.style.display = "none";
        if (googleLogin) googleLogin.style.display = "block";
        if (userNameSpan) userNameSpan.textContent = "";
        if (userEmailDiv) userEmailDiv.textContent = "";
    }
}

function setupDropdownLogic() {
    document.getElementById('profile-icon')?.addEventListener('click', function(e) {
        e.preventDefault();
        document.getElementById('auth-dropdown')?.classList.toggle('show');
    });
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.profile-dropdown')) {
            document.getElementById('auth-dropdown')?.classList.remove('show');
        }
    });
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            document.getElementById('auth-dropdown')?.classList.remove('show');
        }
    });
    document.getElementById('google-login')?.addEventListener('click', function(e) {
        e.preventDefault();
        window.location.href = `${API_BASE_URL}/auth/google/login`;
    });
    document.getElementById('logout-btn')?.addEventListener('click', function(e) {
        e.preventDefault();
        localStorage.removeItem('token');
        document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        window.location.href = "index.html";
    });
}

// Provider Dashboard
class ProviderDashboard {
    constructor() {
        this.providerId = null;
        this.services = [];
        this.init();
    }

    async init() {
        await showAuthUI();
        setupDropdownLogic();
        await this.fetchProviderId();
        await Promise.all([
            this.fetchProviderServices(),
            this.fetchProviderBookings()
        ]);
        this.setupEventListeners();
    }

    async fetchProviderId() {
        const token = getCookie('token');
        if (!token) {
            window.location.href = '/login';
            return;
        }
        try {
            const res = await fetch(`${API_BASE_URL}/profile/details`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Failed to fetch profile');
            const data = await res.json();
            // The providerId comes from the nested profile object (see your screenshot)
            if (data.profile && (data.profile.ID || data.profile.id || data.profile.UserID)) {
                this.providerId = data.profile.UserID;
            } else {
                this.providerId = data.id || data.ID || data.user_id || data.UserID;
            }
            if ((data.role || data.Role) !== 'Provider') {
                alert('You must be a provider to access this dashboard.');
                window.location.href = '/';
                return;
            }
        } catch (error) {
            alert("Session expired or invalid. Please log in again.");
            window.location.href = '/login';
        }
    }

    async fetchProviderServices() {
        if (!this.providerId) return;
        try {
            const res = await fetch(`${API_BASE_URL}/services`);
            if (!res.ok) throw new Error('Failed to fetch services');
            let services = await res.json();
            services = services.map(s => ({
                id: s.id || s.ID,
                name: s.name || s.Name,
                description: s.description || s.Description,
                price: s.price || s.Price,
                category: s.category || s.Category,
                image_url: s.image_url || s.ImageURL,
                provider_id: s.provider_id || s.ProviderID,
            }));
            this.services = services.filter(s => String(s.provider_id) === String(this.providerId));
            this.renderProviderServices();
        } catch (error) {
            document.getElementById('provider-services').innerHTML =
                '<div class="error">Failed to load services. Please refresh.</div>';
        }
    }

    renderProviderServices() {
        const container = document.getElementById('provider-services');
        if (!container) return;
        container.innerHTML = '';
        if (!this.services.length) {
            container.innerHTML = '<p class="no-data">No services yet. Create one!</p>';
            return;
        }
        this.services.forEach(service => {
            const card = document.createElement('div');
            card.className = 'service-card';
            card.innerHTML = `
                <img src="${escapeHtml(service.image_url || 'images/default-service.jpeg')}"
                     class="service-thumb"
                     alt="${escapeHtml(service.name)}">
                <div class="service-info">
                    <h4>${escapeHtml(service.name)}</h4>
                    <div>Category: <b>${escapeHtml(service.category)}</b></div>
                    <div>₹${escapeHtml(service.price)}</div>
                    <div class="service-description">${escapeHtml(service.description || '')}</div>
                </div>
                <div class="service-actions">
                    <button class="btn btn-success" data-action="edit">Edit</button>
                    <button class="btn btn-secondary" data-action="delete">Delete</button>
                </div>
            `;
            card.querySelector('[data-action="edit"]').onclick = () => this.showForm(true, service);
            card.querySelector('[data-action="delete"]').onclick = () => this.deleteService(service.id);
            container.appendChild(card);
        });
    }

    async createOrEditService(e) {
        e.preventDefault();
        const token = getCookie('token');
        if (!token) {
            alert('Please log in to perform this action.');
            return;
        }
        const id = document.getElementById('service-id').value;
        const formData = {
            name: document.getElementById('service-name').value,
            Name: document.getElementById('service-name').value,
            description: document.getElementById('service-description').value,
            Description: document.getElementById('service-description').value,
            price: parseFloat(document.getElementById('service-price').value),
            Price: parseFloat(document.getElementById('service-price').value),
            category: document.getElementById('service-category').value,
            Category: document.getElementById('service-category').value,
            image_url: document.getElementById('service-image-url').value,
            ImageURL: document.getElementById('service-image-url').value,
            provider_id: this.providerId,
            ProviderID: this.providerId,
        };
        if (!formData.name || !formData.price || !formData.category) {
            alert('Please fill in all required fields');
            return;
        }
        try {
            let url, method;
            if (id) {
                url = `${API_BASE_URL}/services/${id}`;
                method = 'PUT';
            } else {
                url = `${API_BASE_URL}/services`;
                method = 'POST';
            }
            const res = await fetch(url, {
                method,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });
            if (!res.ok) {
                const error = await res.text();
                throw new Error(error || 'Failed to save service');
            }
            const service = await res.json();
            const mappedService = {
                id: service.id || service.ID,
                name: service.name || service.Name,
                description: service.description || service.Description,
                price: service.price || service.Price,
                category: service.category || service.Category,
                image_url: service.image_url || service.ImageURL,
                provider_id: service.provider_id || service.ProviderID,
            };
            if (id) {
                const idx = this.services.findIndex(s => String(s.id) === String(mappedService.id));
                if (idx !== -1) this.services[idx] = mappedService;
            } else {
                this.services.unshift(mappedService);
            }
            this.hideForm();
            this.renderProviderServices();
        } catch (error) {
            alert(`Failed to save service: ${error.message}`);
        }
    }

    async deleteService(id) {
        if (!confirm('Are you sure you want to delete this service?')) return;
        const token = getCookie('token');
        if (!token) {
            alert('Please log in to perform this action.');
            return;
        }
        try {
            const res = await fetch(`${API_BASE_URL}/services/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) {
                const error = await res.text();
                throw new Error(error || 'Failed to delete service');
            }
            this.services = this.services.filter(s => String(s.id) !== String(id));
            this.renderProviderServices();
        } catch (error) {
            alert(`Failed to delete service: ${error.message}`);
        }
    }

    showForm(edit = false, service = {}) {
        const formContainer = document.getElementById('service-form-container');
        if (!formContainer) return;
        formContainer.style.display = 'block';
        document.getElementById('service-id').value = edit ? (service.id || service.ID) : '';
        document.getElementById('service-name').value = edit ? (service.name || service.Name) : '';
        document.getElementById('service-description').value = edit ? (service.description || service.Description) : '';
        document.getElementById('service-price').value = edit ? (service.price || service.Price) : '';
        document.getElementById('service-category').value = edit ? (service.category || service.Category) : '';
        document.getElementById('service-image-url').value = edit ? (service.image_url || service.ImageURL) : '';
    }

    hideForm() {
        const formContainer = document.getElementById('service-form-container');
        if (!formContainer) return;
        formContainer.style.display = 'none';
        document.getElementById('service-form').reset();
    }

    async fetchProviderBookings() {
        if (!this.providerId) return;
        try {
            const res = await fetch(`${API_BASE_URL}/booking`);
            if (!res.ok) throw new Error('Failed to fetch bookings');
            let bookings = await res.json();
            bookings = bookings.map(b => ({
                id: b.id || b.ID,
                service_id: b.service_id || b.ServiceID,
                provider_id: b.provider_id || b.ProviderID,
                booking_time: b.booking_time || b.BookingTime,
                status: b.status || b.Status,
                email: b.email || b.Email,
                phone: b.phone || b.Phone,
                address: b.address || b.Address,
                special_notes: b.special_notes || b.SpecialNotes
            }));
            const ownBookings = bookings.filter(b => String(b.provider_id) === String(this.providerId));
            this.renderProviderBookings(ownBookings);
        } catch (error) {
            document.getElementById('provider-bookings').innerHTML =
                '<div class="error">Failed to load bookings. Please refresh.</div>';
        }
    }

    renderProviderBookings(bookings) {
        const container = document.getElementById('provider-bookings');
        if (!container) return;
        container.innerHTML = '';
        if (!bookings.length) {
            container.innerHTML = '<p class="no-data">No bookings found yet.</p>';
            return;
        }
        bookings.forEach(booking => {
            const card = document.createElement('div');
            card.className = 'booking-card';
            card.innerHTML = `
                <div class="booking-info">
                    <div><b>${escapeHtml(booking.email || 'Customer')}</b> booked Service #${escapeHtml(booking.service_id)}</div>
                    <div>Date: ${formatDate(booking.booking_time)}</div>
                    <div>Status: <span class="status-${escapeHtml(booking.status)}">${escapeHtml(booking.status)}</span></div>
                    ${booking.address ? `<div>Address: ${escapeHtml(booking.address)}</div>` : ''}
                    ${booking.special_notes ? `<div>Notes: ${escapeHtml(booking.special_notes)}</div>` : ''}
                </div>
                <div class="booking-actions"></div>
            `;
            const actions = card.querySelector('.booking-actions');
            if (booking.status === 'pending') {
                const acceptBtn = document.createElement('button');
                acceptBtn.className = 'btn btn-success';
                acceptBtn.textContent = 'Accept';
                acceptBtn.onclick = () => this.respondBooking(booking.id, 'accepted');
                const rejectBtn = document.createElement('button');
                rejectBtn.className = 'btn btn-secondary';
                rejectBtn.textContent = 'Reject';
                rejectBtn.onclick = () => this.respondBooking(booking.id, 'rejected');
                actions.appendChild(acceptBtn);
                actions.appendChild(rejectBtn);
            }
            if (booking.status === 'accepted') {
                const completeBtn = document.createElement('button');
                completeBtn.className = 'btn btn-complete';
                completeBtn.textContent = 'Mark Completed';
                completeBtn.onclick = () => this.respondBooking(booking.id, 'completed');
                actions.appendChild(completeBtn);
            }
            container.appendChild(card);
        });
    }

    async respondBooking(bookingId, status) {
        const token = getCookie('token');
        if (!token) {
            alert('Please log in to perform this action.');
            return;
        }
        try {
            const res = await fetch(`${API_BASE_URL}/booking/${bookingId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status, Status: status })
            });
            if (!res.ok) {
                const error = await res.text();
                throw new Error(error || 'Failed to update booking');
            }
            await this.fetchProviderBookings();
        } catch (error) {
            alert(`Failed to update booking: ${error.message}`);
        }
    }

    setupEventListeners() {
        document.getElementById('show-create-form')?.addEventListener('click', () => this.showForm(false));
        document.getElementById('cancel-form')?.addEventListener('click', () => this.hideForm());
        document.getElementById('service-form')?.addEventListener('submit', (e) => this.createOrEditService(e));
    }
}

// Hamburger menu (mobile)
document.querySelector('.hamburger')?.addEventListener('click', function() {
    document.getElementById('nav-links')?.classList.toggle('active');
});

// Initialize the dashboard
document.addEventListener('DOMContentLoaded', () => {
    new ProviderDashboard();
    showAuthUI();
    setupDropdownLogic();
});
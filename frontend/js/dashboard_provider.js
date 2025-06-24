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
function renderStars(rating) {
    rating = Number(rating) || 0;
    let stars = '';
    for (let i = 1; i <= 5; i++) {
        stars += `<span style="color:#f1c40f">${i <= rating ? '★' : '☆'}</span>`;
    }
    return stars;
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

        if (data.blocked === true || data.blocked === 1) {
            showBlockedScreen();
            throw new Error("Blocked");
        }
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
async function renderProviderDetails() {
    const token = getCookie('token');
    if (!token) return;
    try {
        const res = await fetch(`${API_BASE_URL}/profile/details`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) return;
        const data = await res.json();
        const profile = data.profile || {};
        const box = document.getElementById('provider-details');
        if (!box) return;

        box.innerHTML = `
            <div class="profile-row"><label>Name:</label> <span id="profile-name">${escapeHtml(data.name || "")}</span></div>
            <div class="profile-row"><label>Email:</label> <span id="profile-email">${escapeHtml(data.email || "")}</span></div>
            <div class="profile-row"><label>Profession:</label> <span id="profile-profession">${escapeHtml(profile.Profession || "")}</span></div>
            <div class="profile-row"><label>Pincode:</label> <span id="profile-pincode">${escapeHtml(profile.Pincode || "")}</span></div>
            <div class="profile-row"><label>Available Timings:</label> <span id="profile-timings">${escapeHtml(profile.AvailableTimings || "")}</span></div>
            <div class="profile-row"><label>Status:</label> <span>${data.blocked ? '<span style="color:#e74c3c">Blocked</span>' : '<span style="color:#27ae60">Active</span>'}</span></div>
            <button class="btn btn-primary" id="edit-profile-btn"><i class="fa fa-pen"></i> Edit</button>
            <form id="edit-profile-form" style="display:none;margin-top:1.5em;">
                <div class="profile-row"><label>Name:</label> <input type="text" id="edit-profile-name" required></div>
                <div class="profile-row"><label>Email:</label> <input type="email" id="edit-profile-email" required></div>
                <div class="profile-row"><label>Profession:</label> <input type="text" id="edit-profile-profession" required></div>
                <div class="profile-row"><label>Pincode:</label> <input type="text" id="edit-profile-pincode" required></div>
                <div class="profile-row"><label>Available Timings:</label> <input type="text" id="edit-profile-timings" required></div>
                <div class="form-actions" style="margin-top:1.2em;display:flex;gap:1em;">
                    <button type="submit" class="btn btn-success">Save</button>
                    <button type="button" class="btn btn-secondary" id="cancel-edit-profile">Cancel</button>
                </div>
            </form>
        `;

        document.getElementById('edit-profile-name').value = data.name || "";
        document.getElementById('edit-profile-email').value = data.email || "";
        document.getElementById('edit-profile-profession').value = profile.Profession || "";
        document.getElementById('edit-profile-pincode').value = profile.Pincode || "";
        document.getElementById('edit-profile-timings').value = profile.AvailableTimings || "";

        document.getElementById('edit-profile-btn').onclick = () => {
            document.getElementById('edit-profile-form').style.display = 'block';
            document.getElementById('edit-profile-btn').style.display = 'none';
        };
        document.getElementById('cancel-edit-profile').onclick = () => {
            document.getElementById('edit-profile-form').style.display = 'none';
            document.getElementById('edit-profile-btn').style.display = '';
        };
        document.getElementById('edit-profile-form').onsubmit = async function(e) {
            e.preventDefault();

     
            const updatedData = {
                Name: document.getElementById('edit-profile-name').value,
                Email: document.getElementById('edit-profile-email').value,
                Role: "Provider",
                Profession: document.getElementById('edit-profile-profession').value,
                Pincode: document.getElementById('edit-profile-pincode').value,
                AvailableTimings: document.getElementById('edit-profile-timings').value,
                Pricing: 0
            };

            try {
                const providerId = profile.ID || profile.Id || profile.id || data.id || data.ID || data.UserID;
                const res = await fetch(`${API_BASE_URL}/profile/${providerId}`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(updatedData)
                });
                if (!res.ok) {
                    alert("Failed to update profile.");
                    return;
                }
                renderProviderDetails();
            } catch (err) {
                alert("Error updating profile.");
            }
        };
    } catch (e) {}
}
function setupDropdownLogic() {
    document.getElementById('profile-icon')?.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
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


function showBlockedScreen() {
    document.body.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#f8fafc;">
            <div style="background:#fff;padding:2.5em 2em;border-radius:12px;box-shadow:0 2px 24px #0002;text-align:center;">
                <h2 style="color:#ef4444;margin-bottom:1em;">Account Blocked</h2>
                <p style="color:#374151;font-size:1.1em;margin-bottom:2em;">
                    Your account has been blocked by the admin.<br>
                    You cannot access provider features.
                </p>
                <a href="./index.html" class="btn btn-primary" style="text-decoration:none;">Go to Home</a>
            </div>
        </div>
    `;
}

class ProviderDashboard {
    constructor() {
        this.providerId = null;
        this.services = [];
        this.init();
    }

    async init() {

        const token = getCookie('token');
        if (token) {
            try {
                const res = await fetch(`${API_BASE_URL}/profile/details`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    if (data.blocked === true || data.blocked === 1) {
                        showBlockedScreen();
                        return;
                    }
                }
            } catch {}
        }
        await showAuthUI();
        setupDropdownLogic();
        await this.fetchProviderId();
        await Promise.all([
            this.fetchProviderServices(),
            this.fetchProviderBookings()
        ]);
        this.setupEventListeners();

        renderProviderReviews(this.providerId, 'provider-reviews-container');
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

            if (data.blocked === true || data.blocked === 1) {
                showBlockedScreen();
                throw new Error("Blocked");
            }
    
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
    const token = getCookie('token');
    if (!this.providerId) return;
    try {
        const res = await fetch(`${API_BASE_URL}/booking/provider`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
        });
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
            special_notes: b.special_notes || b.SpecialNotes,
            service: b.Service || b.service 
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
                <div><b>${escapeHtml(booking.email || 'Customer')}</b> booked ${escapeHtml(booking.service?.name || booking.service?.Name || 'Service')}</div>
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



async function fetchProviderReviews(providerId) {
    if (!providerId) return [];
    try {
        const res = await fetch(`${API_BASE_URL}/reviews/provider?provider_id=${providerId}`);
        if (!res.ok) return [];
        let reviews = await res.json();
        reviews = Array.isArray(reviews) ? reviews : [reviews];
        return reviews.map(r => ({
            id: r.id ?? r.ID,
            rating: r.rating ?? r.Rating,
            comment: r.comment ?? r.Comment ?? '',
            createdAt: r.createdAt ?? r.CreatedAt,
            booking_id: r.booking_id ?? r.BookingID ?? r.bookingId,
            customer_id: r.customer_id ?? r.CustomerID ?? r.customerId,
            service_id: r.service_id ?? r.ServiceID ?? r.serviceId,
            customer: r.Customer ? (r.Customer.name || r.Customer.Name || 'Customer') : (r.customer_name || 'Customer'),
            service: r.Service ? (r.Service.name || r.Service.Name || 'Service') : (r.service_name || 'Service'),
        }));
    } catch (e) {
        return [];
    }
}

function renderProviderReviews(providerId, containerId = 'provider-reviews-container') {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div>Loading your reviews...</div>';

    fetchProviderReviews(providerId).then(reviews => {
        if (!reviews.length) {
            container.innerHTML = '<p class="no-data">No reviews yet for your services.</p>';
            return;
        }
        container.innerHTML = '';
        reviews.forEach(review => {
            const card = document.createElement('div');
            card.className = 'review-card';
            card.innerHTML = `
                <div class="review-header">
                    <span class="review-stars">${renderStars(review.rating)}</span>
                    <span class="review-date">${formatDate(review.createdAt)}</span>
                </div>
                <div class="review-body">
                    <div class="review-service"><b>Service:</b> ${escapeHtml(review.service)}</div>
                    <div class="review-comment"><div>Comment: </div>${escapeHtml(review.comment)}</div>
                </div>
                <div class="review-footer">
                    <span class="review-customer"><b>By:</b> ${escapeHtml(review.customer)}</span>
                </div>
            `;
            container.appendChild(card);
        });
    });
}
async function fetchReceivedAdminMessages() {
    const token = getCookie('token');
    if (!token) return [];
    const res = await fetch(`${API_BASE_URL}/messages/received`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) return [];
    const messages = await res.json();
    return Array.isArray(messages) ? messages : [];
}

function renderReceivedAdminMessages() {
    const container = document.getElementById('admin-messages-list');
    if (!container) return;

    container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div>Loading admin messages...</div>';

    fetchReceivedAdminMessages().then(messages => {
        if (!messages.length) {
            container.innerHTML = '<div class="empty-message">No messages from admin.</div>';
            return;
        }
        container.innerHTML = '';
        messages.forEach(msg => {
            const msgDiv = document.createElement('div');
            msgDiv.className = 'admin-message-item';
            msgDiv.innerHTML = `
                <div style="font-weight:bold; margin-bottom:0.25em;">${escapeHtml(msg.title || "Admin Message")}</div>
                <div style="margin-bottom:0.5em; color:#334155;">
                    ${escapeHtml(msg.content || msg.Content)}
                </div>
                <div style="font-size:0.9em;color:#888;">${msg.created_at ? new Date(msg.created_at).toLocaleString() : ''}</div>
                <hr>
            `;
            container.appendChild(msgDiv);
        });
    });
}

document.querySelector('.hamburger')?.addEventListener('click', function() {
    document.getElementById('nav-links')?.classList.toggle('active');
});

document.addEventListener('DOMContentLoaded', function() {
    document.querySelector('.hamburger')?.addEventListener('click', function() {
        document.getElementById('nav-links')?.classList.toggle('active');
    });

    document.querySelectorAll('.sidebar-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.sidebar-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            document.querySelectorAll('.dashboard-section').forEach(sec => sec.classList.remove('active'));
            const sectionId = this.getAttribute('data-section');
            document.getElementById(sectionId).classList.add('active');
            if (sectionId === 'dashboard-home') renderProviderDetails();
        });
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
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            document.getElementById('auth-dropdown')?.classList.remove('show');
        }
    });


    new ProviderDashboard();
    setupDropdownLogic();
    showAuthUI();
    renderReceivedAdminMessages();
    renderProviderDetails(); 
});
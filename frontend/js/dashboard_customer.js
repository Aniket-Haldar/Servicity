const API_BASE_URL = 'http://localhost:3000';

function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
}
function getToken() {
    return localStorage.getItem('token') || getCookie('token');
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

function showBlockedScreen() {
    document.body.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#f8fafc;">
            <div style="background:#fff;padding:2.5em 2em;border-radius:12px;box-shadow:0 2px 24px #0002;text-align:center;">
                <h2 style="color:#ef4444;margin-bottom:1em;">Account Blocked</h2>
                <p style="color:#374151;font-size:1.1em;margin-bottom:2em;">
                    Your account has been blocked by the admin.<br>
                    You cannot access customer features.
                </p>
                <a href="./index.html" class="btn btn-primary" style="text-decoration:none;">Go to Home</a>
            </div>
        </div>
    `;
}

async function showAuthUI() {
    const token = getToken();
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

function setupSidebarTabs() {
    document.querySelectorAll('.sidebar-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.sidebar-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            document.querySelectorAll('.dashboard-section').forEach(sec => sec.classList.remove('active'));
            const sectionId = this.getAttribute('data-section');
            document.getElementById(sectionId).classList.add('active');
            if (sectionId === 'dashboard-home') fetchAndDisplayProfile();
            if (sectionId === 'bookings') fetchAndDisplayBookings();
            if (sectionId === 'admin-messages-section') renderReceivedAdminMessages();
            if (sectionId === 'provider-messages-section') renderReceivedProviderMessages();
        });
    });
}


let currentProfileId = null;
let userIsBlocked = false;
async function fetchAndDisplayProfile() {
    const profileInfo = document.getElementById('profile-info');
    if (!profileInfo) return;
    profileInfo.innerHTML = `<div class="loading-spinner"><div class="spinner"></div>Loading your profile...</div>`;
    const token = getToken();
    if (!token) {
        profileInfo.innerHTML = '<div class="error-message"><p>Please log in to view your profile.</p></div>';
        return;
    }
    try {
        const url = `${API_BASE_URL}/profile/details`;
        const response = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
        if (!response.ok) throw new Error('Failed to fetch profile');
        const data = await response.json();
        userIsBlocked = (data.blocked === true || data.blocked === 1);
        if (userIsBlocked) {
            showBlockedScreen();
            return;
        }
        currentProfileId = (data.profile && (data.profile.ID || data.profile.id)) || data.id || data.ID;
        const phone = (data.profile && (data.profile.Phone || data.profile.phone)) || data.phone || '';
        const address = (data.profile && (data.profile.Address || data.profile.address)) || data.address || '';

 
        profileInfo.innerHTML = `
            <div class="profile-row"><label>Name:</label> <span>${escapeHtml(data.name || data.fullName || '')}</span></div>
            <div class="profile-row"><label>Email:</label> <span>${escapeHtml(data.email || '')}</span></div>
            <div class="profile-row"><label>Phone:</label> <span>${escapeHtml(phone)}</span></div>
            <div class="profile-row"><label>Address:</label> <span>${escapeHtml(address)}</span></div>
            <button class="btn btn-primary" id="edit-profile-btn" style="margin-top:1.3em" ${userIsBlocked ? 'disabled' : ''}><i class="fa fa-pen"></i> Edit</button>
            <form id="edit-profile-form" style="display:none;margin-top:1.5em;">
                <div class="profile-row"><label>Name:</label> <input type="text" id="edit-profile-name" required></div>
                <div class="profile-row"><label>Email:</label> <input type="email" id="edit-profile-email" required></div>
                <div class="profile-row"><label>Phone:</label> <input type="tel" id="edit-profile-phone" required></div>
                <div class="profile-row"><label>Address:</label> <input type="text" id="edit-profile-address" required></div>
                <div class="form-actions" style="margin-top:1.2em;display:flex;gap:1em;">
                    <button type="submit" class="btn btn-success">Save</button>
                    <button type="button" class="btn btn-secondary" id="cancel-edit-profile">Cancel</button>
                </div>
            </form>
        `;


        document.getElementById('edit-profile-name').value = data.name || data.fullName || '';
        document.getElementById('edit-profile-email').value = data.email || '';
        document.getElementById('edit-profile-phone').value = phone || '';
        document.getElementById('edit-profile-address').value = address || '';

    
        document.getElementById('edit-profile-btn').onclick = () => {
            document.getElementById('edit-profile-form').style.display = 'block';
            document.getElementById('edit-profile-btn').style.display = 'none';
        };

        document.getElementById('cancel-edit-profile').onclick = () => {
            fetchAndDisplayProfile();
        };

        document.getElementById('edit-profile-form').onsubmit = async function(e) {
            e.preventDefault();
            if (userIsBlocked) {
                alert('Your account is blocked. Action not allowed.');
                return;
            }
            const updatedData = {
                name: document.getElementById('edit-profile-name').value,
                email: document.getElementById('edit-profile-email').value,
                phone: document.getElementById('edit-profile-phone').value,
                address: document.getElementById('edit-profile-address').value,
                Role: "Customer"
            };
            try {
                const response = await fetch(`${API_BASE_URL}/profile/${currentProfileId}`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(updatedData)
                });
                if (!response.ok) throw new Error('Failed to update profile');
                fetchAndDisplayProfile();
            } catch (err) {
                alert('Failed to update profile.');
            }
        };
    } catch (error) {
        profileInfo.innerHTML = `<div class="error-message"><p>Error loading profile.<br>${error.message}</p></div>`;
    }
}


async function fetchAndDisplayBookings() {
    const bookingsList = document.getElementById('bookings-list');
    if (!bookingsList) return;
    if (userIsBlocked) {
        bookingsList.innerHTML = `<div class="error-message"><p>Your account is blocked. You cannot view bookings.</p></div>`;
        return;
    }
    bookingsList.innerHTML = `<div class="loading-spinner"><div class="spinner"></div>Loading your bookings...</div>`;
    const token = getToken();
    if (!token) {
        bookingsList.innerHTML = '<div class="error-message"><p>Please log in to view your bookings.</p></div>';
        return;
    }
    try {
        const response = await fetch(`${API_BASE_URL}/booking`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Failed to fetch bookings');
        const data = await response.json();
        bookingsList.innerHTML = '';
        if (Array.isArray(data) && data.length) {
            data.forEach(b => {
                console.log(b);
                const card = document.createElement('div');
                card.className = "booking-card";
                card.innerHTML = `
                    <div class="profile-row"><label>Service:</label> <span>${escapeHtml(b.serviceName || b.service_id || "Service")}</span></div>
                    <div class="profile-row"><label>Date:</label> <span>${formatDate(b.booking_time)}</span></div>
                    <div class="profile-row"><label>Email:</label> <span>${escapeHtml(b.email || '')}</span></div>
                    <div class="profile-row"><label>Phone:</label> <span>${escapeHtml(b.phone || '')}</span></div>
                    <div class="profile-row"><label>Address:</label> <span>${escapeHtml(b.address || '')}</span></div>
                    <div class="profile-row"><label>Status:</label> <span class="status-label">${escapeHtml(b.status || "Pending")}</span></div>
                    <div class="booking-actions">
                        <button class="btn btn-primary edit-booking-btn" data-booking-id="${b.id || b.ID}" ${userIsBlocked ? 'disabled' : ''}>Edit</button>
                        <button class="btn btn-secondary cancel-booking-btn" data-booking-id="${b.id || b.ID}" ${userIsBlocked ? 'disabled' : ''}>Cancel</button>
                    </div>
                `;
                bookingsList.appendChild(card);
            });
            setupBookingActions(data);
        } else {
            bookingsList.innerHTML = '<p class="no-data">No bookings found yet.</p>';
        }
    } catch (error) {
        bookingsList.innerHTML = `<div class="error-message"><p>Error loading bookings.<br>${error.message}</p></div>`;
    }
}
function setupBookingActions(bookings) {
    document.querySelectorAll('.edit-booking-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const bookingId = this.getAttribute('data-booking-id');
            const booking = bookings.find(b => String(b.id || b.ID) === String(bookingId));
            if (booking) {
                document.getElementById('edit-booking-id').value = booking.id || booking.ID;
                document.getElementById('edit-booking-date').value = booking.booking_time ? booking.booking_time.split('T')[0] : '';
                document.getElementById('edit-booking-phone').value = booking.phone || '';
                document.getElementById('edit-booking-address').value = booking.address || '';
                document.getElementById('edit-booking-modal').style.display = 'block';
            }
        });
    });
    document.querySelectorAll('.cancel-booking-btn').forEach(btn => {
        btn.addEventListener('click', async function() {
            const bookingId = this.getAttribute('data-booking-id');
            if (!bookingId) {
                alert('Missing booking id.');
                return;
            }
            if (!confirm('Are you sure you want to cancel this booking?')) return;
            const token = getToken();
            try {
                const response = await fetch(`${API_BASE_URL}/booking/${bookingId}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!response.ok) throw new Error('Failed to cancel booking');
                await fetchAndDisplayBookings();
            } catch (err) {
                alert('Failed to cancel booking.');
            }
        });
    });
}
document.getElementById('close-edit-booking')?.addEventListener('click', () => {
    document.getElementById('edit-booking-modal').style.display = 'none';
});
document.getElementById('edit-booking-form')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    if (userIsBlocked) {
        alert('Your account is blocked. Action not allowed.');
        return;
    }
    const id = document.getElementById('edit-booking-id').value;
    const date = document.getElementById('edit-booking-date').value;
    const phone = document.getElementById('edit-booking-phone').value;
    const address = document.getElementById('edit-booking-address').value;
    const token = getToken();
    try {
        const response = await fetch(`${API_BASE_URL}/booking/${id}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                booking_time: new Date(date).toISOString(),
                phone,
                address
            })
        });
        if (!response.ok) throw new Error('Failed to update booking');
        document.getElementById('edit-booking-modal').style.display = 'none';
        await fetchAndDisplayBookings();
    } catch (err) {
        alert('Failed to update booking.');
    }
});


async function renderReceivedAdminMessages() {
    const container = document.getElementById('admin-messages-list');
    if (!container) return;
    container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div>Loading admin messages...</div>';
    const token = getToken();
    if (!token) {
        container.innerHTML = '<div class="error-message"><p>Please log in to view messages.</p></div>';
        return;
    }
    try {
        const res = await fetch(`${API_BASE_URL}/messages/received`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to fetch admin messages');
        const messages = await res.json();
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
    } catch (error) {
        container.innerHTML = `<div class="error-message"><p>Error loading admin messages.<br>${error.message}</p></div>`;
    }
}

async function renderReceivedProviderMessages() {
    const container = document.getElementById('provider-messages-list');
    if (!container) return;
    container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div>Loading provider messages...</div>';
    const token = getToken();
    if (!token) {
        container.innerHTML = '<div class="error-message"><p>Please log in to view messages.</p></div>';
        return;
    }
    try {
        const res = await fetch(`${API_BASE_URL}/messages/provider`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to fetch provider messages');
        const messages = await res.json();
        if (!messages.length) {
            container.innerHTML = '<div class="empty-message">No messages from providers.</div>';
            return;
        }
        container.innerHTML = '';
        messages.forEach(msg => {
            const msgDiv = document.createElement('div');
            msgDiv.className = 'admin-message-item';
            msgDiv.innerHTML = `
                <div style="font-weight:bold; margin-bottom:0.25em;">${escapeHtml(msg.title || "Provider Message")}</div>
                <div style="margin-bottom:0.5em; color:#334155;">
                    ${escapeHtml(msg.content || msg.Content)}
                </div>
                <div style="font-size:0.9em;color:#888;">${msg.created_at ? new Date(msg.created_at).toLocaleString() : ''}</div>
                <hr>
            `;
            container.appendChild(msgDiv);
        });
    } catch (error) {
        container.innerHTML = `<div class="error-message"><p>Error loading provider messages.<br>${error.message}</p></div>`;
    }
}


document.querySelector('.hamburger')?.addEventListener('click', function() {
    document.getElementById('nav-links')?.classList.toggle('active');
});


document.addEventListener('DOMContentLoaded', function() {
    setupDropdownLogic();
    setupSidebarTabs();
    showAuthUI();
    fetchAndDisplayProfile();
    fetchAndDisplayBookings();
    renderReceivedAdminMessages();
    renderReceivedProviderMessages();
});
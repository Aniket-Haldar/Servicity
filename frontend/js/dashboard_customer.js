// Mobile Navigation Toggle
document.querySelector('.hamburger')?.addEventListener('click', function() {
    document.querySelector('.nav-links')?.classList.toggle('active');
});

// Sticky Navigation on Scroll
window.addEventListener('scroll', function() {
    const navbar = document.querySelector('.navbar');
    if (navbar) {
        navbar.style.boxShadow = window.scrollY > 50
            ? '0 4px 12px rgba(0, 0, 0, 0.1)'
            : 'none';
    }
});

const API_BASE_URL = 'http://localhost:3000';

// Cookie Helper
function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
}

// JWT Helper
function getToken() {
    return localStorage.getItem('token') || getCookie('token');
}

const bookingsList = document.getElementById('bookings-list');
const profileInfo = document.getElementById('profile-info');

function getBookingId(b) {
    return b.id !== undefined ? b.id : b.ID;
}

// Modal helpers
function showModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.add('show');
}

function hideModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove('show');
}

function renderStatus(status) {
    if (!status) return '';
    let cls = "status-label";
    if (status.toLowerCase() === "completed") cls += " completed";
    else if (status.toLowerCase() === "cancelled") cls += " cancelled";
    else cls += " pending";
    return `<span class="${cls}">${status}</span>`;
}

async function fetchAndDisplayBookings() {
    if (!bookingsList) return;

    bookingsList.innerHTML = `
        <div class="loading-spinner">
            <div class="spinner"></div>
            Loading your bookings...
        </div>
    `;

    const token = getToken();
    if (!token) {
        bookingsList.innerHTML = '<div class="error-message"><p>Please log in to view your bookings.</p></div>';
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/booking`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to fetch bookings: ${response.status} ${errorText}`);
        }

        const data = await response.json();
        bookingsList.innerHTML = '';

        if (Array.isArray(data) && data.length) {
         bookingsList.innerHTML = '';
data.forEach(b => {
    const bookingId = getBookingId(b);

    // 1. Create booking card DOM element
    const card = document.createElement('div');
    card.className = "booking-item";
    card.setAttribute("data-booking-id", bookingId);

    card.innerHTML = `
        <div class="booking-header">${b.serviceName || b.service || "Service"}</div>
        <div class="booking-meta">Date: ${b.booking_time ? new Date(b.booking_time).toLocaleString() : "Unknown"}</div>
        <div class="booking-meta">Email: ${b.email || ''}</div>
        <div class="booking-meta">Phone: ${b.phone || ''}</div>
        <div class="booking-meta">Address: ${b.address || ''}</div>
        <div>Status: ${renderStatus(b.status || "Pending")}</div>
        <div class="booking-actions">
            <button class="btn btn-outline edit-booking-btn" data-booking-id="${bookingId}">Edit</button>
            <button class="btn btn-danger cancel-booking-btn" data-booking-id="${bookingId}">Cancel</button>
        </div>
    `;
    bookingsList.appendChild(card);


    if (window.currentUser && window.currentUser.profile) {
        const customerId = window.currentUser.profile.UserID;
        
        addReviewButtonToBooking(b, card.querySelector('.booking-actions'), customerId);
        console.log
    }
});
setupBookingActions(data);
window.currentUser = data;
        } else {
            bookingsList.innerHTML = '<em>No bookings found.</em>';
        }
    } catch (error) {
        console.error('Error fetching bookings:', error);
        bookingsList.innerHTML = `<div class="error-message"><p>Error loading bookings.<br>${error.message}</p></div>`;
    }
}

function setupBookingActions(bookings) {
    document.querySelectorAll('.edit-booking-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const bookingId = this.getAttribute('data-booking-id');
            const booking = bookings.find(b => String(getBookingId(b)) === String(bookingId));
            if (booking) {
                const editBookingId = document.getElementById('edit-booking-id');
                const editBookingDate = document.getElementById('edit-booking-date');
                const editBookingPhone = document.getElementById('edit-booking-phone');
                const editBookingAddress = document.getElementById('edit-booking-address');

                if (editBookingId) editBookingId.value = getBookingId(booking);
                if (editBookingDate) editBookingDate.value = booking.booking_time ? booking.booking_time.split('T')[0] : '';
                if (editBookingPhone) editBookingPhone.value = booking.phone || '';
                if (editBookingAddress) editBookingAddress.value = booking.address || '';

                showModal('edit-booking-modal');
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
                console.error('Error canceling booking:', err);
                alert('Failed to cancel booking.');
            }
        });
    });
}

const editBookingForm = document.getElementById('edit-booking-form');
if (editBookingForm) {
    editBookingForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        const idInput = document.getElementById('edit-booking-id');
        const dateInput = document.getElementById('edit-booking-date');
        const phoneInput = document.getElementById('edit-booking-phone');
        const addressInput = document.getElementById('edit-booking-address');

        if (!idInput || !dateInput || !phoneInput || !addressInput) return;

        const id = idInput.value;
        const date = dateInput.value;
        const phone = phoneInput.value;
        const address = addressInput.value;
        const token = getToken();

        try {
            // PUT to /booking/:id
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

            hideModal('edit-booking-modal');
            await fetchAndDisplayBookings();
        } catch (err) {
            console.error('Error updating booking:', err);
            alert('Failed to update booking.');
        }
    });
}

const closeEditBooking = document.getElementById('close-edit-booking');
if (closeEditBooking) {
    closeEditBooking.addEventListener('click', () => hideModal('edit-booking-modal'));
}

//PUT /profile/:id
let currentProfileId = null;

async function fetchAndDisplayProfile() {
    if (!profileInfo) return;

    profileInfo.innerHTML = `
        <div class="loading-spinner">
            <div class="spinner"></div>
            Loading your profile...
        </div>
    `;

    const token = getToken();
    if (!token) {
        profileInfo.innerHTML = '<div class="error-message"><p>Please log in to view your profile.</p></div>';
        return;
    }

    try {
 
        const url = `${API_BASE_URL}/profile/details`;

        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Failed to fetch profile');

        const data = await response.json();
        profileInfo.innerHTML = '';

        currentProfileId = (data.profile && (data.profile.ID || data.profile.id)) || null;

    
        const phone = (data.profile && (data.profile.Phone || data.profile.phone)) || data.phone || '';
        const address = (data.profile && (data.profile.Address || data.profile.address)) || data.address || '';

        if (data && (data.name || data.fullName || data.email)) {
            profileInfo.innerHTML = `
                <div class="profile-item"><strong>Name:</strong> ${data.name || data.fullName || ""}</div>
                <div class="profile-item"><strong>Email:</strong> ${data.email || ""}</div>
                <div class="profile-item"><strong>Phone:</strong> ${phone}</div>
                <div class="profile-item"><strong>Address:</strong> ${address}</div>
                <div class="profile-actions">
                    <button class="btn btn-outline" id="edit-profile-btn">Edit</button>
                </div>
            `;

            const navUserName = document.querySelector('.user-name');
            if (navUserName) navUserName.textContent = data.name || data.fullName || '';

            const userInfo = document.getElementById('user-info');
            if (userInfo) userInfo.style.display = 'block';

            const googleLogin = document.getElementById('google-login');
            if (googleLogin) googleLogin.style.display = 'none';

            const userEmail = document.querySelector('.user-email');
            if (userEmail) userEmail.textContent = data.email || '';

            setupProfileEdit(data, phone, address);
        } else {
            profileInfo.innerHTML = '<em>Profile details not found.</em>';
        }
    } catch (error) {
        console.error('Error fetching profile:', error);
        profileInfo.innerHTML = '<div class="error-message"><p>Error loading profile.</p></div>';
    }
}

function setupProfileEdit(profile, phone, address) {
    const editProfileBtn = document.getElementById('edit-profile-btn');
    if (editProfileBtn) {
        editProfileBtn.addEventListener('click', function() {
            const editProfileName = document.getElementById('edit-profile-name');
            const editProfileEmail = document.getElementById('edit-profile-email');
            const editProfilePhone = document.getElementById('edit-profile-phone');
            const editProfileAddress = document.getElementById('edit-profile-address');

            if (editProfileName) editProfileName.value = profile.name || profile.fullName || '';
            if (editProfileEmail) editProfileEmail.value = profile.email || '';
            if (editProfilePhone) editProfilePhone.value = phone || '';
            if (editProfileAddress) editProfileAddress.value = address || '';

            showModal('edit-profile-modal');
        });
    }
}

const editProfileForm = document.getElementById('edit-profile-form');
if (editProfileForm) {
    editProfileForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        const nameInput = document.getElementById('edit-profile-name');
        const emailInput = document.getElementById('edit-profile-email');
        const phoneInput = document.getElementById('edit-profile-phone');
        const addressInput = document.getElementById('edit-profile-address');

        if (!nameInput || !emailInput || !phoneInput || !addressInput) return;

        const name = nameInput.value;
        const email = emailInput.value;
        const phone = phoneInput.value;
        const address = addressInput.value;
        const token = getToken();

        try {
            if (!currentProfileId) {
                const profileRes = await fetch(`${API_BASE_URL}/profile/details`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!profileRes.ok) throw new Error('Could not determine user profile.');
                const profileData = await profileRes.json();
                currentProfileId = (profileData.profile && (profileData.profile.ID || profileData.profile.id)) || null;
                if (!currentProfileId) throw new Error('Profile ID not found.');
            }

            const body = { name, email, phone, address };

            const response = await fetch(`${API_BASE_URL}/profile/${currentProfileId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });
            if (!response.ok) throw new Error('Failed to update profile');

            hideModal('edit-profile-modal');
            await fetchAndDisplayProfile();
        } catch (err) {
            console.error('Error updating profile:', err);
            alert('Failed to update profile.');
        }
    });
}

const closeEditProfile = document.getElementById('close-edit-profile');
if (closeEditProfile) {
    closeEditProfile.addEventListener('click', () => hideModal('edit-profile-modal'));
}


document.addEventListener('DOMContentLoaded', async () => {
    try {
        await Promise.all([
            fetchAndDisplayBookings(),
            fetchAndDisplayProfile()
        ]);

        
        const profileIcon = document.getElementById('profile-icon');
        if (profileIcon) {
            profileIcon.addEventListener('click', function(e) {
                e.preventDefault();
                const authDropdown = document.getElementById('auth-dropdown');
                if (authDropdown) authDropdown.classList.toggle('show');
            });
        }


        document.addEventListener('click', function(e) {
            if (!e.target.closest('.profile-dropdown')) {
                const authDropdown = document.getElementById('auth-dropdown');
                if (authDropdown) authDropdown.classList.remove('show');
            }
        });

        //Google OAuth handler
        const googleLogin = document.getElementById('google-login');
        if (googleLogin) {
            googleLogin.addEventListener('click', function(e) {
                e.preventDefault();
                window.location.href = `${API_BASE_URL}/auth/google/login`;
            });
        }

   
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', function(e) {
                e.preventDefault();
                localStorage.removeItem('token');
                document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
                window.location.reload();
            });
        }
    } catch (error) {
        console.error('Initialization error:', error);
    }
});
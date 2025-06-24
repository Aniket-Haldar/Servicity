const API_BASE_URL = 'http://localhost:3000';

function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
}

document.addEventListener('DOMContentLoaded', async () => {

    const bookingForm = document.getElementById('booking-form');
    const confirmationSection = document.getElementById('booking-confirmation');
    const errorMessage = document.getElementById('error-message');
    const loadingSpinner = document.getElementById('loading-spinner');
    const serviceName = document.getElementById('service-name');
    const serviceProvider = document.getElementById('service-provider');
    const servicePrice = document.getElementById('service-price');
    const serviceImage = document.getElementById('service-image');
    const bookingDate = document.getElementById('booking-date');
    const bookingTime = document.getElementById('booking-time');
    const bookingAddress = document.getElementById('booking-address');
    const bookingEmail = document.getElementById('booking-email');
    const bookingPhone = document.getElementById('booking-phone');
    const specialNotes = document.getElementById('special-notes');
    const confirmationDetails = document.getElementById('confirmation-details');
    const cancelBtn = document.getElementById('cancel-booking');
    const newBookingBtn = document.getElementById('new-booking-btn');

    let userIsBlocked = false;

    function showLoading(show) {
        loadingSpinner.style.display = show ? 'flex' : 'none';
    }
    function showError(msg) {
        errorMessage.textContent = msg;
        errorMessage.style.display = 'block';
    }
    function hideError() {
        errorMessage.textContent = '';
        errorMessage.style.display = 'none';
    }

    function blockScreen() {
        document.body.innerHTML = `
            <div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#f8fafc;">
                <div style="background:#fff;padding:2.5em 2em;border-radius:12px;box-shadow:0 2px 24px #0002;text-align:center;">
                    <h2 style="color:#ef4444;margin-bottom:1em;">Account Blocked</h2>
                    <p style="color:#374151;font-size:1.1em;margin-bottom:2em;">Your account has been blocked by the admin. You cannot make bookings.</p>
                    <a href="services.html" class="btn btn-primary" style="text-decoration:none;">Back to Services</a>
                </div>
            </div>
        `;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const serviceId = urlParams.get('serviceId');
    if (!serviceId || !/^\d+$/.test(serviceId)) {
        showError('Invalid service ID.');
        if (bookingForm) bookingForm.style.display = 'none';
        return;
    }

    let currentUser = null;
    let customerId = null;
    async function fetchCurrentUser() {
        try {
            const token = getCookie('token');
            if (!token) throw new Error('Please login to book a service.');
            showLoading(true);
            const response = await fetch(`${API_BASE_URL}/profile/details`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Failed to load user profile.');
            currentUser = await response.json();

            // Blocked check
            userIsBlocked = (currentUser.blocked === true || currentUser.blocked === 1);
            if (userIsBlocked) {
                blockScreen();
                return false;
            }

            if (
                currentUser.profile &&
                (currentUser.profile.UserID || currentUser.profile.ID)
            ) {
                customerId = currentUser.profile.UserID || currentUser.profile.ID;
            }

            if (bookingEmail) bookingEmail.value = currentUser.email || '';
            if (bookingPhone) bookingPhone.value = (currentUser.profile && currentUser.profile.Phone) || '';
            if (bookingAddress) bookingAddress.value = (currentUser.profile && currentUser.profile.Address) || '';
            return true;
        } catch (err) {
            showError(err.message);
            setTimeout(() => window.location.href = `${API_BASE_URL}/auth/google/login`, 2000);
            return false;
        } finally {
            showLoading(false);
        }
    }

    async function loadServiceDetails() {
        if (userIsBlocked) return;
        try {
            showLoading(true);
            const response = await fetch(`${API_BASE_URL}/services/${serviceId}`);
            if (!response.ok) throw new Error('Service not found.');
            const service = await response.json();

            if (serviceName) serviceName.textContent = service.Name || 'Service Name';
            if (servicePrice) servicePrice.textContent = `Price: ${service.Price != null ? '₹' + service.Price : 'Variable'}`;
            if (serviceImage && service.image_url) {
                serviceImage.src = service.image_url;
                serviceImage.style.display = 'block';
            }

            let providerName = 'Professional';
            if (service.provider_id) {
                try {
                    const token = getCookie('token');
                    const providerResp = await fetch(`${API_BASE_URL}/profile/${service.provider_id}`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (providerResp.ok) {
                        const provider = await providerResp.json();
                        providerName = provider.Name || provider.name || provider.username || 'Professional';
                    }
                } catch (err) {}
            }
            if (serviceProvider) serviceProvider.textContent = `Provider: ${providerName}`;

            const now = new Date();
            now.setMinutes(0, 0, 0);
            now.setHours(now.getHours() + 1);
            if (bookingDate) bookingDate.valueAsDate = now;
            if (bookingTime) bookingTime.value = `${String(now.getHours()).padStart(2, '0')}:00`;
        } catch (err) {
            showError(err.message);
            if (bookingForm) bookingForm.style.display = 'none';
        } finally {
            showLoading(false);
        }
    }

    function validateForm() {
        if (userIsBlocked) {
            showError('Your account is blocked. Booking not allowed.');
            return false;
        }
        if (!bookingDate.value || !bookingTime.value) {
            showError('Please select date and time.');
            return false;
        }
        if (!bookingAddress.value.trim()) {
            showError('Please enter your address.');
            return false;
        }
        if (!bookingEmail.value.trim() || !/\S+@\S+\.\S+/.test(bookingEmail.value)) {
            showError('Please enter a valid email.');
            return false;
        }
        if (!bookingPhone.value.trim()) {
            showError('Please enter your phone number.');
            return false;
        }
        const selectedDateTime = new Date(`${bookingDate.value}T${bookingTime.value}`);
        if (selectedDateTime < new Date()) {
            showError('Please select a future date and time.');
            return false;
        }
        return true;
    }

    bookingForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        hideError();
        if (userIsBlocked) {
            showError('Your account is blocked. Booking not allowed.');
            return;
        }
        if (!validateForm()) return;
        try {
            showLoading(true);
            const token = getCookie('token');
            if (!token) throw new Error('Not logged in.');
            if (!customerId) throw new Error('Could not determine current customer ID.');
            const bookingData = {
                customer_id: customerId,
                service_id: parseInt(serviceId),
                booking_time: new Date(`${bookingDate.value}T${bookingTime.value}`).toISOString(),
                address: bookingAddress.value.trim(),
                email: bookingEmail.value.trim(),
                phone: bookingPhone.value.trim(),
                special_notes: specialNotes.value.trim(),
                status: "pending"
            };
            const response = await fetch(`${API_BASE_URL}/booking`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(bookingData)
            });
            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error || 'Booking failed.');
            }
            const booking = await response.json();
            showConfirmation(booking);
        } catch (err) {
            showError(err.message);
        } finally {
            showLoading(false);
        }
    });

    function showConfirmation(booking) {
        if (bookingForm) bookingForm.style.display = 'none';
        if (confirmationSection) confirmationSection.style.display = 'block';
        const dt = booking.booking_time ? new Date(booking.booking_time) : new Date();
        const options = {
            weekday: 'long', year: 'numeric', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
        };
        if (confirmationDetails) {
            confirmationDetails.innerHTML = `
                <p><strong>Service:</strong> ${serviceName?.textContent || ""}</p>
                <p><strong>Provider:</strong> ${serviceProvider?.textContent.replace('Provider: ','') || ""}</p>
                <p><strong>Date & Time:</strong> ${dt.toLocaleString(undefined, options)}</p>
                <p><strong>Address:</strong> ${booking.address || bookingAddress.value}</p>
                <p><strong>Email:</strong> ${booking.email || bookingEmail.value}</p>
                <p><strong>Phone:</strong> ${booking.phone || bookingPhone.value}</p>
                ${booking.special_notes ? `<p><strong>Notes:</strong> ${booking.special_notes}</p>` : ''}
                <p><strong>Status:</strong> <span class="status-label pending">Pending</span></p>
            `;
        }
    }

    cancelBtn?.addEventListener('click', () => {
        window.location.href = 'services.html';
    });
    newBookingBtn?.addEventListener('click', () => {
        window.location.href = 'services.html';
    });

    showLoading(true);
    const userOk = await fetchCurrentUser();
    if (userOk !== false) {
        await loadServiceDetails();
    }
    showLoading(false);
});
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


    const urlParams = new URLSearchParams(window.location.search);
    const serviceId = urlParams.get('serviceId');
    if (!serviceId || !/^\d+$/.test(serviceId)) {
        showError('Invalid service ID.');
        bookingForm.style.display = 'none';
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


            if (
                currentUser.profile &&
                (currentUser.profile.UserID || currentUser.profile.ID)
            ) {
                customerId = currentUser.profile.UserID || currentUser.profile.ID;
            }


            bookingEmail.value = currentUser.email || '';
            bookingPhone.value = (currentUser.profile && currentUser.profile.Phone) || '';
            bookingAddress.value = (currentUser.profile && currentUser.profile.Address) || '';
        } catch (err) {
            showError(err.message);
            setTimeout(() => window.location.href = '/login.html', 2000);
        } finally {
            showLoading(false);
        }
    }


    async function loadServiceDetails() {
        try {
            showLoading(true);
            const response = await fetch(`${API_BASE_URL}/services/${serviceId}`);
            if (!response.ok) throw new Error('Service not found.');
            const service = await response.json();


            serviceName.textContent = service.Name || 'Service Name';
            servicePrice.textContent = `Price: ${service.Price != null ? '₹' + service.Price : 'Variable'}`;
            if (service.image_url) {
                serviceImage.src = service.image_url;
                serviceImage.style.display = 'block';
            }


            let providerName = 'Professional';
            if (service.provider_id) {
                try {
                   const token = getCookie('token');    
                        const providerResp = await fetch(`${API_BASE_URL}/profile/${service.provider_id}`, {
                            headers: {
                            'Authorization': `Bearer ${token}`
                            }
                    });
                    if (providerResp.ok) {
                        const provider = await providerResp.json();
                        console.log(provider);
                        console.log(providerResp);
                        // Use the correct property for name, e.g., provider.Name or provider.name
                        providerName = provider.Name || provider.name || provider.username || 'Professional';
                    }
                } catch (err) {
   
                }
            }
            serviceProvider.textContent = `Provider: ${providerName}`;

 
            const now = new Date();
            now.setMinutes(0, 0, 0);
            now.setHours(now.getHours() + 1);
            bookingDate.valueAsDate = now;
            bookingTime.value = `${String(now.getHours()).padStart(2, '0')}:00`;
        } catch (err) {
            showError(err.message);
            bookingForm.style.display = 'none';
        } finally {
            showLoading(false);
        }
    }


    function validateForm() {
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
        bookingForm.style.display = 'none';
        confirmationSection.style.display = 'block';
        const dt = booking.booking_time ? new Date(booking.booking_time) : new Date();
        const options = { 
            weekday: 'long', year: 'numeric', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
        };
        confirmationDetails.innerHTML = `
            <p><strong>Service:</strong> ${serviceName.textContent}</p>
            <p><strong>Provider:</strong> ${serviceProvider.textContent.replace('Provider: ','')}</p>
            <p><strong>Date & Time:</strong> ${dt.toLocaleString(undefined, options)}</p>
            <p><strong>Address:</strong> ${booking.address || bookingAddress.value}</p>
            <p><strong>Email:</strong> ${booking.email || bookingEmail.value}</p>
            <p><strong>Phone:</strong> ${booking.phone || bookingPhone.value}</p>
            ${booking.special_notes ? `<p><strong>Notes:</strong> ${booking.special_notes}</p>` : ''}
            <p><strong>Status:</strong> <span class="status-label pending">Pending</span></p>
        `;
    }

    cancelBtn?.addEventListener('click', () => {
        window.location.href = 'services.html';
    });
    newBookingBtn?.addEventListener('click', () => {
        window.location.href = 'services.html';
    });

    showLoading(true);
    await fetchCurrentUser();
    await loadServiceDetails();
    showLoading(false);
});
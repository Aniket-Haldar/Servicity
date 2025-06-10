const API_BASE_URL = 'http://localhost:3000';

document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Initialize UI state
        const bookingForm = document.getElementById('booking-form');
        const confirmationSection = document.getElementById('booking-confirmation');
        const errorMessage = document.getElementById('error-message');
        
        bookingForm.style.display = 'block';
        confirmationSection.style.display = 'none';
        errorMessage.style.display = 'none';

        // Get service ID from URL
        const urlParams = new URLSearchParams(window.location.search);
        const serviceId = urlParams.get('serviceId');
        
        if (!serviceId || !/^\d+$/.test(serviceId)) {
            throw new Error('Invalid service ID');
        }
        function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
}
  

        // DOM Elements
        const elements = {
            bookingForm,
            bookingConfirmation: confirmationSection,
            confirmBtn: document.getElementById('confirm-booking'),
            cancelBtn: document.getElementById('cancel-booking'),
            newBookingBtn: document.getElementById('new-booking-btn'),
            loadingSpinner: document.getElementById('loading-spinner'),
            errorMessage,
            serviceName: document.getElementById('service-name'),
            serviceProvider: document.getElementById('service-provider'),
            servicePrice: document.getElementById('service-price'),
            serviceImage: document.getElementById('service-image'),
            bookingDate: document.getElementById('booking-date'),
            bookingTime: document.getElementById('booking-time'),
            bookingAddress: document.getElementById('booking-address'),
            specialNotes: document.getElementById('special-notes'),
            confirmationDetails: document.getElementById('confirmation-details')
        };

        let currentUser = null;
        let selectedService = null;

        // Show loading spinner
        function showLoading(show) {
            elements.loadingSpinner.style.display = show ? 'flex' : 'none';
        }

        // Show error message
        function showError(message) {
            elements.errorMessage.textContent = message;
            elements.errorMessage.style.display = 'block';
        }

        // Fetch current user details
     async function fetchCurrentUser() {
    try {
        const token = localStorage.getItem('token')|| getCookie(`token`);
        if (!token) {
            throw new Error('Please login to book a service');
        }

        showLoading(true);
        const response = await fetch(`${API_BASE_URL}/profile/details`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Profile error response:', errorText);
            throw new Error(`Failed to fetch user data (Status: ${response.status})`);
        }

        currentUser = await response.json();
        console.log('Received user data:', currentUser); // Debug log
        
        // Updated validation - check for ID in profile object
        if (!currentUser || !currentUser.profile || !currentUser.profile.UserID) {
            console.error('Invalid user data structure:', currentUser);
            throw new Error('User data incomplete - missing UserID in profile');
        }

        // Pre-fill address if available (now checking profile for address)
        if (currentUser.profile.Address) {
            elements.bookingAddress.value = currentUser.profile.Address;
        } else {
            console.warn('No address found in user profile');
        }

    } catch (error) {
        console.error('Error fetching user:', error);
        showError(error.message);
        setTimeout(() => {
            window.location.href = `/login.html?redirect=booking&serviceId=${serviceId}`;
        }, 2000);
    } finally {
        showLoading(false);
    }
}

        // Load service details
        async function loadServiceDetails() {
            try {
                showLoading(true);
                const response = await fetch(`${API_BASE_URL}/services/${serviceId}`);
                
                if (!response.ok) {
                    throw new Error(`Service not found (Status: ${response.status})`);
                }

                selectedService = await response.json();
                
                if (!selectedService?.id) {
                    throw new Error('Invalid service data format');
                }

                // Populate service details
                elements.serviceName.textContent = selectedService.name || 'Service Name';
                elements.serviceProvider.textContent = `Provider: ${selectedService.provider_name || 'Professional'}`;
                elements.servicePrice.textContent = `Price: ${selectedService.price ? '₹' + selectedService.price : 'Variable'}`;
                if (selectedService.image_url) {
                    elements.serviceImage.src = selectedService.image_url;
                }

                // Set default booking time (next available hour)
                const now = new Date();
                const nextHour = new Date(now.setHours(now.getHours() + 1, 0, 0, 0));
                elements.bookingDate.valueAsDate = nextHour;
                elements.bookingTime.value = `${String(nextHour.getHours()).padStart(2, '0')}:00`;

            } catch (error) {
                console.error('Error loading service:', error);
                showError(`Failed to load service: ${error.message}`);
                setTimeout(() => {
                    window.location.href = 'services.html';
                }, 2000);
            } finally {
                showLoading(false);
            }
        }

        // Validate booking form
        function validateForm() {
            if (!elements.bookingDate.value || !elements.bookingTime.value) {
                showError('Please select date and time');
                return false;
            }
            
            if (!elements.bookingAddress.value.trim()) {
                showError('Please enter service address');
                return false;
            }
            
            // Validate future date/time
            const selectedDateTime = new Date(`${elements.bookingDate.value}T${elements.bookingTime.value}`);
            if (selectedDateTime < new Date()) {
                showError('Please select a future date and time');
                return false;
            }
            
            return true;
        }

        // Submit booking
        async function submitBooking(e) {
            e.preventDefault();
            
            try {
                // Validate form
                if (!validateForm()) return;
                
                showLoading(true);
                elements.errorMessage.style.display = 'none';

                // Prepare booking data
                const bookingData = {
                    service_id: parseInt(serviceId),
                    booking_time: new Date(`${elements.bookingDate.value}T${elements.bookingTime.value}`).toISOString(),
                    address: elements.bookingAddress.value.trim(),
                    special_notes: elements.specialNotes.value.trim() || null,
                    status: "pending" // Explicitly set status
                };

                const token = localStorage.getItem('token');
                const response = await fetch(`${API_BASE_URL}/booking`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(bookingData)
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.message || `Booking failed (Status: ${response.status})`);
                }

                const booking = await response.json();
                showConfirmation(booking);
                
            } catch (error) {
                console.error('Booking error:', error);
                showError(error.message);
            } finally {
                showLoading(false);
            }
        }

        // Show confirmation
       function showConfirmation(booking) {
    if (!currentUser || !currentUser.profile) {
        showError('User profile data not available');
        return;
    }

    const bookingTime = booking.booking_time ? new Date(booking.booking_time) : new Date();
    const options = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };

    elements.confirmationDetails.innerHTML = `
        <p><strong>Service:</strong> ${selectedService.name}</p>
        <p><strong>Provider:</strong> ${selectedService.provider_name || 'Professional'}</p>
        <p><strong>Date & Time:</strong> ${bookingTime.toLocaleDateString('en-US', options)}</p>
        <p><strong>Address:</strong> ${currentUser.profile.Address || booking.address}</p>
        ${booking.special_notes ? `<p><strong>Notes:</strong> ${booking.special_notes}</p>` : ''}
        <p><strong>Status:</strong> <span class="status-pending">pending</span></p>
    `;
    
    elements.bookingForm.style.display = 'none';
    elements.bookingConfirmation.style.display = 'block';
}
        // Event listeners
        elements.bookingForm.addEventListener('submit', submitBooking);
        elements.cancelBtn.addEventListener('click', () => window.location.href = 'services.html');
        elements.newBookingBtn.addEventListener('click', () => window.location.href = 'services.html');

        // Initialize page
        await fetchCurrentUser();
        await loadServiceDetails();

    } catch (error) {
        console.error('Initialization error:', error);
        showError('Failed to initialize page. Redirecting...');
        setTimeout(() => {
            window.location.href = 'services.html';
        }, 2000);
    }
});
// Helper to get cookie by name
function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
}

// API Base URL
const API_BASE_URL = 'http://localhost:3000';
let isAdmin = false; // Set based on user role after login

// DOM Elements
const servicesContainer = document.getElementById('services-container');
const searchInput = document.getElementById('service-search');
const searchBtn = document.getElementById('search-btn');

// Mobile Navigation Toggle
document.querySelector('.hamburger')?.addEventListener('click', function() {
    document.querySelector('.nav-links')?.classList.toggle('active');
});

// Smooth Scrolling for Anchor Links
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
            // Close mobile menu if open
            document.querySelector('.nav-links')?.classList.remove('active');
        }
    });
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

// Fetch and Display Services (No Authorization Needed)
async function fetchAndDisplayServices(searchQuery = '') {
    try {
        // Show loading state
        servicesContainer.innerHTML = `
            <div class="loading-spinner">
                <div class="spinner"></div>
                <p>Loading services...</p>
            </div>
        `;

        // Build URL with optional search query
        const url = `${API_BASE_URL}/services${searchQuery ? `?search=${encodeURIComponent(searchQuery)}` : ''}`;
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        let services = await response.json();

        // Map fields to ensure frontend compatibility
        services = services.map(service => ({
            id: service.id || service.ID,
            name: service.name || service.Name,
            description: service.description || service.Description,
            price: service.price || service.Price,
            image_url: service.image_url || service.ImageURL,
            provider_id: service.provider_id || service.ProviderID
        }));

        // Clear loading state
        servicesContainer.innerHTML = '';

        if (!services || services.length === 0) {
            servicesContainer.innerHTML = `
                <div class="error-message">
                    <p>No services found. ${searchQuery ? 'Try a different search.' : ''}</p>
                </div>
            `;
            return;
        }

        // Render services
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
// Render Services to DOM
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

    // Add event listeners to interactive elements
    setupServiceInteractions();
}

// Setup Event Listeners for Service Actions
function setupServiceInteractions() {
    // Book Service
    document.querySelectorAll('.book-btn').forEach(button => {
        button.addEventListener('click', function() {
            const serviceId = this.getAttribute('data-service-id');
            bookService(serviceId);
        });
    });

    // Delete Service (Admin only)
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

// Book Service (Requires Authorization)
async function bookService(serviceId) {
    const token = localStorage.getItem('token') || getCookie('token');
    if (!token) {
        window.location.href = '/login?redirect=booking';
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/bookings`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                serviceId: serviceId,
                date: new Date().toISOString().split('T')[0]
            })
        });

        if (!response.ok) {
            throw new Error(`Booking failed with status: ${response.status}`);
        }

        const data = await response.json();
        window.location.href = `/booking-confirmation?id=${data.bookingId}`;

    } catch (error) {
        console.error('Booking failed:', error);
        alert('Booking failed. Please try again.');
    }
}

// Delete Service (Admin Only)
async function deleteService(serviceId) {
    const token = localStorage.getItem('token') || getCookie('token');
    if (!token) {
        window.location.href = '/login';
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
        fetchAndDisplayServices(); // Refresh the list

    } catch (error) {
        console.error('Delete failed:', error);
        alert('Failed to delete service');
    }
}

// Search Functionality
searchBtn?.addEventListener('click', () => {
    fetchAndDisplayServices(searchInput.value.trim());
});

searchInput?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        fetchAndDisplayServices(searchInput.value.trim());
    }
});

// Dashboard Role-based Redirect
document.getElementById('dashboard-link')?.addEventListener('click', async function(e) {
    e.preventDefault();
    const token = localStorage.getItem('token') || getCookie('token');
    if (!token) {
        window.location.href = '/login';
        return;
    }
    try {
        const response = await fetch('http://localhost:3000/profile/details', {
            headers: { 'Authorization': `bearer ${token}` }
        });
        if (!response.ok) throw new Error('Failed to fetch user profile');
        const data = await response.json();
        console.log(data);
        if (data.role === 'Provider') {
            window.location.href = 'dashboard_provider.html';
        } else {
            window.location.href = 'dashboard_customer.html';
        }
    } catch (err) {
        alert('Error determining dashboard: ' + err.message);
    }
});
// Check Auth Status (For UI Updates)
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
            // Update UI for logged-in user
            document.getElementById('user-info').style.display = 'block';
            document.getElementById('google-login').style.display = 'none';
            document.querySelector('.user-name').textContent = data.name;

            // Set isAdmin if role is admin/provider
            if (data.role && data.role.toLowerCase() === 'admin') {
                isAdmin = true;
            }
            if (data.role && data.role.toLowerCase() === 'provider') {
                isAdmin = true; // If you want providers to have admin-like privileges
            }
            if (!data.name) {
                window.location.href = '/onboarding';
            }
            return true;
        }
        return false;
    } catch (error) {
        console.error('Auth check failed:', error);
        return false;
    }
}

// Profile Dropdown & Auth
document.addEventListener('DOMContentLoaded', async () => {
    // Load services immediately
    fetchAndDisplayServices();

    // Check auth status for UI updates
    await checkAuthStatus();

    // Set up profile dropdown if logged in
    document.getElementById('profile-icon')?.addEventListener('click', function(e) {
        e.preventDefault();
        document.getElementById('auth-dropdown')?.classList.toggle('show');
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.profile-dropdown')) {
            document.getElementById('auth-dropdown')?.classList.remove('show');
        }
    });

    // Google OAuth handler
    document.getElementById('google-login')?.addEventListener('click', function(e) {
        e.preventDefault();
        window.location.href = `${API_BASE_URL}/auth/google/login`;
    });

    // Logout handler
    document.getElementById('logout-btn')?.addEventListener('click', function(e) {
        e.preventDefault();
        localStorage.removeItem('token');
        document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        window.location.reload();
    });
});
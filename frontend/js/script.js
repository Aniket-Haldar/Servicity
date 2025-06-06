// Mobile Navigation Toggle
document.querySelector('.hamburger').addEventListener('click', function() {
    document.querySelector('.nav-links').classList.toggle('active');
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
            document.querySelector('.nav-links').classList.remove('active');
        }
    });
});

// Sticky Navigation on Scroll
window.addEventListener('scroll', function() {
    const navbar = document.querySelector('.navbar');
    if (window.scrollY > 50) {
        navbar.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
    } else {
        navbar.style.boxShadow = 'none';
    }
});

// Testimonial Carousel (would be enhanced with a proper library like Swiper in production)
let currentTestimonial = 0;
const testimonials = document.querySelectorAll('.testimonial-card');

function showTestimonial(index) {
    testimonials.forEach((testimonial, i) => {
        testimonial.style.display = i === index ? 'block' : 'none';
    });
}

// Initialize
showTestimonial(0);

// Service Card Animation
const serviceCards = document.querySelectorAll('.service-card');
serviceCards.forEach(card => {
    card.addEventListener('mouseenter', function() {
        this.style.transform = 'translateY(-5px)';
        this.style.boxShadow = '0 10px 20px rgba(0, 0, 0, 0.1)';
    });
    
    card.addEventListener('mouseleave', function() {
        this.style.transform = '';
        this.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
    });
});
// API Configuration
const API_BASE_URL = 'http://localhost:3000'; // Update with your backend URL

// DOM Elements
const servicesContainer = document.getElementById('services-container');
const serviceModal = document.getElementById('service-modal');
const serviceForm = document.getElementById('service-form');
const closeBtn = document.querySelector('.close-btn');
const profileIcon = document.getElementById('profile-icon');
const searchInput = document.getElementById('service-search');
const searchBtn = document.getElementById('search-btn');

// Check if user is admin (you'll need to implement this properly)
let isAdmin = false;

// Fetch and Display Services
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
        let url = `${API_BASE_URL}/services`;
        if (searchQuery) {
            url += `?search=${encodeURIComponent(searchQuery)}`;
        }

        // Fetch services
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const services = await response.json();

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

        // Render services dynamically
        services.forEach(service => {
            const serviceCard = document.createElement('div');
            serviceCard.className = 'service-card';
            serviceCard.innerHTML = `
                <div class="service-img" style="background-image: url('${service.image_url || '../images/default-service.jpeg'}');"></div>
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

        // Add event listeners
        document.querySelectorAll('.book-btn').forEach(button => {
            button.addEventListener('click', function() {
                const serviceId = this.getAttribute('data-service-id');
                bookService(serviceId);
            });
        });

        if (isAdmin) {
            document.querySelectorAll('.delete-btn').forEach(button => {
                button.addEventListener('click', async function() {
                    const serviceId = this.getAttribute('data-service-id');
                    if (confirm('Are you sure you want to delete this service?')) {
                        await deleteService(serviceId);
                        fetchAndDisplayServices();
                    }
                });
            });
        }

    } catch (error) {
        console.error('Error fetching services:', error);
        servicesContainer.innerHTML = `
            <div class="error-message">
                <p>Failed to load services. Please try again later.</p>
                <button class="btn btn-outline" id="retry-btn">Retry</button>
            </div>
        `;

        document.getElementById('retry-btn').addEventListener('click', () => fetchAndDisplayServices());
    }
}

// Book Service
async function bookService(serviceId) {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = '/login?redirect=booking';
            return;
        }

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

// Delete Service (Admin only)
async function deleteService(serviceId) {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = '/login';
            return;
        }

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
        
    } catch (error) {
        console.error('Delete failed:', error);
        alert('Failed to delete service');
    }
}

// Handle Image Upload Preview
document.getElementById('service-image').addEventListener('change', function(e) {
    const preview = document.getElementById('image-preview');
    preview.innerHTML = '';
    
    if (e.target.files.length > 0) {
        const file = e.target.files[0];
        const reader = new FileReader();
        
        reader.onload = function(event) {
            const img = document.createElement('img');
            img.src = event.target.result;
            preview.appendChild(img);
        }
        
        reader.readAsDataURL(file);
    }
});

// Handle Service Form Submission
serviceForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const formData = new FormData();
    formData.append('name', document.getElementById('service-name').value);
    formData.append('description', document.getElementById('service-description').value);
    formData.append('price', document.getElementById('service-price').value);
    formData.append('category', document.getElementById('service-category').value);
    
    const imageInput = document.getElementById('service-image');
    if (imageInput.files.length > 0) {
        formData.append('image', imageInput.files[0]);
    }

    try {
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = '/login';
            return;
        }

        const response = await fetch(`${API_BASE_URL}/services`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        if (!response.ok) {
            throw new Error('Service creation failed');
        }

        const data = await response.json();
        alert('Service created successfully!');
        serviceModal.style.display = 'none';
        serviceForm.reset();
        document.getElementById('image-preview').innerHTML = '';
        fetchAndDisplayServices();
        
    } catch (error) {
        console.error('Error creating service:', error);
        alert('Failed to create service');
    }
});

// Event Listeners
closeBtn.addEventListener('click', () => {
    serviceModal.style.display = 'none';
});

window.addEventListener('click', (e) => {
    if (e.target === serviceModal) {
        serviceModal.style.display = 'none';
    }
});

// Profile dropdown toggle
document.getElementById('profile-icon').addEventListener('click', function(e) {
    e.preventDefault();
    const dropdown = document.getElementById('auth-dropdown');
    dropdown.classList.toggle('show');
});

// Close dropdown when clicking outside
document.addEventListener('click', function(e) {
    if (!e.target.closest('.profile-dropdown')) {
        const dropdown = document.getElementById('auth-dropdown');
        dropdown.classList.remove('show');
    }
});

// Google OAuth handler
document.getElementById('google-login').addEventListener('click', function(e) {
    e.preventDefault();
    window.location.href = `${API_BASE_URL}/auth/google/login`; // Your OAuth endpoint
});

// Logout handler
document.getElementById('logout-btn').addEventListener('click', function(e) {
    e.preventDefault();
    fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
    }).then(() => {
        window.location.reload();
    });
});

// Check auth status on page load
function checkAuthStatus() {
    fetch(`${API_BASE_URL}/profile/details`, {
        credentials: 'include'
    })
    .then(response => response.json())
    .then(data => {
        if (data.authenticated) {
            document.getElementById('user-info').style.display = 'block';
            document.getElementById('google-login').style.display = 'none';
            document.querySelector('.user-email').textContent = data.email;
            
            if (data.needsOnboarding) {
                window.location.href = '/onboarding';
            }
        }
    })
    .catch(error => console.error('Error checking auth status:', error));
}

// Call this when page loads
document.addEventListener('DOMContentLoaded', checkAuthStatus);


searchBtn.addEventListener('click', () => {
    fetchAndDisplayServices(searchInput.value.trim());
});

searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        fetchAndDisplayServices(searchInput.value.trim());
    }
});

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is admin (you'll need to implement this properly)
    const token = localStorage.getItem('token');
    if (token) {
        // Here you would typically verify the token and check user role
        // For now, we'll just assume any logged in user is admin
        isAdmin = true;
    }
    
    fetchAndDisplayServices();
});
document.addEventListener("DOMContentLoaded", async () => {
    try {
       res=fetch('http://localhost:3000/profile/details', {
  method: 'GET',
  headers: {
    'Authorization': `bearer ${token}`,
    'Content-Type': 'application/json'
  },

        });
        if (!res.ok) return;

        const data = await res.json();
        const name = data.name;

        // Add name beside profile icon
        const profileIcon = document.querySelector('.profile-icon'); // adjust selector
        if (profileIcon) {
            const nameSpan = document.createElement('span');
            nameSpan.textContent = name;
            nameSpan.style.marginLeft = "8px";
            nameSpan.style.fontWeight = "500";
            profileIcon.parentNode.insertBefore(nameSpan, profileIcon.nextSibling);
        }
    } catch (err) {
        console.error("User not logged in");
    }
});

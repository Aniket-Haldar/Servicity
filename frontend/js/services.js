const API_BASE_URL = 'https://servicity.onrender.com';

function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
}

function getAverageRating(reviews) {
    if (!reviews || !reviews.length) return 0;
    const sum = reviews.reduce((acc, r) => acc + (r.rating ?? r.Rating ?? 0), 0);
    return sum / reviews.length;
}

function renderStars(rating) {
    rating = Number(rating) || 0;
    const fullStars = Math.floor(rating);
    const halfStar = rating - fullStars >= 0.5;
    let stars = '★'.repeat(fullStars);
    if (halfStar) stars += '½';
    stars = stars.padEnd(5, '☆');
    return stars;
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

document.addEventListener('DOMContentLoaded', async () => {
    const servicesGrid = document.getElementById('servicesGrid');
    const searchInput = document.getElementById('searchInput');
    const categoryFilter = document.getElementById('categoryFilter');
    const loadingSpinner = document.getElementById('loading-spinner');
    const dashboardLink = document.getElementById('dashboard-link');

 
    document.querySelector('.hamburger')?.addEventListener('click', function() {
        document.querySelector('.nav-links')?.classList.toggle('active');
    });


    if (dashboardLink) {
        dashboardLink.addEventListener('click', function (e) {
            e.preventDefault();
         
            const token = getCookie('token');
            if (!token) {
                window.location.href = `${API_BASE_URL}/auth/google/login`;
                return;
            }
            fetch(`${API_BASE_URL}/profile/details`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            .then(res => res.json())
            .then(data => {
                const role = data.role || data.Role;
                if (role === 'Provider') {
                    window.location.href = 'dashboard_provider.html';
                } else if (role === 'Customer') {
                    window.location.href = 'dashboard_customer.html';
                } else if (role==='Admin') {
                    window.location.href = 'dashboard_admin.html';
                } else {
                    window.location.href=`${API_BASE_URL}/auth/google/login`;
                }
            })
            .catch(() => {
                window.location.href = `${API_BASE_URL}/auth/google/login`;
            });
        });
    }

    
    const profileIcon = document.getElementById('profile-icon');
    const authDropdown = document.getElementById('auth-dropdown');
    const googleLogin = document.getElementById('google-login');
    const userInfo = document.getElementById('user-info');
    const userNameSpan = document.querySelector('.user-name');
    const userEmailDiv = document.querySelector('.user-email');
    const logoutBtn = document.getElementById('logout-btn');

  
    profileIcon?.addEventListener('click', function (e) {
        e.preventDefault();
        authDropdown?.classList.toggle('show');
    });
  
    document.addEventListener('click', function (e) {
        if (!e.target.closest('.profile-dropdown')) {
            authDropdown?.classList.remove('show');
        }
    });
  
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            authDropdown?.classList.remove('show');
        }
    });

 
    async function showAuthUI() {
        const token = getCookie('token');
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
    showAuthUI();


    googleLogin?.addEventListener('click', function(e) {
        e.preventDefault();
        window.location.href = `${API_BASE_URL}/auth/google/login`;
    });

    logoutBtn?.addEventListener('click', function(e) {
        e.preventDefault();
        localStorage.removeItem('token');
        document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        window.location.href = "index.html";
    });


    loadingSpinner.style.display = 'flex';
    servicesGrid.innerHTML = `
        <div class="service-card skeleton">
            <div class="service-image"></div>
            <div class="service-content">
                <div class="skeleton-line" style="width: 70%"></div>
                <div class="skeleton-line" style="width: 90%"></div>
                <div class="skeleton-line" style="width: 60%"></div>
                <div class="skeleton-btn"></div>
            </div>
        </div>
        <div class="service-card skeleton">
            <div class="service-image"></div>
            <div class="service-content">
                <div class="skeleton-line" style="width: 70%"></div>
                <div class="skeleton-line" style="width: 90%"></div>
                <div class="skeleton-line" style="width: 60%"></div>
                <div class="skeleton-btn"></div>
            </div>
        </div>
        <div class="service-card skeleton">
            <div class="service-image"></div>
            <div class="service-content">
                <div class="skeleton-line" style="width: 70%"></div>
                <div class="skeleton-line" style="width: 90%"></div>
                <div class="skeleton-line" style="width: 60%"></div>
                <div class="skeleton-btn"></div>
            </div>
        </div>
    `;

    async function fetchServices() {
        try {
            const response = await fetch(`${API_BASE_URL}/services`, {
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch services');
            }

            return await response.json(); 
        } catch (error) {
            console.error('Error fetching services:', error);
            servicesGrid.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Failed to load services. Please try again later.</p>
                </div>
            `;
            return [];
        } finally {
            loadingSpinner.style.display = 'none';
        }
    }

    // Fetch reviews/comments for a service
    async function fetchServiceReviews(serviceId) {

    try {
        const url = `${API_BASE_URL}/reviews/service?service_id=${serviceId}`;

        const res = await fetch(url);
      
        if (!res.ok) {
            const text = await res.text();
     
            return [];
        }
        let reviews = await res.json();


        return (Array.isArray(reviews) ? reviews : [reviews]).map(r => ({
            rating: r.rating ?? r.Rating ?? 0,
            comment: r.comment ?? r.Comment ?? "",
            createdAt: r.createdAt ?? r.CreatedAt ?? "",
            customer: (r.Customer && (r.Customer.name || r.Customer.Name)) ?? r.customer ?? r.customer_name ?? "Customer"
        }));
    } catch (e) {
        console.error("[fetchServiceReviews] Exception:", e);
        return [];
    }
}

async function fetchServiceReviews(serviceId) {
    
    try {
        const url = `${API_BASE_URL}/reviews/service?service_id=${serviceId}`;
   
        const res = await fetch(url);
      
        if (!res.ok) {
            const text = await res.text();

            return [];
        }
        let reviews = await res.json();


     
        return (Array.isArray(reviews) ? reviews : [reviews]).map(r => ({
            rating: r.Rating ?? r.rating ?? 0,
            comment: r.Comment ?? r.comment ?? "",
            createdAt: r.CreatedAt ?? r.createdAt ?? "",
            customer: (r.Customer && (r.Customer.name || r.Customer.Name)) ?? "Customer"
        }));
    } catch (e) {
        console.error("[fetchServiceReviews] Exception:", e);
        return [];
    }
}


function showServiceModal(service, reviews = []) {

    const modal = document.getElementById('serviceModal');
    const modalContent = document.getElementById('serviceModalContent');
    modalContent.innerHTML = `
        <span class="close-modal" id="closeModal">&times;</span>
        <h2>${escapeHtml(service.Name || "Untitled Service")}</h2>
        <p>${escapeHtml(service.Description || "")}</p>
        <h3>Reviews</h3>
        <div>
            ${
                reviews.length === 0
                ? "<em>No reviews yet.</em>"
                : reviews.map(r => `
                    <div class="review" style="margin-bottom:1.2em;">
                        <div>
                            <strong>${escapeHtml(r.customer)}</strong>
                            <span style="margin-left:8px; color:#ffc107;">${renderStars(r.rating)}</span>
                        </div>
                        <div style="margin:7px 0 3px 0; color:#222;">${escapeHtml(r.comment)}</div>
                        <div style="font-size:0.9em; color:#888;">
                            ${r.createdAt ? new Date(r.createdAt).toLocaleString() : ""}
                        </div>
                    </div>
                `).join("")
            }
        </div>
    `;
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';

    document.getElementById('closeModal').onclick = () => {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    };
    modal.onclick = (e) => {
        if (e.target === modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    };
}
    function closeServiceModal() {
        const modal = document.getElementById('serviceModal');
        modal.classList.remove('active');
        document.body.style.overflow = '';
        document.removeEventListener('keydown', escListener);
    }
    function escListener(e) {
        if (e.key === "Escape") closeServiceModal();
    }

async function renderServices(services) {
    servicesGrid.innerHTML = services.map(service => `
        <div class="service-card" data-category="${service.Category ? service.Category.toLowerCase() : 'other'}" data-id="${service.ID || service.id}">
            <div class="service-image" style="background-image: url('${service.image_url || '../images/default-service.jpg'}')"></div>
            <div class="service-content">
                <h3>${escapeHtml(service.Name || "Untitled Service")}</h3>
                <p>${escapeHtml(service.Description || "Professional service available")}</p>
                <div class="service-meta">
                    <span class="price">₹${service.Price != null ? service.Price : '--'}/${service.price_unit || 'service'}</span>
                    <span class="rating" id="avg-rating-${service.ID || service.id}">
                        ☆☆☆☆☆ (loading)
                    </span>
                </div>
                <a href="booking.html?serviceId=${service.ID}" class="book-btn">Book Now</a>
            </div>
        </div>
    `).join('');


    for (const service of services) {
        try {
            const res = await fetch(`${API_BASE_URL}/reviews/service?service_id=${service.ID || service.id}`);
            const reviewsRaw = await res.json();
       
            const reviews = Array.isArray(reviewsRaw) ? reviewsRaw.map(r => ({
                rating: r.Rating ?? r.rating ?? 0
            })) : [];
            const avg = getAverageRating(reviews);
            const count = reviews.length;
            document.getElementById(`avg-rating-${service.ID || service.id}`).innerHTML =
                `${renderStars(avg)} (${avg ? avg.toFixed(1) : '0'}) (${count})`;
        } catch (e) {
            document.getElementById(`avg-rating-${service.ID || service.id}`).innerHTML =
                "☆☆☆☆☆ (0)";
        }
    }

  
    document.querySelectorAll('.service-card').forEach(card => {
        card.addEventListener('click', async function (e) {
            if (e.target.classList.contains('book-btn')) return;
            const serviceId = this.dataset.id;
            const service = services.find(s => String(s.ID || s.id) === String(serviceId));
            if (service) {
                const reviews = await fetchServiceReviews(serviceId);
                showServiceModal(service, reviews);
            }
        });
    });

}


    function filterServices() {
        const searchTerm = searchInput.value.toLowerCase();
        const category = categoryFilter.value;
        document.querySelectorAll('.service-card').forEach(card => {
            const matchesCategory = category === 'all' || card.dataset.category === category;
            const matchesSearch = card.textContent.toLowerCase().includes(searchTerm);
            card.style.display = matchesCategory && matchesSearch ? 'block' : 'none';
        });
    }

    try {
        const services = await fetchServices();
        renderServices(services);

        searchInput.addEventListener('input', filterServices);
        categoryFilter.addEventListener('change', filterServices);
    } catch (error) {
        console.error('Initialization error:', error);
        loadingSpinner.style.display = 'none';
        servicesGrid.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Failed to initialize page. Please refresh.</p>
            </div>
        `;
    }
});
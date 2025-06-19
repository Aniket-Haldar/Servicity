const API_BASE_URL = 'http://localhost:3000';

document.addEventListener('DOMContentLoaded', async () => {
    const servicesGrid = document.getElementById('servicesGrid');
    const searchInput = document.getElementById('searchInput');
    const categoryFilter = document.getElementById('categoryFilter');
    const loadingSpinner = document.getElementById('loading-spinner');

 
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

  
   function renderServices(services) {
    if (services.length === 0) {
        servicesGrid.innerHTML = `
            <div class="no-services">
                <i class="fas fa-box-open"></i>
                <p>No services available at the moment.</p>
            </div>
        `;
        return;
    }

    servicesGrid.innerHTML = services.map(service => `
        <div class="service-card" data-category="${service.Category ? service.Category.toLowerCase() : 'other'}">
            <div class="service-image" style="background-image: url('${service.image_url || '../images/default-service.jpg'}')"></div>
            <div class="service-content">
                <h3>${service.Name || "Untitled Service"}</h3>
                <p>${service.Description || "Professional service available"}</p>
                <div class="service-meta">
                    <span class="price">₹${service.Price != null ? service.Price : '--'}/${service.price_unit || 'service'}</span>
                    <span class="rating">
                        ${'★'.repeat(Math.floor(service.rating || 0))}${'☆'.repeat(5 - Math.floor(service.rating || 0))}
                        (${service.review_count || 0})
                    </span>
                </div>
                <a href="booking.html?serviceId=${service.ID}" class="book-btn">Book Now</a>
            </div>
        </div>
    `).join('');
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
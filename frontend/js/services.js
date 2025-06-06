const API_BASE_URL='http://localhost:3000';
document.addEventListener('DOMContentLoaded', async () => {
    const servicesGrid = document.getElementById('servicesGrid');
    const searchInput = document.getElementById('searchInput');
    const categoryFilter = document.getElementById('categoryFilter');

    // Fetch services from backend
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
        }
    }

    // Render services
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
            <div class="service-card" data-category="${service.category.toLowerCase()}">
                <div class="service-image" style="background-image: url('${service.image_url || 'https://via.placeholder.com/300x180'}')"></div>
                <div class="service-content">
                    <h3>${service.name}</h3>
                    <p>${service.description}</p>
                    <div class="service-meta">
                        <span class="price">₹${service.price}/hr</span>
                        <span class="rating">
                            ${'★'.repeat(Math.floor(service.rating || 0))}${'☆'.repeat(5 - Math.floor(service.rating || 0))}
                        </span>
                    </div>
                    <a href="/book?serviceId=${service.id}" class="book-btn">Book Now</a>
                </div>
            </div>
        `).join('');
    }

    // Filter services
    function filterServices() {
        const searchTerm = searchInput.value.toLowerCase();
        const category = categoryFilter.value;
        
        document.querySelectorAll('.service-card').forEach(card => {
            const matchesCategory = category === 'all' || card.dataset.category === category;
            const matchesSearch = card.textContent.toLowerCase().includes(searchTerm);
            
            card.style.display = matchesCategory && matchesSearch ? 'block' : 'none';
        });
    }

    // Initialize
    const services = await fetchServices();
    renderServices(services);
    
    // Event listeners
    searchInput.addEventListener('input', filterServices);
    categoryFilter.addEventListener('change', filterServices);
});
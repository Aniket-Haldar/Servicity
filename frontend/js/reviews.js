const APII_BASE_URL = 'http://127.0.0.1:3000';

function getToken() {
    return localStorage.getItem('token') || getCookie('token');
}

function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
}

function showModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.style.display = 'block';
}

function hideModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
        const modalContent = modal.querySelector('.modal-content');
        if (modalContent) {
           
            modalContent.style.left = '';
            modalContent.style.top = '';
            modalContent.style.transform = '';
        }
        modal.style.display = 'none';
    }
}

function renderStars(rating) {
    rating = Number(rating) || 0;
    let stars = '';
    for (let i = 1; i <= 5; i++) {
        stars += `<span style="color:#f1c40f">${i <= rating ? '★' : '☆'}</span>`;
    }
    return stars;
}

async function fetchProviderId(serviceId) {
    const token = getToken();
    if (!serviceId) return null;
    try {
        const res = await fetch(`${APII_BASE_URL}/services/${serviceId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) return null;
        const service = await res.json();
        return service.provider_id || service.providerID || service.ProviderID || null;
    } catch (err) {
        console.error('Fetch provider_id error:', err);
        return null;
    }
}

function normalizeReview(review) {
    if (!review) return null;
    return {
        id: review.id ?? review.ID,
        rating: review.rating ?? review.Rating,
        comment: review.comment ?? review.Comment ?? review.review_text ?? review.Review_text ?? '',
    };
}

async function fetchReviewForBooking(bookingId, customerId) {
    const token = getToken();
    if (!token) return null;
    try {
        const url = `${APII_BASE_URL}/reviews?booking_id=${bookingId}&customer_id=${customerId}`;
        const res = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.status === 404) return null;
        if (!res.ok) return null;
        let review = await res.json();
        if (Array.isArray(review)) review = review[0] || null;
        return normalizeReview(review);
    } catch (err) {
        console.error('Fetch review error:', err);
        return null;
    }
}

async function openReviewModal({bookingId, serviceId, customerId, providerId, triggerEvent}) {
    if (!bookingId || !customerId || !serviceId) {
        alert('Missing required parameters for review modal');
        return;
    }
    if (!providerId) {
        providerId = await fetchProviderId(serviceId);
    }
    if (!providerId) {
        alert('Provider information could not be found for this service. Cannot submit review.');
        return;
    }

    showModal('review-modal');
    document.getElementById('review-booking-id').value = bookingId;
    document.getElementById('review-service-id').value = serviceId;
    document.getElementById('review-customer-id').value = customerId;
    document.getElementById('review-provider-id').value = providerId;

    document.getElementById('review-form').style.display = 'none';
    document.getElementById('existing-review').style.display = 'none';

 
    const modalContent = document.querySelector('#review-modal .modal-content');
    if (triggerEvent && modalContent) {
        const {clientX, clientY} = triggerEvent;
    
        let left = clientX + 10;
        let top = clientY + 16;

       
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const modalWidth = modalContent.offsetWidth || 410;
        const modalHeight = modalContent.offsetHeight || 320;
        if (left + modalWidth > vw) left = vw - modalWidth - 12;
        if (top + modalHeight > vh) top = vh - modalHeight - 12;

        modalContent.style.left = left + "px";
        modalContent.style.top = top + "px";
        modalContent.style.transform = "none";
    } else if (modalContent) {
    
        modalContent.style.left = "50%";
        modalContent.style.top = "20vh";
        modalContent.style.transform = "translate(-50%, 0)";
    }
   

    const review = await fetchReviewForBooking(bookingId, customerId);

    if (review && review.id) {
        document.getElementById('review-modal-title').textContent = 'Your Review';
        document.getElementById('existing-review-rating').innerHTML = renderStars(review.rating);
        document.getElementById('existing-review-text').textContent = review.comment;
        document.getElementById('existing-review').style.display = 'block';

        document.getElementById('edit-review-btn').onclick = function() {
            document.getElementById('review-modal-title').textContent = 'Edit Your Review';
            document.getElementById('review-rating').value = review.rating;
            document.getElementById('review-text').value = review.comment;
            document.getElementById('review-form').setAttribute('data-mode', 'edit');
            document.getElementById('review-form').setAttribute('data-review-id', review.id);
            document.getElementById('review-form').style.display = 'block';
            document.getElementById('existing-review').style.display = 'none';
        };
    } else {
        document.getElementById('review-modal-title').textContent = 'Leave a Review';
        document.getElementById('review-rating').value = '';
        document.getElementById('review-text').value = '';
        document.getElementById('review-form').removeAttribute('data-mode');
        document.getElementById('review-form').removeAttribute('data-review-id');
        document.getElementById('review-form').style.display = 'block';
    }
}

function setupReviewModal() {
    const modal = document.getElementById('review-modal');
    if (!modal) return;

    modal.addEventListener('click', (e) => {
        if (e.target === modal) hideModal('review-modal');
    });

    const closeBtn = modal.querySelector('.close-btn') || document.getElementById('close-review-modal');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => hideModal('review-modal'));
    }
}

function addReviewButtonToBooking(booking, actionsContainer, customerId) {
    if (!booking || !actionsContainer || !customerId) return;
    if ((booking.status || '').toLowerCase() !== 'completed') return;

    const serviceId = booking.service_id || booking.serviceId || booking.serviceID;
    const providerId = booking.provider_id || booking.providerId || booking.ProviderID;
    const bookingId = booking.booking_id || booking.bookingId || booking.id || booking.ID;

    if (!bookingId) return;

    const reviewBtn = document.createElement('button');
    reviewBtn.className = 'btn btn-outline review-btn';
    reviewBtn.textContent = 'Leave/View Review';
    reviewBtn.setAttribute('data-booking-id', bookingId);
    actionsContainer.appendChild(reviewBtn);

  
    reviewBtn.addEventListener('click', async (e) => {
        await openReviewModal({
            bookingId,
            serviceId,
            customerId,
            providerId,
            triggerEvent: e 
        });
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const reviewForm = document.getElementById('review-form');
    if (!reviewForm) return;

    reviewForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        const bookingId = document.getElementById('review-booking-id')?.value;
        const serviceId = document.getElementById('review-service-id')?.value;
        const customerId = document.getElementById('review-customer-id')?.value;
        const providerId = document.getElementById('review-provider-id')?.value;
        const rating = parseInt(document.getElementById('review-rating')?.value);
        const comment = document.getElementById('review-text')?.value.trim();
        const token = getToken();

        if (!token) {
            alert('Please log in to submit a review');
            return;
        }
        if (!bookingId || !serviceId || !customerId || !providerId) {
            alert("All fields are required. (Provider or Service may be missing for this booking)");
            return;
        }
        if (isNaN(rating) || rating < 1 || rating > 5) {
            alert('Please enter a valid rating between 1 and 5');
            return;
        }
        if (!comment) {
            alert('Please enter your review comments');
            return;
        }

        const mode = reviewForm.getAttribute('data-mode');
        const reviewId = reviewForm.getAttribute('data-review-id');
        try {
            let res, data;
            const reviewData = {
                booking_id: Number(bookingId),
                service_id: Number(serviceId),
                customer_id: Number(customerId),
                provider_id: Number(providerId),
                rating: Number(rating),
                comment: comment
            };

            if (mode === 'edit' && reviewId) {
                res = await fetch(`${APII_BASE_URL}/reviews/${reviewId}`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(reviewData)
                });
            } else {
                res = await fetch(`${APII_BASE_URL}/reviews`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(reviewData)
                });
            }

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.message || errorData.error || 'Failed to process review');
            }

            data = await res.json();

            
            await openReviewModal({
                bookingId,
                serviceId,
                customerId,
                providerId,

            });
        } catch (err) {
            console.error('Review submission error:', err);
            alert(err.message || 'Failed to submit review');
        }
    });

    setupReviewModal();
});
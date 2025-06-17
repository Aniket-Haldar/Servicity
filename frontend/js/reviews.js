const APII_BASE_URL = 'http://localhost:3000';

// Escape HTML utility
function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe.toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// -------- CUSTOMER: Leave Review --------
// bookingObj must have: id, provider_id, status, reviewed (bool or null if not reviewed)
function renderReviewButton(bookingObj, parentElem, customerId) {
    // Only show if booking is completed and not reviewed
    if (bookingObj.status !== "completed" || bookingObj.reviewed) return;
    if (parentElem.querySelector('.review-btn')) return; // Avoid duplicate

    const btn = document.createElement('button');
    btn.className = "btn btn-review review-btn";
    btn.textContent = "Leave Review";
    btn.onclick = () => showReviewForm(bookingObj, parentElem, customerId);
    parentElem.appendChild(btn);
}

function showReviewForm(bookingObj, parentElem, customerId) {
    // Remove previous form if present
    parentElem.querySelector('.review-form')?.remove();
    parentElem.querySelector('.review-btn')?.remove();

    const form = document.createElement('div');
    form.className = 'review-form';
    form.innerHTML = `
        <textarea id="review-comment-${bookingObj.id}" placeholder="Write your review..." required></textarea>
        <select id="review-rating-${bookingObj.id}" required>
            <option value="">Rate...</option>
            <option value="5">★★★★★</option>
            <option value="4">★★★★</option>
            <option value="3">★★★</option>
            <option value="2">★★</option>
            <option value="1">★</option>
        </select>
        <div style="margin-top:8px;">
            <button class="btn btn-success" id="submit-review-btn-${bookingObj.id}">Submit</button>
            <button class="btn btn-secondary" id="cancel-review-btn-${bookingObj.id}">Cancel</button>
        </div>
    `;
    parentElem.appendChild(form);

    // Handlers
    form.querySelector(`#submit-review-btn-${bookingObj.id}`).onclick = async () => {
        const comment = form.querySelector(`#review-comment-${bookingObj.id}`).value.trim();
        const rating = parseInt(form.querySelector(`#review-rating-${bookingObj.id}`).value, 10);
        if (!comment || !rating) {
            alert("Please write a review and select a rating!");
            return;
        }
        try {
            await submitReview({
                CustomerID: customerId,
                ProviderID: bookingObj.provider_id,
                Rating: rating,
                Comment: comment
            });
            alert("Review submitted!");
            form.remove();
            // Optionally mark as reviewed in UI/state
        } catch (e) {
            alert("Failed to submit review.");
        }
    };
    form.querySelector(`#cancel-review-btn-${bookingObj.id}`).onclick = () => {
        form.remove();
        renderReviewButton(bookingObj, parentElem, customerId);
    };
}

async function submitReview(reviewObj) {
    await fetch(`${APII_BASE_URL}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reviewObj)
    });
}

// -------- PROVIDER: View Reviews --------
async function fetchProviderReviews(providerId) {
    const res = await fetch(`${APII_BASE_URL}/providers/${providerId}/reviews`);
    return await res.json();
}

async function renderProviderReviews(providerId, containerId) {
    const reviews = await fetchProviderReviews(providerId);
    const container = document.getElementById(containerId);
    if (!container) return;
    if (!reviews.length) {
        container.innerHTML = "<p>No reviews received yet.</p>";
        return;
    }
    container.innerHTML = reviews.map(rv => `
        <div class="review-card">
            <div class="review-rating">${'★'.repeat(rv.Rating)}${'☆'.repeat(5 - rv.Rating)}</div>
            <div class="review-comment">${escapeHtml(rv.Comment)}</div>
            <div class="review-meta">Customer ID: ${escapeHtml(rv.CustomerID)}</div>
        </div>
    `).join('');
}

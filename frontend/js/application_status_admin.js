const API_BASE_URL = 'http://127.0.0.1:3000';

function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
}

async function fetchAdminStatus() {
    const token = getCookie('token');
    if (!token) {
        window.location.href = `${API_BASE_URL}/auth/google/login`;
        return { status: "unknown" };
    }
    try {
        const response = await fetch(`${API_BASE_URL}/admin/my-admin-request`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });

        if (response.status === 401) {
            window.location.href = `${API_BASE_URL}/auth/google/login`;
            return { status: "unknown" };
        }

        const data = await response.json();
        return data; 
    } catch (error) {
        console.error('Error fetching admin status:', error);
        return { status: "unknown" };
    }
}

function renderAdminStatus(status) {
    const card = document.getElementById('statusCard');
    if (!card) return;

    let html = '';
    switch (status) {
        case "Pending":
            html = `
                <div class="status-icon pending">⏳</div>
                <div class="status-title">Your Admin Application is Pending</div>
                <div class="status-desc">
                    Thank you for applying to be an admin. Your application is under review.
                </div>
                <button class="home-btn" onclick="window.location.href='index.html'">Home</button>
            `;
            break;
        case "Approved":
            html = `
                <div class="status-icon approved">✅</div>
                <div class="status-title">Congratulations!</div>
                <div class="status-desc">
                    Your admin application has been approved. You can now access the admin dashboard.
                </div>
                <button class="dashboard-btn" onclick="window.location.href='admin_dashboard.html'">Go to Admin Dashboard</button>
            `;
            break;
        case "Rejected":
            html = `
                <div class="status-icon rejected">❌</div>
                <div class="status-title">Application Rejected</div>
                <div class="status-desc">
                    Your admin application was not accepted. You may apply again if you'd like.
                </div>
                <button class="home-btn" onclick="window.location.href='onboarding_admin.html'">Apply Again</button>
            `;
            break;
        case "not_requested":
            html = `
                <div class="status-icon">❔</div>
                <div class="status-title">No Admin Application Found</div>
                <div class="status-desc">
                    You haven't applied for admin yet.
                </div>
                <button class="apply-btn" onclick="window.location.href='onboarding_admin.html'">Apply as Admin</button>
            `;
            break;
        default:
            html = `
                <div class="status-icon">❔</div>
                <div class="status-title">Unknown Status</div>
                <div class="status-desc">
                    Please try re-logging in or contact support.
                </div>
                <button class="home-btn" onclick="window.location.href='index.html'">Home</button>
            `;
    }

    card.innerHTML = html;
}

document.addEventListener('DOMContentLoaded', async () => {
    const data = await fetchAdminStatus();
    renderAdminStatus(data.status);
});
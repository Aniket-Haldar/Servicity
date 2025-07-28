const API_BASE_URL = 'https://servicity.onrender.com';

function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
}

async function fetchStatus() {
    const token = getCookie('token');
    if (!token) {
        window.location.href = `${API_BASE_URL}/auth/google/login`;
        return { status: "unknown" };
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/profile/status`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });
        
        console.log('Response status:', response.status);
        
        // Log the response body for debugging
        const responseText = await response.text();
        console.log('Response body:', responseText);
        
        // Parse it back to JSON
        const responseData = JSON.parse(responseText);
        console.log('Parsed response:', responseData);

        // Handle specific error cases
        if (response.status === 400) {
            if (responseData.error === "Not a provider user") {
                return { status: "not_provider" };
            }
            if (responseData.error === "Provider profile not found") {
                return { status: "no_profile" };
            }
            return { status: "unknown" };
        }

        if (response.status === 401) {
            window.location.href = `${API_BASE_URL}/auth/google/login`;
            return { status: "unknown" };
        }

        if (response.status === 404) {
            return { status: "not_found" };
        }

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return responseData;
    } catch (error) {
        console.error('Error fetching status:', error);
        return { status: "unknown" };
    }
}

function renderStatus(status) {
    const card = document.getElementById('statusCard');
    if (!card) {
        console.error('Status card element not found');
        return;
    }

    let html = '';
    switch (status) {
        case "Pending":
            html = `
                <div class="status-icon pending">⏳</div>
                <div class="status-title">Your Application has been sent</div>
                <div class="status-desc">
                    Thank you for registering as a provider. Our team will review your application and notify you soon.
                </div>
                <button class="home-btn" onclick="window.location.href='index.html'">Home</button>
            `;
            break;
        case "Approved":
            html = `
                <div class="status-icon approved">✅</div>
                <div class="status-title">Your Application has been Approved!</div>
                <div class="status-desc">
                    Congratulations! You can now access the provider dashboard.
                </div>
                <button class="dashboard-btn" onclick="window.location.href='dashboard.html'">Go to Dashboard</button>
            `;
            break;
        case "Rejected":
            html = `
                <div class="status-icon rejected">❌</div>
                <div class="status-title">Application Rejected</div>
                <div class="status-desc">
                    Your provider application was not accepted. You can submit a new application if you wish.
                </div>
                <button class="home-btn" onclick="window.location.href='index.html'">Apply Again</button>
            `;
            break;
        case "not_provider":
            html = `
                <div class="status-icon">⚠️</div>
                <div class="status-title">Not a Provider Account</div>
                <div class="status-desc">
                    This account is not registered as a provider. Please register as a provider first.
                </div>
                <button class="apply-btn" onclick="window.location.href='apply.html'">Register as Provider</button>
            `;
            break;
        case "no_profile":
            html = `
                <div class="status-icon">❔</div>
                <div class="status-title">No Provider Profile Found</div>
                <div class="status-desc">
                    You haven't submitted a provider application yet.
                </div>
                <button class="apply-btn" onclick="window.location.href='apply.html'">Apply Now</button>
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
    try {
        const data = await fetchStatus();
        renderStatus(data.status);
    } catch (error) {
        console.error('Error in DOMContentLoaded:', error);
        renderStatus("unknown");
    }
});
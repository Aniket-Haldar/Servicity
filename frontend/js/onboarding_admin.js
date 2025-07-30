const API_BASE_URL = 'https://servicity.onrender.com';

function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
}

async function fetchAdminRequestStatus() {
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
        return await response.json(); 
    } catch (error) {
        console.error('Error fetching admin status:', error);
        return { status: "unknown" };
    }
}

document.addEventListener("DOMContentLoaded", async function () {
   
    const { status } = await fetchAdminRequestStatus();

    if (status === "Pending" || status === "Approved") {
      
        window.location.href = "application_status_admin.html";
        return;
    }

    if (status === "Rejected") {
       
    }

   
    const form = document.getElementById("onboarding-admin-form");
    const statusDiv = document.getElementById("admin-request-status");

    form.addEventListener("submit", async function (e) {
        e.preventDefault();

        const message = document.getElementById("admin-message").value.trim();
        const token = getCookie('token');

        try {
            const res = await fetch(`${API_BASE_URL}/admin/request`, {
                method: "POST",
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ message })
            });

            const data = await res.json();
            if (res.ok) {
                showStatus("Your admin request has been submitted and is pending approval.", false);
                setTimeout(() => {
                    window.location.href = "application_status_admin.html";
                }, 1000);
            } else if (data.error && data.error.includes("pending admin request")) {
                showStatus("You already have a pending admin request.", true);
                setTimeout(() => {
                    window.location.href = "application_status_admin.html";
                }, 1500);
            } else {
                showStatus("Failed to submit request: " + (data.error || res.statusText), true);
            }
        } catch (err) {
            showStatus("Network error while submitting request: " + err, true);
        }
    });

    function showStatus(msg, isError) {
        statusDiv.style.display = "block";
        statusDiv.innerText = msg;
        statusDiv.style.color = isError ? "#c00" : "#080";
    }
       const token = getCookie('token');
    if (!token) {
        window.location.href = 'https://servicity.onrender.com/auth/google/login';
    }
});
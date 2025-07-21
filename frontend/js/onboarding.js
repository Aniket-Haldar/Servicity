const API_BASE_URL = 'http://127.0.0.1:3000';
function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
}

document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('onboarding-form');
    form.addEventListener('submit', async function(e) {
        e.preventDefault();

        // Only collect the existing fields!
        const formData = {
            name: document.getElementById('name').value,
            phone: document.getElementById('phone').value,
            role: 'Customer', // always customer
            address: document.getElementById('address').value
        };

        try {
            const token = getCookie('token');
            const response = await fetch(`${API_BASE_URL}/profile/update`, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify(formData),
    credentials: 'include' // <--- THIS IS CRUCIAL
});
            

            if (response.ok) {
                // Show debug message and redirect after 60 seconds
                document.body.innerHTML = `
                    <h2>Profile updated successfully!</h2>
                    <p>You will be redirected to the homepage in <span id="countdown">60</span> seconds.</p>
                    <p>Use devtools to check cookies and debug.</p>
                `;
                let seconds = 60;
                const countdown = document.getElementById('countdown');
                const timer = setInterval(() => {
                    seconds--;
                    countdown.textContent = seconds;
                    if (seconds <= 0) {
                        clearInterval(timer);
                        window.location.href = 'index.html';
                    }
                }, 1000);
            } else {
                const errorData = await response.json();
                alert(`Error: ${errorData.error || 'Failed to update profile'}`);
            }
        } catch (error) {
            console.error('Error:', error);
            alert('An error occurred while updating your profile');
        }
    });

    // Check if user is logged in
    const token = getCookie('token');
    if (!token) {
        // Show debug message and redirect after 60 seconds
        document.body.innerHTML = `
            <h2>You are not logged in!</h2>
            <p>You will be redirected to Google login in <span id="countdown">60</span> seconds.</p>
            <p>Use devtools to check cookies and debug.</p>
        `;
        let seconds = 60;
        const countdown = document.getElementById('countdown');
        const timer = setInterval(() => {
            seconds--;
            countdown.textContent = seconds;
            if (seconds <= 0) {
                clearInterval(timer);
                window.location.href = 'http://127.0.0.1:3000/auth/google/login';
            }
        }, 1000);
    }
});
const API_BASE_URL = 'https://servicity.onrender.com';
function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
}

document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('onboarding-provider-form');
    form.addEventListener('submit', async function(e) {
        e.preventDefault();

        const formData = {
            name: document.getElementById('name').value,
            phone: document.getElementById('phone').value,
            role: 'Provider',
            profession: document.getElementById('profession').value,
            pincode: document.getElementById('pincode').value,
            pricing: parseFloat(document.getElementById('pricing').value),
            availableTimings: document.getElementById('availableTimings').value
        };

        try {
            const token = getCookie('token');
            const response = await fetch(`${API_BASE_URL}/profile/update`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                window.location.href = 'application_status.html'; 
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
        window.location.href = 'https://servicity.onrender.com/auth/google/login';
    }
});
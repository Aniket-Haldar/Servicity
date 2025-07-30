const API_BASE_URL = 'https://servicity.onrender.com';
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
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                window.location.href = 'index.html'; 
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
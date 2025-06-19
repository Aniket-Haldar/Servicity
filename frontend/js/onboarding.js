const API_BASE_URL = 'http://localhost:3000';
function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
}



document.addEventListener('DOMContentLoaded', function() {
    const roleInputs = document.querySelectorAll('input[name="role"]');
    const providerFields = document.getElementById('provider-fields');
    const customerFields = document.getElementById('customer-fields');

    roleInputs.forEach(input => {
        input.addEventListener('change', function() {
            if (this.value === 'Provider') {
                providerFields.style.display = 'block';
                customerFields.style.display = 'none';
            
                document.getElementById('profession').required = true;
                document.getElementById('pincode').required = true;
                document.getElementById('pricing').required = true;
                
            
                document.getElementById('address').required = false;
            } else {
                providerFields.style.display = 'none';
                customerFields.style.display = 'block';
                
 
                document.getElementById('profession').required = false;
                document.getElementById('pincode').required = false;
                document.getElementById('pricing').required = false;
                
             
                document.getElementById('address').required = true;
            }
        });
    });


    const form = document.getElementById('onboarding-form');
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const formData = {
            name: document.getElementById('name').value,
            phone: document.getElementById('phone').value,
            role: document.querySelector('input[name="role"]:checked').value
        };

        //role specific
        if (formData.role === 'Provider') {
            formData.profession = document.getElementById('profession').value;
            formData.pincode = document.getElementById('pincode').value;
            formData.pricing = parseFloat(document.getElementById('pricing').value);
            formData.availableTimings = document.getElementById('availableTimings').value;
        } else {
            formData.address = document.getElementById('address').value;
        }

     try {
         const token=getCookie('token');
    const response = await fetch(`${API_BASE_URL}/profile/update`, {
       
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `bearer ${token}`
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

    //user logged in or not
    const token=getCookie('token');
    if (!token) {
        window.location.href = 'localhost:3000/auth/google/login';
    }
});

        const API_BASE_URL = 'http://localhost:3000';

        function getCookie(name) {
            const value = `; ${document.cookie}`;
            const parts = value.split(`; ${name}=`);
            if (parts.length === 2) return parts.pop().split(';').shift();
            return null;
        }

        function escapeHtml(unsafe) {
            if (!unsafe) return '';
            return unsafe.toString()
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;");
        }
        function formatDate(dateString) {
            if (!dateString) return "Unknown";
            try {
                const date = new Date(dateString);
                return isNaN(date.getTime()) ? "Invalid Date" : date.toLocaleString();
            } catch (e) {
                return "Unknown";
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
        async function showAuthUI() {
            const token = getCookie('token');
            const userInfo = document.getElementById('user-info');
            const googleLogin = document.getElementById('google-login');
            const userNameSpan = document.querySelector('.user-name');
            const userEmailDiv = document.querySelector('.user-email');
            if (!token) {
                if (userInfo) userInfo.style.display = "none";
                if (googleLogin) googleLogin.style.display = "block";
                if (userNameSpan) userNameSpan.textContent = "";
                if (userEmailDiv) userEmailDiv.textContent = "";
                return;
            }
            try {
                const res = await fetch(`${API_BASE_URL}/profile/details`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!res.ok) throw new Error("Not logged in");
                const data = await res.json();

                if (data.blocked === true || data.blocked === 1) {
                    showBlockedScreen();
                    throw new Error("Blocked");
                }
                if (googleLogin) googleLogin.style.display = "none";
                if (userInfo) userInfo.style.display = "block";
                if (userNameSpan) userNameSpan.textContent = data.name || data.Name || "";
                if (userEmailDiv) userEmailDiv.textContent = data.email || data.Email || "";
            } catch {
                if (userInfo) userInfo.style.display = "none";
                if (googleLogin) googleLogin.style.display = "block";
                if (userNameSpan) userNameSpan.textContent = "";
                if (userEmailDiv) userEmailDiv.textContent = "";
            }
        }
        async function renderProviderDetails() {
            const token = getCookie('token');
            if (!token) return;
            try {
                const res = await fetch(`${API_BASE_URL}/profile/details`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!res.ok) return;
                const data = await res.json();
                const profile = data.profile || {};
                const box = document.getElementById('provider-details');
                if (!box) return;

                box.innerHTML = `
                    <div class="profile-row"><label>Name:</label> <span id="profile-name">${escapeHtml(data.name || "")}</span></div>
                    <div class="profile-row"><label>Email:</label> <span id="profile-email">${escapeHtml(data.email || "")}</span></div>
                    <div class="profile-row"><label>Profession:</label> <span id="profile-profession">${escapeHtml(profile.Profession || "")}</span></div>
                    <div class="profile-row"><label>Pincode:</label> <span id="profile-pincode">${escapeHtml(profile.Pincode || "")}</span></div>
                    <div class="profile-row"><label>Available Timings:</label> <span id="profile-timings">${escapeHtml(profile.AvailableTimings || "")}</span></div>
                    <div class="profile-row"><label>Status:</label> <span>${data.blocked ? '<span style="color:#e74c3c">Blocked</span>' : '<span style="color:#27ae60">Active</span>'}</span></div>
                    <button class="btn btn-primary" id="edit-profile-btn"><i class="fa fa-pen"></i> Edit</button>
                    <form id="edit-profile-form" style="display:none;margin-top:1.5em;">
                        <div class="profile-row"><label>Name:</label> <input type="text" id="edit-profile-name" required></div>
                        <div class="profile-row"><label>Email:</label> <input type="email" id="edit-profile-email" required></div>
                        <div class="profile-row"><label>Profession:</label> <input type="text" id="edit-profile-profession" required></div>
                        <div class="profile-row"><label>Pincode:</label> <input type="text" id="edit-profile-pincode" required></div>
                        <div class="profile-row"><label>Available Timings:</label> <input type="text" id="edit-profile-timings" required></div>
                        <div class="form-actions" style="margin-top:1.2em;display:flex;gap:1em;">
                            <button type="submit" class="btn btn-success">Save</button>
                            <button type="button" class="btn btn-secondary" id="cancel-edit-profile">Cancel</button>
                        </div>
                    </form>
                `;

                document.getElementById('edit-profile-name').value = data.name || "";
                document.getElementById('edit-profile-email').value = data.email || "";
                document.getElementById('edit-profile-profession').value = profile.Profession || "";
                document.getElementById('edit-profile-pincode').value = profile.Pincode || "";
                document.getElementById('edit-profile-timings').value = profile.AvailableTimings || "";

                document.getElementById('edit-profile-btn').onclick = () => {
                    document.getElementById('edit-profile-form').style.display = 'block';
                    document.getElementById('edit-profile-btn').style.display = 'none';
                };
                document.getElementById('cancel-edit-profile').onclick = () => {
                    document.getElementById('edit-profile-form').style.display = 'none';
                    document.getElementById('edit-profile-btn').style.display = '';
                };
                document.getElementById('edit-profile-form').onsubmit = async function(e) {
                    e.preventDefault();

                    const updatedData = {
                        Name: document.getElementById('edit-profile-name').value,
                        Email: document.getElementById('edit-profile-email').value,
                        Role: "Provider",
                        Profession: document.getElementById('edit-profile-profession').value,
                        Pincode: document.getElementById('edit-profile-pincode').value,
                        AvailableTimings: document.getElementById('edit-profile-timings').value,
                        Pricing: 0
                    };

                    try {
                        const providerId = profile.ID || profile.Id || profile.id || data.id || data.ID || data.UserID;
                        const res = await fetch(`${API_BASE_URL}/profile/${providerId}`, {
                            method: 'PUT',
                            headers: {
                                'Authorization': `Bearer ${token}`,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify(updatedData)
                        });
                        if (!res.ok) {
                            alert("Failed to update profile.");
                            return;
                        }
                        renderProviderDetails();
                    } catch (err) {
                        alert("Error updating profile.");
                    }
                };
            } catch (e) {}
        }

        function setupDropdownLogic() {
            document.getElementById('profile-icon')?.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                document.getElementById('auth-dropdown')?.classList.toggle('show');
            });
            document.addEventListener('click', function(e) {
                if (!e.target.closest('.profile-dropdown')) {
                    document.getElementById('auth-dropdown')?.classList.remove('show');
                }
            });
            document.addEventListener('keydown', function(e) {
                if (e.key === 'Escape') {
                    document.getElementById('auth-dropdown')?.classList.remove('show');
                }
            });
            document.getElementById('google-login')?.addEventListener('click', function(e) {
                e.preventDefault();
                window.location.href = `${API_BASE_URL}/auth/google/login`;
            });
            document.getElementById('logout-btn')?.addEventListener('click', function(e) {
                e.preventDefault();
                document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
                window.location.href = "index.html";
            });
        }
        function openProviderMessageModal(booking) {
            document.getElementById('provider-message-modal').style.display = 'flex';
            document.getElementById('provider-message-booking-id').value = booking.id || booking.ID;
            document.getElementById('provider-message-customer-id').value = booking.customer_id;
            document.getElementById('provider-message-title').value = '';
            document.getElementById('provider-message-content').value = '';
            document.getElementById('provider-message-status').textContent = '';
        }

        document.getElementById('close-provider-message-modal').onclick = function() {
            document.getElementById('provider-message-modal').style.display = 'none';
        };
        window.addEventListener('click', function(event) {
            const modal = document.getElementById('provider-message-modal');
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        });

        document.getElementById('provider-message-form').onsubmit = async function(e) {
            e.preventDefault();
            const token = getCookie('token');
            const customerId = Number(document.getElementById('provider-message-customer-id').value); 
            const bookingIdRaw = document.getElementById('provider-message-booking-id').value;
            const bookingId = bookingIdRaw ? Number(bookingIdRaw) : null; 
            const title = document.getElementById('provider-message-title').value.trim();
            const content = document.getElementById('provider-message-content').value.trim();
            if (!content || !customerId || isNaN(customerId)) {
                alert('No customer id found for this booking. Cannot send message.');
                return;
            }
            try {
                const res = await fetch(`${API_BASE_URL}/provider/messages`, {
                    method: "POST",
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ receiver_id: customerId, booking_id: bookingId, title, content })
                });
                if (res.ok) {
                    document.getElementById('provider-message-status').textContent = "Message sent!";
                    setTimeout(() => {
                        document.getElementById('provider-message-modal').style.display = 'none';
                    }, 1000);
                } else {
                    document.getElementById('provider-message-status').textContent = "Failed to send message.";
                }
            } catch (error) {
                document.getElementById('provider-message-status').textContent = "Error sending message.";
            }
        };
        async function openProviderChat(booking) {
        
            document.querySelectorAll('.sidebar-btn').forEach(b => b.classList.remove('active'));
            document.querySelector('.sidebar-btn[data-section="chat-section"]').classList.add('active');
            document.querySelectorAll('.dashboard-section').forEach(sec => sec.classList.remove('active'));
            document.getElementById('chat-section').classList.add('active');

          
            const token = getCookie('token');
            const providerId = booking.provider_id;
            const customerId = booking.customer_id;
            const bookingId = booking.id;

            let room;
            try {
                const res = await fetch(`${API_BASE_URL}/chat/rooms`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        customer_id: customerId,
                        provider_id: providerId,
                        booking_id: bookingId
                    })
                });
                if (!res.ok) throw new Error('Could not get or create chat room');
                room = await res.json();
            } catch (e) {
                alert('Failed to open chat room.');
                return;
            }


            await renderConversationList(room.id);

   
            await openConversation(room);

            setTimeout(() => {
                document.getElementById('chat-message-input')?.focus();
            }, 100);
        }

    
        async function renderConversationList(roomIdToHighlight = null) {
            const token = getCookie('token');
            const list = document.getElementById('conversation-list');
            list.innerHTML = '<div>Loading...</div>';

            try {
            const res1 = await fetch(`${API_BASE_URL}/profile/details`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!res1.ok) return;
                const data = await res1.json();
                const profile = data.profile || {};
                const userId=profile.UserID;
        if (!userId) {
            list.innerHTML = '<div>Error: User ID missing. Please re-login.</div>';
            return;
        }
        const res = await fetch(`${API_BASE_URL}/chat/rooms?user_id=${userId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
                if (!res.ok) {
                    list.innerHTML = '<div>Error loading conversations.</div>';
                    return;
                }

                const rooms = await res.json();
                list.innerHTML = '';

                if (!Array.isArray(rooms) || rooms.length === 0) {
                    list.innerHTML = '<div>No conversations found.</div>';
                    return;
                }

                let highlightId = roomIdToHighlight;
                if (!highlightId) {
                    highlightId = localStorage.getItem('currentChatRoomId');
                }

                rooms.forEach(room => {
                 
                    const otherUser = room.customer?.name || room.customer?.email || room.provider?.name || room.provider?.email || "User";
                    const lastMsg = room.last_message || room.lastMessage || {};
                    const lastMsgContent = lastMsg.content || "";
                    const lastMsgTime = lastMsg.created_at || lastMsg.createdAt || room.last_message_at || room.lastMessageAt || "";

                   
                    const item = document.createElement('div');
                    item.className = 'conversation-item' + ((room.id === highlightId) ? ' active' : '');

                    item.innerHTML = `
                        <div class="conversation-title">${escapeHtml(otherUser)}</div>
                        <div class="conversation-snippet">${escapeHtml(lastMsgContent)}</div>
                        <div class="conversation-time">${formatDate(lastMsgTime)}</div>
                    `;

                    item.onclick = () => {
                    
                        localStorage.setItem('currentChatRoomId', room.id);
                    
                        document.querySelectorAll('.conversation-item').forEach(el => el.classList.remove('active'));
                        item.classList.add('active');
                     
                        openConversation(room);
                    };

                    list.appendChild(item);

               
                    if (room.id === highlightId) {
                        setTimeout(() => openConversation(room), 0);
                    }
                });
            } catch (err) {
                list.innerHTML = '<div>Error loading conversations.</div>';
            }
        }
        function formatDate(dateString) {
            if (!dateString) return "";
            try {
                const date = new Date(dateString);
                return isNaN(date.getTime()) ? "" : date.toLocaleString();
            } catch (e) {
                return "";
            }
        }
async function getCurrentUser() {
    const token = getCookie('token');
    if (!token) return null;
    
    try {
        const res = await fetch(`${API_BASE_URL}/profile/details`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!res.ok) throw new Error('Failed to fetch user details');
        
        const data = await res.json();

        return {
            id: data.profile.UserID,
            name: data.name || data.Name,
            email: data.email || data.Email
        };
    } catch (error) {
        console.error('Error fetching user details:', error);
        return null;
    }
}
   
       async function openConversation(room) {
    const token = getCookie('token');
    const currentUser = await getCurrentUser(); 
    
    localStorage.setItem('currentChatRoomId', room.id);
    
   
    document.getElementById('chat-header').style.display = '';
    document.getElementById('chat-input-container').style.display = '';
    
    const otherUser = room.customer && room.customer.name ? room.customer : (room.provider || {});
    document.getElementById('chat-user-name').innerText = otherUser.name || otherUser.email || 'User';
    document.getElementById('chat-user-status').innerText = 'Online';

   
    const msgList = document.getElementById('chat-messages');
    msgList.innerHTML = '<div class="loading-spinner"><div class="spinner"></div>Loading messages...</div>';
    
    try {
        const res = await fetch(`${API_BASE_URL}/chat/rooms/${room.id}/messages`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!res.ok) throw new Error('Failed to load messages');
        
        const messages = await res.json();
        msgList.innerHTML = '';
        
        if (!messages.length) {
            msgList.innerHTML = `
                <div class="chat-welcome">
                    <i class="fas fa-comments fa-3x"></i>
                    <h3>No messages yet</h3>
                    <p>Start the conversation!</p>
                </div>`;
            return;
        }

        messages.forEach(msg => {
            const isCurrentUser = msg.sender_id === currentUser.id;
            const messageTime = formatDate(msg.created_at || msg.createdAt || msg.time || "");
            
            const messageContainer = document.createElement('div');
            messageContainer.className = `message-container ${isCurrentUser ? 'sent' : 'received'}`;
            
            messageContainer.innerHTML = `
                <div class="message-content">
                    <div class="message-bubble">${escapeHtml(msg.content)}</div>
                    <div class="message-time">${messageTime}</div>
                </div>
            `;
            
            msgList.appendChild(messageContainer);
        });

        msgList.scrollTop = msgList.scrollHeight;

   
        const chatForm = document.getElementById('chat-form');
        chatForm.onsubmit = async function(e) {
            e.preventDefault();
            const input = document.getElementById('chat-message-input');
            const content = input.value.trim();
            
            if (!content) return;
            
            try {
                
                const res = await fetch(`${API_BASE_URL}/chat/rooms/${room.id}/messages`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        sender_id: currentUser.id,
                        receiver_id:  room.customer_id ,
                        content: content,
                        booking_id: room.booking_id || null
                    })
                });
                
                if (!res.ok) throw new Error('Failed to send message');
                
                input.value = '';
                await openConversation(room); 
            } catch (error) {
                console.error('Error sending message:', error);
                alert('Failed to send message');
            }
        };
    } catch (error) {
        console.error('Error loading messages:', error);
        msgList.innerHTML = '<div class="error">Failed to load messages. Please try again.</div>';
    }
}




        function showBlockedScreen() {
            document.body.innerHTML = `
                <div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#f8fafc;">
                    <div style="background:#fff;padding:2.5em 2em;border-radius:12px;box-shadow:0 2px 24px #0002;text-align:center;">
                        <h2 style="color:#ef4444;margin-bottom:1em;">Account Blocked</h2>
                        <p style="color:#374151;font-size:1.1em;margin-bottom:2em;">
                            Your account has been blocked by the admin.<br>
                            You cannot access provider features.
                        </p>
                        <a href="./index.html" class="btn btn-primary" style="text-decoration:none;">Go to Home</a>
                    </div>
                </div>
            `;
        }

        class ProviderDashboard {
            constructor() {
                this.providerId = null;
                this.services = [];
                this.init();
            }

            async init() {
                const token = getCookie('token');
                if (token) {
                    try {
                        const res = await fetch(`${API_BASE_URL}/profile/details`, {
                            headers: { 'Authorization': `Bearer ${token}` }
                        });
                        if (res.ok) {
                            const data = await res.json();
                            if (data.blocked === true || data.blocked === 1) {
                                showBlockedScreen();
                                return;
                            }
                        }
                    } catch {}
                }
                await showAuthUI();
                setupDropdownLogic();
                await this.fetchProviderId();
                await Promise.all([
                    this.fetchProviderServices(),
                    this.fetchProviderBookings()
                ]);
                this.setupEventListeners();

                renderProviderReviews(this.providerId, 'provider-reviews-container');
            }

            async fetchProviderId() {
                const token = getCookie('token');
                if (!token) {
                    window.location.href = `${API_BASE_URL}/auth/google/login`;
                    return;
                }
                try {
                    const res = await fetch(`${API_BASE_URL}/profile/details`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (!res.ok) throw new Error('Failed to fetch profile');
                    const data = await res.json();

                    if (data.blocked === true || data.blocked === 1) {
                        showBlockedScreen();
                        throw new Error("Blocked");
                    }
            
                    if (data.profile && (data.profile.ID || data.profile.id || data.profile.UserID)) {
                        this.providerId = data.profile.UserID;
                    } else {
                        this.providerId = data.id || data.ID || data.user_id || data.UserID;
                    }
                    if ((data.role || data.Role) !== 'Provider') {
                        alert('You must be a provider to access this dashboard.');
                        window.location.href = '/';
                        return;
                    }
                } catch (error) {
                    alert("Session expired or invalid. Please log in again.");
                    window.location.href = `${API_BASE_URL}/auth/google/login`;
                }
            }

            async fetchProviderServices() {
                if (!this.providerId) return;
                try {
                    const res = await fetch(`${API_BASE_URL}/services`);
                    if (!res.ok) throw new Error('Failed to fetch services');
                    let services = await res.json();
                    services = services.map(s => ({
                        id: s.id || s.ID,
                        name: s.name || s.Name,
                        description: s.description || s.Description,
                        price: s.price || s.Price,
                        category: s.category || s.Category,
                        image_url: s.image_url || s.ImageURL,
                        provider_id: s.provider_id || s.ProviderID,
                    }));
                    this.services = services.filter(s => String(s.provider_id) === String(this.providerId));
                    this.renderProviderServices();
                } catch (error) {
                    document.getElementById('provider-services').innerHTML =
                        '<div class="error">Failed to load services. Please refresh.</div>';
                }
            }

            renderProviderServices() {
                const container = document.getElementById('provider-services');
                if (!container) return;
                container.innerHTML = '';
                if (!this.services.length) {
                    container.innerHTML = '<p class="no-data">No services yet. Create one!</p>';
                    return;
                }
                this.services.forEach(service => {
                    const card = document.createElement('div');
                    card.className = 'service-card';
                    card.innerHTML = `
                        <img src="${escapeHtml(service.image_url || 'images/default-service.jpeg')}"
                            class="service-thumb"
                            alt="${escapeHtml(service.name)}">
                        <div class="service-info">
                            <h4>${escapeHtml(service.name)}</h4>
                            <div>Category: <b>${escapeHtml(service.category)}</b></div>
                            <div>₹${escapeHtml(service.price)}</div>
                            <div class="service-description">${escapeHtml(service.description || '')}</div>
                        </div>
                        <div class="service-actions">
                            <button class="btn btn-success" data-action="edit">Edit</button>
                            <button class="btn btn-secondary" data-action="delete">Delete</button>
                        </div>
                    `;
                    card.querySelector('[data-action="edit"]').onclick = () => this.showForm(true, service);
                    card.querySelector('[data-action="delete"]').onclick = () => this.deleteService(service.id);
                    container.appendChild(card);
                });
            }

            async createOrEditService(e) {
                e.preventDefault();
                const token = getCookie('token');
                if (!token) {
                    alert('Please log in to perform this action.');
                    return;
                }
                const id = document.getElementById('service-id').value;
                const formData = {
                    name: document.getElementById('service-name').value,
                    Name: document.getElementById('service-name').value,
                    description: document.getElementById('service-description').value,
                    Description: document.getElementById('service-description').value,
                    price: parseFloat(document.getElementById('service-price').value),
                    Price: parseFloat(document.getElementById('service-price').value),
                    category: document.getElementById('service-category').value,
                    Category: document.getElementById('service-category').value,
                    image_url: document.getElementById('service-image-url').value,
                    ImageURL: document.getElementById('service-image-url').value,
                    provider_id: this.providerId,
                    ProviderID: this.providerId,
                };
                if (!formData.name || !formData.price || !formData.category) {
                    alert('Please fill in all required fields');
                    return;
                }
                try {
                    let url, method;
                    if (id) {
                        url = `${API_BASE_URL}/services/${id}`;
                        method = 'PUT';
                    } else {
                        url = `${API_BASE_URL}/services`;
                        method = 'POST';
                    }
                    const res = await fetch(url, {
                        method,
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(formData)
                    });
                    if (!res.ok) {
                        const error = await res.text();
                        throw new Error(error || 'Failed to save service');
                    }
                    const service = await res.json();
                    const mappedService = {
                        id: service.id || service.ID,
                        name: service.name || service.Name,
                        description: service.description || service.Description,
                        price: service.price || service.Price,
                        category: service.category || service.Category,
                        image_url: service.image_url || service.ImageURL,
                        provider_id: service.provider_id || service.ProviderID,
                    };
                    if (id) {
                        const idx = this.services.findIndex(s => String(s.id) === String(mappedService.id));
                        if (idx !== -1) this.services[idx] = mappedService;
                    } else {
                        this.services.unshift(mappedService);
                    }
                    this.hideForm();
                    this.renderProviderServices();
                } catch (error) {
                    alert(`Failed to save service: ${error.message}`);
                }
            }

            async deleteService(id) {
                if (!confirm('Are you sure you want to delete this service?')) return;
                const token = getCookie('token');
                if (!token) {
                    alert('Please log in to perform this action.');
                    return;
                }
                try {
                    const res = await fetch(`${API_BASE_URL}/services/${id}`, {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (!res.ok) {
                        const error = await res.text();
                        throw new Error(error || 'Failed to delete service');
                    }
                    this.services = this.services.filter(s => String(s.id) !== String(id));
                    this.renderProviderServices();
                } catch (error) {
                    alert(`Failed to delete service: ${error.message}`);
                }
            }

            showForm(edit = false, service = {}) {
                const formContainer = document.getElementById('service-form-container');
                if (!formContainer) return;
                formContainer.style.display = 'block';
                document.getElementById('service-id').value = edit ? (service.id || service.ID) : '';
                document.getElementById('service-name').value = edit ? (service.name || service.Name) : '';
                document.getElementById('service-description').value = edit ? (service.description || service.Description) : '';
                document.getElementById('service-price').value = edit ? (service.price || service.Price) : '';
                document.getElementById('service-category').value = edit ? (service.category || service.Category) : '';
                document.getElementById('service-image-url').value = edit ? (service.image_url || service.ImageURL) : '';
            }

            hideForm() {
                const formContainer = document.getElementById('service-form-container');
                if (!formContainer) return;
                formContainer.style.display = 'none';
                document.getElementById('service-form').reset();
            }

            async fetchProviderBookings() {
                const token = getCookie('token');
                if (!this.providerId) return;
                try {
                    const res = await fetch(`${API_BASE_URL}/booking/provider`, {
                        method: 'GET',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        },
                    });
                    if (!res.ok) throw new Error('Failed to fetch bookings');
                    let bookings = await res.json();

                    bookings = bookings.map(b => ({
                        id: b.id || b.ID,
                        service_id: b.service_id || b.ServiceID,
                        provider_id: b.provider_id || b.ProviderID,
                        customer_id: b.customer_id || b.CustomerID || b.customerId, 
                        booking_time: b.booking_time || b.BookingTime,
                        status: b.status || b.Status,
                        email: b.email || b.Email,
                        phone: b.phone || b.Phone,
                        address: b.address || b.Address,
                        special_notes: b.special_notes || b.SpecialNotes,
                        service: b.Service || b.service
                    }));
                    const ownBookings = bookings.filter(b => String(b.provider_id) === String(this.providerId));
                    this.ProviderBookings(ownBookings);
                } catch (error) {
                    document.getElementById('provider-bookings').innerHTML =
                        '<div class="error">Failed to load bookings. Please refresh.</div>';
                }
            }

            ProviderBookings(bookings) {
                const container = document.getElementById('provider-bookings');
                if (!container) return;
                container.innerHTML = '';
                if (!bookings.length) {
                    container.innerHTML = '<p class="no-data">No bookings found yet.</p>';
                    return;
                }
                bookings.forEach(booking => {
                    const card = document.createElement('div');
                    card.className = 'booking-card';
                    card.innerHTML = `
                        <div class="booking-info">
                            <div><b>${escapeHtml(booking.email || 'Customer')}</b> booked ${escapeHtml(booking.service?.name || booking.service?.Name || 'Service')}</div>
                            <div>Date: ${formatDate(booking.booking_time)}</div>
                            <div>Status: <span class="status-${escapeHtml(booking.status)}">${escapeHtml(booking.status)}</span></div>
                            ${booking.address ? `<div>Address: ${escapeHtml(booking.address)}</div>` : ''}
                            ${booking.special_notes ? `<div>Notes: ${escapeHtml(booking.special_notes)}</div>` : ''}
                        </div>
                        <div class="booking-actions"></div>
                    `;
                    const actions = card.querySelector('.booking-actions');

                
                    const messageBtn = document.createElement('button');
                    messageBtn.className = 'btn btn-info';
                    messageBtn.textContent = 'Message';
                    messageBtn.style.marginLeft = '0.5em';
                    messageBtn.onclick = () => openProviderChat(booking);
                    actions.appendChild(messageBtn);

                
                    if (booking.status === 'pending') {
                        const acceptBtn = document.createElement('button');
                        acceptBtn.className = 'btn btn-success';
                        acceptBtn.textContent = 'Accept';
                        acceptBtn.onclick = () => this.respondBooking(booking.id, 'accepted');
                        const rejectBtn = document.createElement('button');
                        rejectBtn.className = 'btn btn-secondary';
                        rejectBtn.textContent = 'Reject';
                        rejectBtn.onclick = () => this.respondBooking(booking.id, 'rejected');
                        actions.appendChild(acceptBtn);
                        actions.appendChild(rejectBtn);
                    }
                
                    if (booking.status === 'accepted') {
                        const completeBtn = document.createElement('button');
                        completeBtn.className = 'btn btn-complete';
                        completeBtn.textContent = 'Mark Completed';
                        completeBtn.onclick = () => this.respondBooking(booking.id, 'completed');
                        actions.appendChild(completeBtn);
                    }
                    container.appendChild(card);
                });
            }

            async respondBooking(bookingId, status) {
                const token = getCookie('token');
                if (!token) {
                    alert('Please log in to perform this action.');
                    return;
                }
                try {
                    const res = await fetch(`${API_BASE_URL}/booking/${bookingId}`, {
                        method: 'PUT',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/jsorendern'
                        },
                        body: JSON.stringify({ status, Status: status })
                    });
                    if (!res.ok) {
                        const error = await res.text();
                        throw new Error(error || 'Failed to update booking');
                    }
                    await this.fetchProviderBookings();
                } catch (error) {
                    alert(`Failed to update booking: ${error.message}`);
                }
            }

            setupEventListeners() {
                document.getElementById('show-create-form')?.addEventListener('click', () => this.showForm(false));
                document.getElementById('cancel-form')?.addEventListener('click', () => this.hideForm());
                document.getElementById('service-form')?.addEventListener('submit', (e) => this.createOrEditService(e));
            }
        }

        async function fetchProviderReviews(providerId) {
            if (!providerId) return [];
            try {
                const res = await fetch(`${API_BASE_URL}/reviews/provider?provider_id=${providerId}`);
                if (!res.ok) return [];
                let reviews = await res.json();
                reviews = Array.isArray(reviews) ? reviews : [reviews];
                return reviews.map(r => ({
                    id: r.id ?? r.ID,
                    rating: r.rating ?? r.Rating,
                    comment: r.comment ?? r.Comment ?? '',
                    createdAt: r.createdAt ?? r.CreatedAt,
                    booking_id: r.booking_id ?? r.BookingID ?? r.bookingId,
                    customer_id: r.customer_id ?? r.CustomerID ?? r.customerId,
                    service_id: r.service_id ?? r.ServiceID ?? r.serviceId,
                    customer: r.Customer ? (r.Customer.name || r.Customer.Name || 'Customer') : (r.customer_name || 'Customer'),
                    service: r.Service ? (r.Service.name || r.Service.Name || 'Service') : (r.service_name || 'Service'),
                }));
            } catch (e) {
                return [];
            }
        }

        function renderProviderReviews(providerId, containerId = 'provider-reviews-container') {
            const container = document.getElementById(containerId);
            if (!container) return;
            container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div>Loading your reviews...</div>';

            fetchProviderReviews(providerId).then(reviews => {
                if (!reviews.length) {
                    container.innerHTML = '<p class="no-data">No reviews yet for your services.</p>';
                    return;
                }
                container.innerHTML = '';
                reviews.forEach(review => {
                    const card = document.createElement('div');
                    card.className = 'review-card';
                    card.innerHTML = `
                        <div class="review-header">
                            <span class="review-stars">${renderStars(review.rating)}</span>
                            <span class="review-date">${formatDate(review.createdAt)}</span>
                        </div>
                        <div class="review-body">
                            <div class="review-service"><b>Service:</b> ${escapeHtml(review.service)}</div>
                            <div class="review-comment"><div>Comment: </div>${escapeHtml(review.comment)}</div>
                        </div>
                        <div class="review-footer">
                            <span class="review-customer"><b>By:</b> ${escapeHtml(review.customer)}</span>
                        </div>
                    `;
                    container.appendChild(card);
                });
            });
        }
        async function fetchReceivedAdminMessages() {
            const token = getCookie('token');
            if (!token) return [];
            const res = await fetch(`${API_BASE_URL}/messages/received`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) return [];
            const messages = await res.json();
            return Array.isArray(messages) ? messages : [];
        }

        function renderReceivedAdminMessages() {
            const container = document.getElementById('admin-messages-list');
            if (!container) return;

            container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div>Loading admin messages...</div>';

            fetchReceivedAdminMessages().then(messages => {
                if (!messages.length) {
                    container.innerHTML = '<div class="empty-message">No messages from admin.</div>';
                    return;
                }
                container.innerHTML = '';
                messages.forEach(msg => {
                    const msgDiv = document.createElement('div');
                    msgDiv.className = 'admin-message-item';
                    msgDiv.innerHTML = `
                        <div style="font-weight:bold; margin-bottom:0.25em;">${escapeHtml(msg.title || "Admin Message")}</div>
                        <div style="margin-bottom:0.5em; color:#334155;">
                            ${escapeHtml(msg.content || msg.Content)}
                        </div>
                        <div style="font-size:0.9em;color:#888;">${msg.created_at ? new Date(msg.created_at).toLocaleString() : ''}</div>
                        <hr>
                    `;
                    container.appendChild(msgDiv);
                });
            });
        }

        document.querySelector('.hamburger')?.addEventListener('click', function() {
            document.getElementById('nav-links')?.classList.toggle('active');
        });

        document.addEventListener('DOMContentLoaded', function() {
            document.querySelector('.hamburger')?.addEventListener('click', function() {
                document.getElementById('nav-links')?.classList.toggle('active');
            });

            document.querySelectorAll('.sidebar-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                document.querySelectorAll('.sidebar-btn').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                document.querySelectorAll('.dashboard-section').forEach(sec => sec.classList.remove('active'));
                const sectionId = this.getAttribute('data-section');
                document.getElementById(sectionId).classList.add('active');
                if (sectionId === 'dashboard-home') renderProviderDetails();
                if (sectionId === 'chat-section') renderConversationList(); 
            });
        });
            document.getElementById('profile-icon')?.addEventListener('click', function(e) {
                e.preventDefault();
                document.getElementById('auth-dropdown')?.classList.toggle('show');
            });
            document.addEventListener('click', function(e) {
                if (!e.target.closest('.profile-dropdown')) {
                    document.getElementById('auth-dropdown')?.classList.remove('show');
                }
            });
            document.addEventListener('keydown', function(e) {
                if (e.key === 'Escape') {
                    document.getElementById('auth-dropdown')?.classList.remove('show');
                }
            });

            new ProviderDashboard();
            setupDropdownLogic();
            showAuthUI();
            renderReceivedAdminMessages();
            renderProviderDetails(); 
        });
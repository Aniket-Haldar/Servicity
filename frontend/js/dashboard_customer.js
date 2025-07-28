const API_BASE_URL = 'https://servicity.onrender.com';

function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
}
function getToken() {
    return getCookie('token');
}

async function fetchCustomerId() {
    const token = getToken();
    if (!token) return null;
    try {
        const res = await fetch(`${API_BASE_URL}/profile/details`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) return null;
        const data = await res.json();
        return data.profile.UserID;
    } catch {
        return null;
    }
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
    if (!dateString) return "";
    try {
        const date = new Date(dateString);
        return isNaN(date.getTime()) ? "" : date.toLocaleString();
    } catch (e) {
        return "";
    }
}

function showBlockedScreen() {
    document.body.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#f8fafc;">
            <div style="background:#fff;padding:2.5em 2em;border-radius:12px;box-shadow:0 2px 24px #0002;text-align:center;">
                <h2 style="color:#ef4444;margin-bottom:1em;">Account Blocked</h2>
                <p style="color:#374151;font-size:1.1em;margin-bottom:2em;">
                    Your account has been blocked by the admin.<br>
                    You cannot access customer features.
                </p>
                <a href="./index.html" class="btn btn-primary" style="text-decoration:none;">Go to Home</a>
            </div>
        </div>
    `;
}

async function showAuthUI() {
    const token = getToken();
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

async function getCurrentCustomerUser() {
    const token = getToken();
    if (!token) return null;
    try {
        const res = await fetch(`${API_BASE_URL}/profile/details`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Not logged in');
        const data = await res.json();
    
        return {
            id: data.profile.UserID,
            name: data.name || data.Name || "",
            email: data.email || data.Email || ""
        };
    } catch {
        return null;
    }
}

async function renderCustomerConversationList(roomIdToHighlight = null) {
    const token = getToken();
    const list = document.getElementById('customer-conversation-list');
    list.innerHTML = '<div>Loading...</div>';
    const currentUser = await getCurrentCustomerUser();
    if (!currentUser) {
        list.innerHTML = '<div class="error-message">Please log in to view chats.</div>';
        return;
    }
    try {
        const res = await fetch(`${API_BASE_URL}/chat/rooms?user_id=${currentUser.id}`, {
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
            highlightId = localStorage.getItem('currentCustomerChatRoomId');
        }

        rooms.forEach(room => {
            const provider = room.provider || {};
            const displayName = provider.name || provider.email || "Provider";
            const lastMsg = room.last_message || room.lastMessage || {};
            const lastMsgContent = lastMsg.content || "";
            const lastMsgTime = lastMsg.created_at || lastMsg.createdAt || room.last_message_at || room.lastMessageAt || "";

            const item = document.createElement('div');
            item.className = 'conversation-item' + ((room.id === highlightId) ? ' active' : '');
            item.innerHTML = `
                <div class="conversation-title">${escapeHtml(displayName)}</div>
                <div class="conversation-snippet">${escapeHtml(lastMsgContent)}</div>
                <div class="conversation-time">${formatDate(lastMsgTime)}</div>
            `;
            item.onclick = () => {
                localStorage.setItem('currentCustomerChatRoomId', room.id);
                document.querySelectorAll('.conversation-item').forEach(el => el.classList.remove('active'));
                item.classList.add('active');
                openCustomerConversation(room);
            };
            list.appendChild(item);

            if (room.id === highlightId) {
                setTimeout(() => openCustomerConversation(room), 0);
            }
        });
    } catch (err) {
        list.innerHTML = '<div>Error loading conversations.</div>';
    }
}

async function openCustomerConversation(room) {
    const token = getToken();
    const currentUser = await getCurrentCustomerUser();

    localStorage.setItem('currentCustomerChatRoomId', room.id);

   
    document.getElementById('customer-chat-header').style.display = '';
    document.getElementById('customer-chat-input-container').style.display = '';

    const provider = room.provider || {};
    document.getElementById('customer-chat-user-name').innerText = provider.name || provider.email || 'Provider';
    document.getElementById('customer-chat-user-status').innerText = 'Online';

    const msgList = document.getElementById('customer-chat-messages');
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
    const isSent = msg.sender_id === currentUser.id;
    const messageTimeRaw = msg.created_at || msg.createdAt || msg.time || "";
    const messageTime = formatDate(messageTimeRaw);
    const messageContainer = document.createElement('div');
    messageContainer.className = 'message-container ' + (isSent ? 'sent' : 'received');

    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';

    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';
    bubble.textContent = msg.content;

    const time = document.createElement('span');
    time.className = 'message-time';
    time.textContent = messageTime;

    messageContent.appendChild(bubble);
    messageContent.appendChild(time);
    messageContainer.appendChild(messageContent);

    msgList.appendChild(messageContainer);
});

     
        msgList.scrollTop = msgList.scrollHeight;


        const chatForm = document.getElementById('customer-chat-form');
        chatForm.onsubmit = async function(e) {
            e.preventDefault();
            const input = document.getElementById('customer-chat-message-input');
            const content = input.value.trim();
            if (!content) return;

        
            let receiver_id = room.provider_id;

            try {
                const res = await fetch(`${API_BASE_URL}/chat/rooms/${room.id}/messages`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        sender_id: currentUser.id,
                        receiver_id,
                        content,
                        booking_id: room.booking_id || null
                    })
                });

                if (!res.ok) throw new Error('Failed to send message');
                input.value = '';
                await openCustomerConversation(room);
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
function setupSidebarTabs() {
    document.querySelectorAll('.sidebar-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.sidebar-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            document.querySelectorAll('.dashboard-section').forEach(sec => sec.classList.remove('active'));
            const sectionId = this.getAttribute('data-section');
            document.getElementById(sectionId).classList.add('active');
            if (sectionId === 'dashboard-home') fetchAndDisplayProfile();
            if (sectionId === 'bookings') fetchAndDisplayBookings();
            if (sectionId === 'admin-messages-section') renderReceivedAdminMessages();
           if (sectionId === 'customer-chat-section') renderCustomerConversationList();
        });
    });
}

let currentProfileId = null;
let userIsBlocked = false;
async function fetchAndDisplayProfile() {
    const profileInfo = document.getElementById('profile-info');
    if (!profileInfo) return;
    profileInfo.innerHTML = `<div class="loading-spinner"><div class="spinner"></div>Loading your profile...</div>`;
    const token = getToken();
    if (!token) {
        profileInfo.innerHTML = '<div class="error-message"><p>Please log in to view your profile.</p></div>';
        return;
    }
    try {
        const url = `${API_BASE_URL}/profile/details`;
        const response = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
        if (!response.ok) throw new Error('Failed to fetch profile');
        const data = await response.json();
        userIsBlocked = (data.blocked === true || data.blocked === 1);
        if (userIsBlocked) {
            showBlockedScreen();
            return;
        }
        currentProfileId = data.profile.ID;
        const phone = (data.profile && (data.profile.Phone || data.profile.phone)) || data.phone || '';
        const address = (data.profile && (data.profile.Address || data.profile.address)) || data.address || '';

        profileInfo.innerHTML = `
            <div class="profile-row"><label>Name:</label> <span>${escapeHtml(data.name || data.fullName || '')}</span></div>
            <div class="profile-row"><label>Email:</label> <span>${escapeHtml(data.email || '')}</span></div>
            <div class="profile-row"><label>Phone:</label> <span>${escapeHtml(phone)}</span></div>
            <div class="profile-row"><label>Address:</label> <span>${escapeHtml(address)}</span></div>
            <button class="btn btn-primary" id="edit-profile-btn" style="margin-top:1.3em" ${userIsBlocked ? 'disabled' : ''}><i class="fa fa-pen"></i> Edit</button>
            <form id="edit-profile-form" style="display:none;margin-top:1.5em;">
                <div class="profile-row"><label>Name:</label> <input type="text" id="edit-profile-name" required></div>
                <div class="profile-row"><label>Email:</label> <input type="email" id="edit-profile-email" required></div>
                <div class="profile-row"><label>Phone:</label> <input type="tel" id="edit-profile-phone" required></div>
                <div class="profile-row"><label>Address:</label> <input type="text" id="edit-profile-address" required></div>
                <div class="form-actions" style="margin-top:1.2em;display:flex;gap:1em;">
                    <button type="submit" class="btn btn-success">Save</button>
                    <button type="button" class="btn btn-secondary" id="cancel-edit-profile">Cancel</button>
                </div>
            </form>
        `;

        document.getElementById('edit-profile-name').value = data.name || data.fullName || '';
        document.getElementById('edit-profile-email').value = data.email || '';
        document.getElementById('edit-profile-phone').value = phone || '';
        document.getElementById('edit-profile-address').value = address || '';

        document.getElementById('edit-profile-btn').onclick = () => {
            document.getElementById('edit-profile-form').style.display = 'block';
            document.getElementById('edit-profile-btn').style.display = 'none';
        };

        document.getElementById('cancel-edit-profile').onclick = () => {
            fetchAndDisplayProfile();
        };

        document.getElementById('edit-profile-form').onsubmit = async function(e) {
            e.preventDefault();
            if (userIsBlocked) {
                alert('Your account is blocked. Action not allowed.');
                return;
            }
            const updatedData = {
                name: document.getElementById('edit-profile-name').value,
                email: document.getElementById('edit-profile-email').value,
                phone: document.getElementById('edit-profile-phone').value,
                address: document.getElementById('edit-profile-address').value,
                Role: "Customer"
            };
            try {
                const response = await fetch(`${API_BASE_URL}/profile/${currentProfileId}`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(updatedData)
                });
                if (!response.ok) throw new Error('Failed to update profile');
                fetchAndDisplayProfile();
            } catch (err) {
                alert('Failed to update profile.');
            }
        };
    } catch (error) {
        profileInfo.innerHTML = `<div class="error-message"><p>Error loading profile.<br>${error.message}</p></div>`;
    }
}

async function fetchAndDisplayBookings() {
    const bookingsList = document.getElementById('bookings-list');
    if (!bookingsList) return;
    if (userIsBlocked) {
        bookingsList.innerHTML = `<div class="error-message"><p>Your account is blocked. You cannot view bookings.</p></div>`;
        return;
    }
    bookingsList.innerHTML = `<div class="loading-spinner"><div class="spinner"></div>Loading your bookings...</div>`;
    const token = getToken();
    if (!token) {
        bookingsList.innerHTML = '<div class="error-message"><p>Please log in to view your bookings.</p></div>';
        return;
    }
    try {
        const [response, customerId] = await Promise.all([
            fetch(`${API_BASE_URL}/booking`, { headers: { 'Authorization': `Bearer ${token}` } }),
            fetchCustomerId()
        ]);
        if (!response.ok) throw new Error('Failed to fetch bookings');
        let data = await response.json();

        const now = Date.now();
        const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
        const oldBookings = data.filter(b => {
            const bookingTime = new Date(b.booking_time).getTime();
            return !isNaN(bookingTime) && (now - bookingTime > oneWeekMs);
        });

       
        for (const b of oldBookings) {
            try {
                await fetch(`${API_BASE_URL}/booking/${b.id || b.ID}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
            } catch (err) {
                console.warn('Failed to auto-delete old booking:', b.id || b.ID, err);
            }
        }

      
        data = data.filter(b => {
            const bookingTime = new Date(b.booking_time).getTime();
            return isNaN(bookingTime) || (now - bookingTime <= oneWeekMs);
        });

        bookingsList.innerHTML = '';
        if (Array.isArray(data) && data.length) {
            data.forEach(b => {
                const card = document.createElement('div');
                card.className = "booking-card";
                card.innerHTML = `
                    <div class="profile-row"><label>Service:</label> <span>${escapeHtml(b.serviceName || b.service_id || "Service")}</span></div>
                    <div class="profile-row"><label>Date:</label> <span>${formatDate(b.booking_time)}</span></div>
                    <div class="profile-row"><label>Email:</label> <span>${escapeHtml(b.email || '')}</span></div>
                    <div class="profile-row"><label>Phone:</label> <span>${escapeHtml(b.phone || '')}</span></div>
                    <div class="profile-row"><label>Address:</label> <span>${escapeHtml(b.address || '')}</span></div>
                    <div class="profile-row"><label>Status:</label> <span class="status-label">${escapeHtml(b.status || "Pending")}</span></div>
                    <div class="booking-actions">
                        <button class="btn btn-primary edit-booking-btn" data-booking-id="${b.id || b.ID}" ${userIsBlocked ? 'disabled' : ''}>Edit</button>
                        <button class="btn btn-secondary cancel-booking-btn" data-booking-id="${b.id || b.ID}" ${userIsBlocked ? 'disabled' : ''}>Cancel</button>
                    </div>
                `;
                bookingsList.appendChild(card);
                const actionsContainer = card.querySelector('.booking-actions');
                if ((b.status || '').toLowerCase() === 'completed' && typeof addReviewButtonToBooking === 'function') {
                    addReviewButtonToBooking(b, actionsContainer, customerId);
                }
            });
            setupBookingActions(data);
        } else {
            bookingsList.innerHTML = '<p class="no-data">No bookings found yet.</p>';
        }
    } catch (error) {
        bookingsList.innerHTML = `<div class="error-message"><p>Error loading bookings.<br>${error.message}</p></div>`;
    }
}
function setupBookingActions(bookings) {
    document.querySelectorAll('.edit-booking-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const bookingId = this.getAttribute('data-booking-id');
            const booking = bookings.find(b => String(b.id || b.ID) === String(bookingId));
            if (booking) {
                document.getElementById('edit-booking-id').value = booking.id || booking.ID;
                document.getElementById('edit-booking-date').value = booking.booking_time ? booking.booking_time.split('T')[0] : '';
                document.getElementById('edit-booking-phone').value = booking.phone || '';
                document.getElementById('edit-booking-address').value = booking.address || '';
                document.getElementById('edit-booking-modal').style.display = 'block';
            }
        });
    });
    document.querySelectorAll('.cancel-booking-btn').forEach(btn => {
        btn.addEventListener('click', async function() {
            const bookingId = this.getAttribute('data-booking-id');
            if (!bookingId) {
                alert('Missing booking id.');
                return;
            }
            if (!confirm('Are you sure you want to cancel this booking?')) return;
            const token = getToken();
            try {
                const response = await fetch(`${API_BASE_URL}/booking/${bookingId}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!response.ok) throw new Error('Failed to cancel booking');
                await fetchAndDisplayBookings();
            } catch (err) {
                alert('Failed to cancel booking.');
            }
        });
    });
}
document.getElementById('close-edit-booking')?.addEventListener('click', () => {
    document.getElementById('edit-booking-modal').style.display = 'none';
});
document.getElementById('edit-booking-form')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    if (userIsBlocked) {
        alert('Your account is blocked. Action not allowed.');
        return;
    }
    const id = document.getElementById('edit-booking-id').value;
    const date = document.getElementById('edit-booking-date').value;
    const phone = document.getElementById('edit-booking-phone').value;
    const address = document.getElementById('edit-booking-address').value;
    const token = getToken();
    try {
        const response = await fetch(`${API_BASE_URL}/booking/${id}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                booking_time: new Date(date).toISOString(),
                phone,
                address
            })
        });
        if (!response.ok) throw new Error('Failed to update booking');
        document.getElementById('edit-booking-modal').style.display = 'none';
        await fetchAndDisplayBookings();
    } catch (err) {
        alert('Failed to update booking.');
    }
});

async function renderReceivedAdminMessages() {
    const container = document.getElementById('admin-messages-list');
    if (!container) return;
    container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div>Loading admin messages...</div>';
    const token = getToken();
    if (!token) {
        container.innerHTML = '<div class="error-message"><p>Please log in to view messages.</p></div>';
        return;
    }
    try {
        const res = await fetch(`${API_BASE_URL}/messages/received`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to fetch admin messages');
        const messages = await res.json();
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
    } catch (error) {
        container.innerHTML = `<div class="error-message"><p>Error loading admin messages.<br>${error.message}</p></div>`;
    }
}

async function renderReceivedProviderMessages() {
    const container = document.getElementById('provider-messages-list');
    if (!container) return;
    container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div>Loading provider messages...</div>';
    const token = getToken();
    if (!token) {
        container.innerHTML = '<div class="error-message"><p>Please log in to view messages.</p></div>';
        return;
    }
    try {
        const res = await fetch(`${API_BASE_URL}/messages/provider`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to fetch provider messages');
        const messages = await res.json();
        if (!messages.length) {
            container.innerHTML = '<div class="empty-message">No messages from providers.</div>';
            return;
        }
        container.innerHTML = '';
        messages.forEach(msg => {
            const booking = msg.booking || msg.Booking;
            const bookingInfo = booking ? `
                <div style="background:#f6f7fa;padding:0.5em 1em;border-radius:7px;margin-bottom:0.7em;">
                    <div><b>Service:</b> ${escapeHtml(booking.Service?.name || booking.Service?.Name || 'Service')}</div>
                    <div><b>Date:</b> ${formatDate(booking.booking_time || booking.BookingTime)}</div>
                    <div><b>Status:</b> ${escapeHtml(booking.status || booking.Status || '')}</div>
                    <div><b>Address:</b> ${escapeHtml(booking.address || '')}</div>
                    ${booking.special_notes ? `<div><b>Notes:</b> ${escapeHtml(booking.special_notes)}</div>` : ''}
                </div>
            ` : '';
            const msgDiv = document.createElement('div');
            msgDiv.className = 'admin-message-item';
            msgDiv.innerHTML = `
                <div style="font-weight:bold; margin-bottom:0.25em;">${escapeHtml(msg.title || "Provider Message")}</div>
                <div style="margin-bottom:0.5em; color:#334155;">${escapeHtml(msg.content || msg.Content)}</div>
                ${bookingInfo}
                <div style="font-size:0.9em;color:#888;">${messageTime}</div>
                <hr>
            `;
            container.appendChild(msgDiv);
        });
    } catch (error) {
        container.innerHTML = `<div class="error-message"><p>Error loading provider messages.<br>${error.message}</p></div>`;
    }
}

document.querySelector('.hamburger')?.addEventListener('click', function() {
    document.getElementById('nav-links')?.classList.toggle('active');
});

document.addEventListener('DOMContentLoaded', function() {
    setupDropdownLogic();
    setupSidebarTabs();
    showAuthUI();
    fetchAndDisplayProfile();
    fetchAndDisplayBookings();
    renderReceivedAdminMessages();
    renderCustomerConversationList();
});
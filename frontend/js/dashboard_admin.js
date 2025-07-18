const API_BASE = "http://127.0.0.1:3000/admin";
const API_BASE_URL = "http://127.0.0.1:3000";
let currentProviderRequestId = null;

function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
}

function updateAuthDropdownUI(isAuthenticated, user) {
    const userInfo = document.getElementById('user-info');
    const googleLogin = document.getElementById('google-login');
    const userNameSpan = document.querySelector('.user-name');
    const userEmailDiv = document.querySelector('.user-email');
    if (isAuthenticated) {
        if (googleLogin) googleLogin.style.display = "none";
        if (userInfo) userInfo.style.display = "block";
        if (userNameSpan) userNameSpan.textContent = user?.name || '';
        if (userEmailDiv) userEmailDiv.textContent = user?.email || '';
    } else {
        if (userInfo) userInfo.style.display = "none";
        if (googleLogin) googleLogin.style.display = "block";
        if (userNameSpan) userNameSpan.textContent = "";
        if (userEmailDiv) userEmailDiv.textContent = "";
    }
}

function getAuthHeader() {
    const token = getCookie('token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
}

async function showAuthUI() {
    const token = getCookie('token');
    if (!token) {
        updateAuthDropdownUI(false);
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
        updateAuthDropdownUI(true, data);
    } catch {
        updateAuthDropdownUI(false);
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
        updateAuthDropdownUI(false);
        window.location.href = "index.html";
    });
}

async function checkAdminAuth() {
    const token = getCookie('token');
    if (!token) {
        updateAuthDropdownUI(false);
        showAuthError("You must be logged in as an admin to access the dashboard.");
        return false;
    }
    try {
        const res = await fetch(`${API_BASE_URL}/profile/details`, {
            headers: {
                ...getAuthHeader(),
                'Content-Type': 'application/json'
            }
        });
        if (!res.ok) {
            updateAuthDropdownUI(false);
            showAuthError("Session expired or unauthorized. Please log in again.");
            return false;
        }
        const user = await res.json();

        if (!user.role || user.role.toLowerCase() !== 'admin') {
            updateAuthDropdownUI(false);
            showAuthError("Access denied. Admins only.");
            return false;
        }
        updateAuthDropdownUI(true, user);
        return true;
    } catch (error) {
        updateAuthDropdownUI(false);
        showAuthError("Login check failed. Please try again.");
        return false;
    }
}

function showAuthError(msg) {
    document.body.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#f8fafc;">
            <div style="background:#fff;padding:2.5em 2em;border-radius:12px;box-shadow:0 2px 24px #0002;text-align:center;">
                <h2 style="color:#ef4444;margin-bottom:1em;">Admin Access Required</h2>
                <p style="color:#374151;font-size:1.1em;margin-bottom:2em;">${msg}</p>
                <a href="./index.html" class="btn btn-primary" style="text-decoration:none;">Go to Home</a>
            </div>
        </div>
    `;
}

async function showAdminRequestsTabIfSuperAdmin() {
    const token = getCookie('token');
    if (!token) return;
    try {
        const res = await fetch(`${API_BASE_URL}/profile/details`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (!res.ok) return;
        const data = await res.json();
        if (data.email === "aniket.haldar05@gmail.com") {
            document.getElementById('admin-requests-btn').style.display = "";
        }
    } catch (e) {}
}

function renderProviderRequests(status) {
    const list = document.getElementById('provider-requests-list');
    list.innerHTML = '<div class="loading-spinner"><div class="spinner"></div>Loading provider requests...</div>';
    const url = `${API_BASE}/provider-requests${status ? `?status=${status}` : ''}`;
    fetch(url, { headers: getAuthHeader() })
        .then(res => res.json())
        .then(requests => {
            list.innerHTML = '';
            if (!Array.isArray(requests) || requests.length === 0) {
                list.innerHTML = '<div class="empty-message">No provider requests found.</div>';
                return;
            }
            requests.forEach(req => {
                const reqDiv = document.createElement('div');
                reqDiv.className = 'provider-request-item';
                reqDiv.innerHTML = `
                    <div class="request-header">
                        <div class="provider-info">
                            <h4>${req.user_name} (${req.user_email})</h4>
                        
                        </div>
                        <span class="status-badge ${req.status.toLowerCase()}">${req.status}</span>
                    </div>
                    <div class="request-details">
                        <div class="detail-item">
                            <strong>Requested On</strong>
                            <span>${new Date(req.created_at).toLocaleDateString()}</span>
                        </div>
                    </div>
                    ${
                        req.status === "Pending"
                        ? `<div class="request-actions">
                            <button class="btn-approve" onclick="approveAdminRequest(${req.ID})">✓ Approve</button>
                            <button class="btn-reject" onclick="rejectAdminRequest(${req.ID})">✗ Reject</button>
                        </div>`
                        : ""
                    }
                `;
                list.appendChild(reqDiv);
            });
        })
        .catch(() => {
            list.innerHTML = '<div class="error-message">Failed to load provider requests.</div>';
        });
}
function openProviderModal(providerId, suggestedStatus) {
    currentProviderRequestId = providerId;
    const modal = document.getElementById('provider-request-modal');
    const form = document.getElementById('provider-status-form');
    form.reset();
    document.getElementById('reason-group').style.display = 'none';
    if (suggestedStatus) {
        const radio = document.querySelector(`input[name="status"][value="${suggestedStatus}"]`);
        if (radio) {
            radio.checked = true;
            if (suggestedStatus === 'Rejected') {
                document.getElementById('reason-group').style.display = 'block';
            }
        }
    }
    modal.style.display = 'flex';
}

function closeProviderModal() {
    document.getElementById('provider-request-modal').style.display = 'none';
    currentProviderRequestId = null;
}

function updateProviderStatus() {
    if (!currentProviderRequestId) return;
    const status = document.querySelector('input[name="status"]:checked').value;
    const reason = document.getElementById('rejection-reason').value.trim();
    const data = { status };
    if (status === 'Rejected' && reason) {
        data.reason = reason;
    }
    fetch(`${API_BASE}/provider-requests/${currentProviderRequestId}/status`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            ...getAuthHeader()
        },
        body: JSON.stringify(data)
    })
    .then(res => res.json())
    .then(response => {
        if (response.status === 'success') {
            closeProviderModal();
            const activeTab = document.querySelector('#section-provider-requests .tab-btn.active');
            renderProviderRequests(activeTab.getAttribute('data-status'));
            const messageDiv = document.createElement('div');
            messageDiv.className = 'success-message';
            messageDiv.textContent = response.message;
            messageDiv.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: var(--accent);
                color: white;
                padding: 1em 1.5em;
                border-radius: 6px;
                z-index: 1001;
            `;
            document.body.appendChild(messageDiv);
            setTimeout(() => messageDiv.remove(), 3000);
        } else {
            alert('Error: ' + (response.error || 'Failed to update status'));
        }
    })
    .catch(err => {
        console.error('Error updating status:', err);
        alert('Failed to update provider status');
    });
}

function renderAnalytics() {
    fetch(`${API_BASE}/analytics`, { headers: getAuthHeader() })
        .then(res => res.json())
        .then(data => {
            if (!data || !Array.isArray(data.popular_services) || !Array.isArray(data.top_providers)) {
                document.getElementById('popular-services').innerHTML = '<li>Failed to load analytics.</li>';
                document.getElementById('top-providers').innerHTML = '';
                return;
            }
            const popular = data.popular_services;
            const top = data.top_providers;
            const ulPop = document.getElementById('popular-services');
            const ulTop = document.getElementById('top-providers');
            ulPop.innerHTML = '';
            ulTop.innerHTML = '';
            popular.forEach(svc => {
                const li = document.createElement('li');
                li.textContent = `${svc.name} (${svc.count} bookings)`;
                ulPop.appendChild(li);
            });
            top.forEach(prv => {
                const li = document.createElement('li');
                li.textContent = `${prv.name} - ⭐ ${prv.rating.toFixed(2)}`;
                ulTop.appendChild(li);
            });
        })
        .catch(() => {
            document.getElementById('popular-services').innerHTML = '<li>Failed to load analytics.</li>';
            document.getElementById('top-providers').innerHTML = '';
        });
}

async function renderUsers(type) {
    try {
        const [usersRes, providersRes] = await Promise.all([
            fetch(`${API_BASE}/users?role=${type}`, { headers: getAuthHeader() }),
            type === 'Provider' ? 
                fetch(`${API_BASE}/provider-requests?status=Approved`, { headers: getAuthHeader() }) : 
                Promise.resolve({ json: () => [] })
        ]);
        const users = await usersRes.json();
        const approvedProviders = await providersRes.json();
        const list = document.getElementById('users-list');
        list.innerHTML = '';
        if (!Array.isArray(users)) {
            list.innerHTML = '<div class="error-message">Failed to load users. Please log in again.</div>';
            return;
        }
        let filteredUsers = users;
        if (type === 'Provider' && Array.isArray(approvedProviders)) {
            const approvedUserIds = approvedProviders.map(p => p.user_id);
            filteredUsers = users.filter(user => approvedUserIds.includes(user.ID));
        }
        if (filteredUsers.length === 0) {
            list.innerHTML = `<div class="empty-message">No ${type === 'Provider' ? 'approved providers' : 'customers'} found.</div>`;
            return;
        }
        filteredUsers.forEach(user => {
            const row = document.createElement('div');
            row.className = 'user-row';
            row.innerHTML = `
                <div class="user-info">
                    <strong>${user.name}</strong> <span style="color:#64748b;">${user.email}</span>
                    ${user.blocked ? '<span style="color:#ef4444;font-weight:500;margin-left:1em;">Blocked</span>' : ''}
                    ${type === 'Provider' ? '<span style="color:#27AE60;font-weight:500;margin-left:1em;">✓ Approved</span>' : ''}
                </div>
                <div class="user-actions">
                    <button class="${user.blocked ? 'unblock' : ''}" data-id="${user.ID}" data-type="${type}" data-blocked="${user.blocked}">
                        ${user.blocked ? 'Unblock' : 'Block'}
                    </button>
                </div>
            `;
            list.appendChild(row);
        });
    } catch (error) {
        document.getElementById('users-list').innerHTML = '<div class="error-message">Failed to load users. Please log in again.</div>';
    }
}

function renderCategories() {
    fetch(`${API_BASE}/categories`, { headers: getAuthHeader() })
        .then(res => res.json())
        .then(categories => {
            const list = document.getElementById('categories-list');
            list.innerHTML = '';
            if (!Array.isArray(categories)) {
                list.innerHTML = '<li>Failed to load categories.</li>';
                return;
            }
            categories.forEach(cat => {
                const row = document.createElement('li');
                row.className = 'category-row';
                row.innerHTML = `
                    <span>${cat}</span>
                    <button data-category="${cat}">Remove</button>
                `;
                list.appendChild(row);
            });
        })
        .catch(() => {
            document.getElementById('categories-list').innerHTML = '<li>Failed to load categories.</li>';
        });
}

function renderSentMessages() {
    const sentMessagesDiv = document.getElementById('sent-messages');
    if (!sentMessagesDiv) return;
    sentMessagesDiv.innerHTML = `<div class="loading-spinner"><div class="spinner"></div>Loading sent messages...</div>`;
    fetch(`${API_BASE}/messages/sent`, { headers: getAuthHeader() })
        .then(res => res.json())
        .then(messages => {
            sentMessagesDiv.innerHTML = '';
            if (!Array.isArray(messages) || !messages.length) {
                sentMessagesDiv.innerHTML = '<div class="empty-message">No messages sent yet.</div>';
                return;
            }
            messages.forEach(msg => {
                const msgDiv = document.createElement('div');
                msgDiv.className = 'sent-message-item';
                msgDiv.innerHTML = `
                    <div>
                        <strong>To:</strong> ${msg.target_role}
                        <span style="float:right; color:#888; font-size:0.9em;">
                            ${msg.created_at ? new Date(msg.created_at).toLocaleString() : ''}
                        </span>
                    </div>
                    <div style="margin: 0.5em 0 1em 0; color:#334155;">
                        ${msg.Content}
                    </div>
                `;
                sentMessagesDiv.appendChild(msgDiv);
            });
        })
        .catch(() => {
            sentMessagesDiv.innerHTML = '<div class="error-message">Failed to load sent messages.</div>';
        });
}


function renderAdminRequests() {
    const list = document.getElementById('admin-requests-list');
    list.innerHTML = '<div class="loading-spinner"><div class="spinner"></div>Loading admin requests...</div>';
    fetch(`${API_BASE}/requests`, { headers: getAuthHeader() })
        .then(res => res.json())
        .then(requests => {
            list.innerHTML = '';
            if (!Array.isArray(requests) || requests.length === 0) {
                list.innerHTML = '<div class="empty-message">No pending admin requests.</div>';
                return;
            }
            requests.forEach(req => {
                console.log(req);
                const reqDiv = document.createElement('div');
                reqDiv.className = 'provider-request-item';
                reqDiv.innerHTML = `
                    <div class="request-header">
                        <div class="provider-info">
                            <h4>Name: ${req.user_name}</h4>
                            <p>Email:${req.user_email}</p>
                            <p>Message: ${req.message}</p>
                        </div>
                        <span class="status-badge ${req.status.toLowerCase()}">${req.status}</span>
                    </div>
                    <div class="request-details">
                        <div class="detail-item">
                            <strong>Requested On</strong>
                            <span>${new Date(req.created_at).toLocaleDateString()}</span>
                        </div>
                    </div>
                    <div class="request-actions">
                        <button class="btn-approve" onclick="approveAdminRequest(${req.ID})">✓ Approve</button>
                        <button class="btn-reject" onclick="rejectAdminRequest(${req.ID})">✗ Reject</button>
                    </div>
                `;
                list.appendChild(reqDiv);
            });
        })
        .catch(() => {
            list.innerHTML = '<div class="error-message">Failed to load admin requests.</div>';
        });
}

window.approveAdminRequest = function(id) {
    fetch(`${API_BASE}/requests/${id}/approve`, {
        method: "POST",
        headers: getAuthHeader()
    }).then(() => renderAdminRequests());
};

window.rejectAdminRequest = function(id) {
    fetch(`${API_BASE}/requests/${id}/reject`, {
        method: "POST",
        headers: getAuthHeader()
    }).then(() => renderAdminRequests());
};

document.addEventListener('DOMContentLoaded', async () => {
    const isAdmin = await checkAdminAuth();
    if (!isAdmin) return;
    showAdminRequestsTabIfSuperAdmin();

    document.querySelectorAll('.sidebar-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.sidebar-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            const section = this.getAttribute('data-section');
            document.querySelectorAll('.dashboard-section').forEach(sec => sec.classList.remove('active'));
            document.getElementById('section-' + section).classList.add('active');
            if (section === 'provider-requests') {
                renderProviderRequests('');
            }
            if (section === 'admin-requests') {
                renderAdminRequests();
            }
        });
    });

    renderAnalytics();

    const userTabs = document.querySelectorAll('#section-users .tab-btn');
    userTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            userTabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            renderUsers(this.getAttribute('data-type'));
        });
    });
    renderUsers('Provider');

    const requestTabs = document.querySelectorAll('#section-provider-requests .tab-btn');
    requestTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            requestTabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            renderProviderRequests(this.getAttribute('data-status'));
        });
    });

    document.getElementById('provider-status-form').addEventListener('submit', function(e) {
        e.preventDefault();
        updateProviderStatus();
    });

    document.querySelectorAll('input[name="status"]').forEach(radio => {
        radio.addEventListener('change', function() {
            const reasonGroup = document.getElementById('reason-group');
            reasonGroup.style.display = this.value === 'Rejected' ? 'block' : 'none';
        });
    });

    renderCategories();
    document.getElementById('add-category-form').addEventListener('submit', function(e) {
        e.preventDefault();
        const input = document.getElementById('new-category-input');
        const val = input.value.trim();
        if (val) {
            fetch(`${API_BASE}/categories`, {
                method: "POST",
                headers: {
                    'Content-Type': 'application/json',
                    ...getAuthHeader()
                },
                body: JSON.stringify({ category: val })
            }).then(res => res.json()).then(() => {
                renderCategories();
                input.value = '';
            });
        }
    });

    document.getElementById('categories-list').addEventListener('click', function(e) {
        if (e.target.tagName === "BUTTON") {
            const cat = e.target.dataset.category;
            fetch(`${API_BASE}/categories/${encodeURIComponent(cat)}`, {
                method: "DELETE",
                headers: getAuthHeader()
            }).then(() => renderCategories());
        }
    });

    document.getElementById('users-list').addEventListener('click', function(e) {
        if (e.target.tagName === "BUTTON") {
            const id = e.target.dataset.id;
            const type = e.target.dataset.type;
            const blocked = e.target.dataset.blocked === 'true';
            fetch(`${API_BASE}/users/${id}/blocked`, {
                method: "PUT",
                headers: {
                    'Content-Type': 'application/json',
                    ...getAuthHeader()
                },
                body: JSON.stringify({ blocked: !blocked })
            }).then(() => renderUsers(type));
        }
    });

    document.getElementById('message-form').addEventListener('submit', function(e) {
        e.preventDefault();
        const target = document.getElementById('message-target').value;
        const content = document.getElementById('message-content').value.trim();
        if (!content) return;
        fetch(`${API_BASE}/messages`, {
            method: "POST",
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeader()
            },
            body: JSON.stringify({ target_role: target, content })
        }).then(res => res.json()).then(() => {
            document.getElementById('message-status').textContent = `Message sent to ${target}`;
            setTimeout(() => document.getElementById('message-status').textContent = '', 2000);
            document.getElementById('message-form').reset();
            renderSentMessages();
        });
    });

    renderSentMessages();
    showAuthUI();
    setupDropdownLogic();

    window.addEventListener('click', function(e) {
        const modal = document.getElementById('provider-request-modal');
        if (e.target === modal) {
            closeProviderModal();
        }
    });
});

window.openProviderModal = openProviderModal;
window.closeProviderModal = closeProviderModal;
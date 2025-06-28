const API_BASE = "http://localhost:3000/admin";
const API_BASE_URL = "http://localhost:3000";

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
        // Optionally update UI immediately if you are not redirecting
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

document.addEventListener('DOMContentLoaded', async () => {
    const isAdmin = await checkAdminAuth();
    if (!isAdmin) return;

    document.querySelectorAll('.sidebar-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.sidebar-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            const section = this.getAttribute('data-section');
            document.querySelectorAll('.dashboard-section').forEach(sec => sec.classList.remove('active'));
            document.getElementById('section-' + section).classList.add('active');
        });
    });

    renderAnalytics();

    const userTabs = document.querySelectorAll('.tab-btn');
    userTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            userTabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            renderUsers(this.getAttribute('data-type'));
        });
    });
    renderUsers('Provider');

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

    // Send custom messages
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
});

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

function renderUsers(type) {
    fetch(`${API_BASE}/users?role=${type}`, { headers: getAuthHeader() })
        .then(res => res.json())
        .then(users => {
            const list = document.getElementById('users-list');
            list.innerHTML = '';
            if (!Array.isArray(users)) {
                list.innerHTML = '<div class="error-message">Failed to load users. Please log in again.</div>';
                return;
            }
            users.forEach(user => {
                const row = document.createElement('div');
                row.className = 'user-row';
                row.innerHTML = `
                    <div class="user-info">
                        <strong>${user.name}</strong> <span style="color:#64748b;">${user.email}</span>
                        ${user.blocked ? '<span style="color:#ef4444;font-weight:500;margin-left:1em;">Blocked</span>' : ''}
                    </div>
                    <div class="user-actions">
                        <button class="${user.blocked ? 'unblock' : ''}" data-id="${user.ID}" data-type="${type}" data-blocked="${user.blocked}">
                            ${user.blocked ? 'Unblock' : 'Block'}
                        </button>
                    </div>
                `;
                list.appendChild(row);
            });
        })
        .catch(() => {
            document.getElementById('users-list').innerHTML = '<div class="error-message">Failed to load users. Please log in again.</div>';
        });
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
const API_BASE = "http://localhost:3000/admin";
const API_BASE_URL = "http://localhost:3000";

function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
}

function getAuthHeader() {
    const token = getCookie('token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
}

async function checkAdminAuth() {
    const token = getCookie('token');
    if (!token) {
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
            showAuthError("Session expired or unauthorized. Please log in again.");
            return false;
        }
        const user = await res.json();
      
        if (!user.role || user.role.toLowerCase() !== 'admin') {
            showAuthError("Access denied. Admins only.");
            return false;
        }
        document.querySelector('.user-name').textContent = user.name || '';
        if (document.querySelector('.user-email')) document.querySelector('.user-email').textContent = user.email || '';
        document.getElementById('user-info').style.display = 'block';
        return true;
    } catch (error) {
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
        });
    });


    document.getElementById('logout-btn').addEventListener('click', function(e) {
        e.preventDefault();
        localStorage.removeItem('token');
        document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        window.location.href = "./index.html";
    });

    const profileIcon = document.getElementById('profile-icon');
    if (profileIcon) {
        profileIcon.addEventListener('click', function(e) {
            e.preventDefault();
            const authDropdown = document.getElementById('auth-dropdown');
            if (authDropdown) authDropdown.classList.toggle('show');
        });
    }
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.profile-dropdown')) {
            const authDropdown = document.getElementById('auth-dropdown');
            if (authDropdown) authDropdown.classList.remove('show');
        }
    });
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
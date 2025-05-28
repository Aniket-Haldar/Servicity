const urlParams = new URLSearchParams(window.location.search);
const token = urlParams.get("token");

if (!token) {
    alert("No token found!");
    window.location.href = "/";
} else {
    localStorage.setItem("token", token);

    fetch("http://localhost:3000/profile", {
        headers: { "Authorization": token }
    })
    .then(res => res.json())
    .then(data => {
        const role = data.role;
        if (!role || role === "customer") {
            window.location.href = "/frontend/html/select-role.html";
        } else if (role === "provider") {
            window.location.href = "/provider/dashboard.html";
        } else if (role === "customer") {
            window.location.href = "/customer/dashboard.html";
        }
    })
    .catch(err => {
        console.error("Auth failed:", err);
        window.location.href = "/";
    });
}

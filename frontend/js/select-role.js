function selectRole(role) {
  const token = localStorage.getItem("token");

  if (!token) {
    alert("You are not logged in.");
    window.location.href = "/login.html";
    return;
  }

  fetch("http://localhost:5500/frontend/html/set-role.html", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": token,
    },
    body: JSON.stringify({ role })
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      // Redirect based on role
      if (role === "provider") {
        window.location.href = "/provider/dashboard.html";
      } else {
        window.location.href = "/customer/dashboard.html";
      }
    } else {
      document.getElementById("status").innerText = data.error || "Failed to set role.";
    }
  })
  .catch(err => {
    console.error("Error setting role:", err);
    document.getElementById("status").innerText = "Something went wrong.";
  });
}

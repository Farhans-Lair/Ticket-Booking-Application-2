// Auth guard
const token = localStorage.getItem("token");

if (!token) {
  alert("Please login first");
  window.location.href = "/";
}

// Logout
function logout() {
  localStorage.removeItem("token");
  window.location.href = "/";
}

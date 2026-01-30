async function register() {
  const email = document.getElementById("reg-email").value;
  const password = document.getElementById("reg-password").value;

  try {
    await apiRequest("/auth/register", "POST", {
      email,
      password
    });

    alert("Registration successful. Please log in.");
  } catch (err) {
    alert("Registration failed: " + err.message);
  }
}

async function login() {
  const email = document.getElementById("login-email").value;
  const password = document.getElementById("login-password").value;

  try {
    const response = await apiRequest("/auth/login", "POST", {
      email,
      password
    });

    // Save JWT
    localStorage.setItem("token", response.token);

    // Redirect to events page
    window.location.href = "events.html";
  } catch (err) {
    alert("Login failed: " + err.message);
  }
}

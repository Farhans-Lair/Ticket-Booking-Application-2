async function register() {
  const name = document.getElementById("registerName").value;
  const email = document.getElementById("registerEmail").value;
  const password = document.getElementById("registerPassword").value;

  if (!name || !email || !password) {
    alert("Please fill all fields");
    return;
  }

  try {
    await apiRequest("/auth/register", "POST", {
      name,
      email,
      password
    });

    alert("Registration successful. Please login.");

    // Optional: clear fields
    document.getElementById("registerName").value = "";
    document.getElementById("registerEmail").value = "";
    document.getElementById("registerPassword").value = "";

  } catch (err) {
    alert("Registration failed: " + err.message);
  }
}

async function login() {
  const email = document.getElementById("loginEmail").value;
  const password = document.getElementById("loginPassword").value;

  if (!email || !password) {
    alert("Please enter email and password");
    return;
  }

  try {
    const response = await apiRequest("/auth/login", "POST", {
      email,
      password
    });

    localStorage.setItem("token", response.token);

    window.location.href = "events.html";
  } catch (err) {
    alert("Login failed: " + err.message);
  }
}

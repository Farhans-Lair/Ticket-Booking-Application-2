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

  try {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email, password })
    });

   // ✅ Parse response ONCE
    const data = await res.json();

    // ❌ Stop immediately if credentials are invalid
    if (!res.ok) {
      alert("Invalid credentials");
      return;
    }

    // ✅ Store auth data
    localStorage.setItem("token", data.token);
    localStorage.setItem("role", data.role);

    
    // ✅ Only ONE admin redirect
    if (data.role === "admin") {
      window.location.href = "/admin";
    } else {
      window.location.href = "/events";
    }

  } catch (err) {
    alert("Login failed");
  }
}

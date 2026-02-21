async function register() {

  const name =
    document.getElementById("registerName").value;

  const email =
    document.getElementById("registerEmail").value;

  const password =
    document.getElementById("registerPassword").value;

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

    document.getElementById("registerName").value = "";
    document.getElementById("registerEmail").value = "";
    document.getElementById("registerPassword").value = "";

  } catch (err) {

    alert("Registration failed: " + err.message);

  }
}



// ======================
// LOGIN
// ======================
async function login() {

  const email =
    document.getElementById("loginEmail").value;

  const password =
    document.getElementById("loginPassword").value;

  try {

    const res = await fetch(
      `${API_BASE_URL}/auth/login`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email,
          password
        })
      }
    );

    const data = await res.json();

    if (!res.ok) {

      alert(data.error || "Invalid credentials");
      return;

    }

    localStorage.setItem("token", data.token);
    localStorage.setItem("role", data.role);


    // =====================
    // ROLE BASED REDIRECT
    // =====================

    if (data.role === "admin") {

      window.location.href = "/admin-dashboard.html";

    } else {

      window.location.href = "/events.html";

    }

  } catch (err) {

    console.error(err);
    alert("Login failed");

  }

}
//
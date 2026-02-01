async function register() 
{

  const name = document.getElementById("registerName").value;
  const email = document.getElementById("reg-email").value;
  const password = document.getElementById("reg-password").value;

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

    alert("Registration successful");
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

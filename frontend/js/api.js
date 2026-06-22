<<<<<<< HEAD
const API_BASE_URL = window.location.hostname === "localhost"
  ? ""   // local: same origin (Express on port 3000)
  : "";  // AWS:   same origin (Express behind ALB)

async function apiRequest(path, method = "GET", body = null, auth = false) {
  const headers = {
    "Content-Type": "application/json",
  };

  // ── Per-tab token via Authorization header ────────────────────────────────
  // The browser shares ONE cookie per origin across all tabs. If two different
  // users (admin + regular user) are logged in on different tabs simultaneously,
  // the second login overwrites the shared cookie — breaking the first user's
  // API calls.
  //
  // Fix: on login, auth.js stores the JWT in sessionStorage (per-tab). Here we
  // always send it as Authorization: Bearer so the backend middleware uses THIS
  // tab's own token, not the shared cookie. The cookie is kept only as fallback.
  const tabToken = sessionStorage.getItem("token");
  if (tabToken) {
    headers["Authorization"] = `Bearer ${tabToken}`;
=======
const API_BASE_URL = "http://ticket-alb-660521080.ap-south-1.elb.amazonaws.com";

async function apiRequest(path, method = "GET", body = null, auth = false) {
  const headers = {
    "Content-Type": "application/json"
  };

  if (auth) {
    const token = localStorage.getItem("token");
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
>>>>>>> d2aba71dbbc84cc25d9f6a4fb5b7b26fdcd1fbac
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
<<<<<<< HEAD
    credentials: "include",   // still sends cookie as fallback
    body: body ? JSON.stringify(body) : null,
  });

  if (!response.ok) {
    if (response.status === 401) {
      window.location.replace("/");
      return;
    }
=======
    body: body ? JSON.stringify(body) : null
  });

  if (!response.ok) {
>>>>>>> d2aba71dbbc84cc25d9f6a4fb5b7b26fdcd1fbac
    const text = await response.text();
    throw new Error(text || "Request failed");
  }

  return response.json();
}

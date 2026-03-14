const API_BASE_URL = window.location.hostname === "localhost"
  ? ""   // local: same origin (Express on port 3000)
  : "";  // AWS:   same origin (Express behind ALB)

async function apiRequest(path, method = "GET", body = null, auth = false) {
  const headers = {
    "Content-Type": "application/json"
  };

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    credentials: "include",
    body: body ? JSON.stringify(body) : null
  });

  if (!response.ok) 
    {
// If 401, redirect to login — session expired or not logged in
    if (response.status === 401) {
      window.location.replace("/");
      return;
  }
  const text = await response.text();
    throw new Error(text || "Request failed");
  }

  return response.json();
}

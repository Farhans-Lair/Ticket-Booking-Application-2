// CHANGE THIS ONCE WHEN BACKEND URL CHANGES
const API_BASE_URL = "ticket-alb-526492414.ap-south-1.elb.amazonaws.com";

function getToken() {
  return localStorage.getItem("token");
}

async function apiRequest(path, method = "GET", body = null, auth = false) {
  const headers = {
    "Content-Type": "application/json"
  };

  if (auth) {
    const token = getToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "API request failed");
  }

  return data;
}

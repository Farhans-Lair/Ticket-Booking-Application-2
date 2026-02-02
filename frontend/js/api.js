const API_BASE_URL = "http://ticket-alb-1949641595.ap-south-1.elb.amazonaws.com";

async function apiRequest(path, method = "GET", body = null, auth = false) {
  const headers = {
    "Content-Type": "application/json"
  };

  if (auth) {
    const token = localStorage.getItem("token");
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null
  });

  const contentType = response.headers.get("content-type");

  // 🔑 CRITICAL FIX
  if (!contentType || !contentType.includes("application/json")) {
    const text = await response.text();
    throw new Error(`Backend returned non-JSON response:\n${text}`);
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Request failed");
  }

  return data;
}

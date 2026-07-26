const API_BASE_URL = window.location.hostname === "localhost"
  ? ""
  : "";

async function apiRequest(path, method = "GET", body = null, auth = false) {
  const headers = {
    "Content-Type": "application/json",
  };

  const tabToken = sessionStorage.getItem("token");
  if (tabToken) {
    headers["Authorization"] = `Bearer ${tabToken}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    credentials: "include",
    body: body ? JSON.stringify(body) : null,
  });

  if (!response.ok) {
    if (response.status === 401) {
      window.location.replace("/");
      return;
    }
    const text = await response.text();
    throw new Error(text || "Request failed");
  }

  return response.json();
}

const API_BASE = import.meta.env.VITE_API_BASE_URL;

if (!API_BASE) {
  console.error("Missing VITE_API_BASE_URL in environment");
}

export async function queryAI(query) {
  const response = await fetch(`${API_BASE}/query`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "ngrok-skip-browser-warning": "true"
    },
    body: JSON.stringify({ query })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Backend query failed");
  }

  return await response.json();
}

export async function uploadFile(file) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE}/upload`, {
    method: "POST",
    headers: {
      "ngrok-skip-browser-warning": "true"
    },
    body: formData
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Upload failed");
  }

  return await response.json();
}

export async function getMemory() {
  const response = await fetch(`${API_BASE}/memory`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "ngrok-skip-browser-warning": "true"
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Memory fetch failed");
  }

  return await response.json();
}


export async function generateAuditReport() {
  const res = await fetch(`${API_BASE}/reports/audit`, {
    method: "POST"
  });
  return await res.json();
}

export async function generateBlueprint() {
  const res = await fetch(`${API_BASE}/reports/blueprint`, {
    method: "POST"
  });
  return await res.json();
}

const BASE = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export const api = {
  list: () => request("/api/attendance"),
  create: (payload) => request("/api/attendance", { method: "POST", body: JSON.stringify(payload) }),
  update: (id, payload) => request(`/api/attendance/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  remove: (id) => request(`/api/attendance/${id}`, { method: "DELETE" }),
};

export function getApiBase() {
  return BASE || "(same origin)";
}

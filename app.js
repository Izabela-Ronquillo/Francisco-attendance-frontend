const API_BASE = "";
const TOKEN_KEY = "fa_admin_token";

const form = document.getElementById("attendance-form");
const formTitle = document.getElementById("form-title");
const recordId = document.getElementById("record-id");
const dateInput = document.getElementById("date");
const subjectInput = document.getElementById("subjectName");
const sectionInput = document.getElementById("section");
const studentInput = document.getElementById("studentName");
const submitBtn = document.getElementById("submit-btn");
const cancelBtn = document.getElementById("cancel-btn");
const refreshBtn = document.getElementById("refresh-btn");
const errorEl = document.getElementById("error");
const noticeEl = document.getElementById("notice");
const loadingEl = document.getElementById("loading");
const emptyEl = document.getElementById("empty");
const tableWrap = document.getElementById("table-wrap");
const tbody = document.getElementById("records-body");

const loginPrompt = document.getElementById("login-prompt");
const loginForm = document.getElementById("login-form");
const loginUsername = document.getElementById("login-username");
const loginPassword = document.getElementById("login-password");
const loginBtn = document.getElementById("login-btn");
const logoutBtn = document.getElementById("logout-btn");
const authMsg = document.getElementById("auth-msg");

let records = [];

function getToken() { return localStorage.getItem(TOKEN_KEY) || ""; }
function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}
function isLoggedIn() { return !!getToken(); }

function show(el) { el.classList.remove("hidden"); }
function hide(el) { el.classList.add("hidden"); }

function setMessage(type, text) {
  if (type === "error") {
    errorEl.textContent = text || "";
    text ? show(errorEl) : hide(errorEl);
  } else {
    noticeEl.textContent = text || "";
    text ? show(noticeEl) : hide(noticeEl);
  }
}

function setAuthMessage(text) {
  authMsg.textContent = text || "";
  text ? show(authMsg) : hide(authMsg);
}

function clearMessages() {
  setMessage("error", "");
  setMessage("notice", "");
}

function resetForm() {
  recordId.value = "";
  form.reset();
  formTitle.textContent = "Add Attendance Record";
  submitBtn.textContent = "Add Record";
  hide(cancelBtn);
}

function updateAuthUI() {
  if (isLoggedIn()) {
    hide(loginPrompt);
    show(logoutBtn);
    loginForm.reset();
    setAuthMessage("");
  } else {
    hide(loginPrompt);
    hide(logoutBtn);
  }
}

function requireLogin() {
  if (isLoggedIn()) return true;
  setAuthMessage("");
  show(loginPrompt);
  setTimeout(() => loginUsername.focus(), 0);
  return false;
}

async function request(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401) {
      setToken("");
      updateAuthUI();
    }
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

function escapeHtml(str) {
  return String(str ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

function renderRecords() {
  tbody.innerHTML = "";
  if (!records.length) {
    hide(tableWrap);
    show(emptyEl);
    return;
  }
  hide(emptyEl);
  show(tableWrap);
  records.forEach((r) => {
    const date = r.date ?? r.Date ?? "";
    const subjectName = r.subjectName ?? r.subject ?? r.Subject ?? r.subject_name ?? r["Subject Name"] ?? "";
    const section = r.section ?? r.Section ?? "";
    const studentName = r.studentName ?? r.student ?? r.Student ?? r.student_name ?? r.name ?? r.Name ?? r["Student Name"] ?? "";
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(date)}</td>
      <td>${escapeHtml(subjectName)}</td>
      <td>${escapeHtml(section)}</td>
      <td>${escapeHtml(studentName)}</td>
      <td class="row-actions">
        <button type="button" class="small" data-action="edit" data-id="${r.id}">Edit</button>
        <button type="button" class="small danger" data-action="delete" data-id="${r.id}">Delete</button>
      </td>`;
    tbody.appendChild(tr);
  });
}

async function loadRecords() {
  try {
    show(loadingEl);
    hide(emptyEl);
    hide(tableWrap);
    clearMessages();
    const data = await request("/api/attendance");
    records = Array.isArray(data) ? data : [];
    renderRecords();
  } catch (e) {
    setMessage("error", e.message);
    records = [];
    hide(tableWrap);
    hide(emptyEl);
  } finally {
    hide(loadingEl);
  }
}

function startEdit(id) {
  if (!requireLogin()) return;
  const r = records.find((x) => x.id === id);
  if (!r) return;
  recordId.value = r.id;
  dateInput.value = r.date ?? r.Date ?? "";
  subjectInput.value = r.subjectName ?? r.subject ?? r.Subject ?? r.subject_name ?? r["Subject Name"] ?? "";
  sectionInput.value = r.section ?? r.Section ?? "";
  studentInput.value = r.studentName ?? r.student ?? r.Student ?? r.student_name ?? r.name ?? r.Name ?? r["Student Name"] ?? "";
  formTitle.textContent = "Edit Attendance Record";
  submitBtn.textContent = "Update Record";
  show(cancelBtn);
  clearMessages();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function deleteRecord(id) {
  if (!requireLogin()) return;
  if (!window.confirm("Delete this attendance record?")) return;
  clearMessages();
  try {
    await request(`/api/attendance/${id}`, { method: "DELETE" });
    if (recordId.value === id) resetForm();
    setMessage("notice", "Record deleted.");
    await loadRecords();
  } catch (e) {
    setMessage("error", e.message);
  }
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!requireLogin()) return;
  const payload = {
    date: dateInput.value.trim(),
    subjectName: subjectInput.value.trim(),
    section: sectionInput.value.trim(),
    studentName: studentInput.value.trim(),
  };
  if (!payload.date || !payload.subjectName || !payload.section || !payload.studentName) {
    setMessage("error", "All fields are required.");
    return;
  }
  const id = recordId.value;
  submitBtn.disabled = true;
  clearMessages();
  try {
    if (id) {
      await request(`/api/attendance/${id}`, { method: "PUT", body: JSON.stringify(payload) });
      setMessage("notice", "Record updated.");
    } else {
      await request("/api/attendance", { method: "POST", body: JSON.stringify(payload) });
      setMessage("notice", "Record added.");
    }
    resetForm();
    await loadRecords();
  } catch (e2) {
    setMessage("error", e2.message);
  } finally {
    submitBtn.disabled = false;
  }
});

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  setAuthMessage("");
  clearMessages();
  loginBtn.disabled = true;
  try {
    const data = await request("/api/login", {
      method: "POST",
      body: JSON.stringify({
        username: loginUsername.value.trim(),
        password: loginPassword.value,
      }),
    });
    if (!data.token) throw new Error("Login failed");
    setToken(data.token);
    updateAuthUI();
    setMessage("notice", "Admin logged in. You can continue.");
  } catch (e2) {
    setAuthMessage(e2.message || "Login failed");
  } finally {
    loginBtn.disabled = false;
  }
});

logoutBtn.addEventListener("click", () => {
  setToken("");
  resetForm();
  updateAuthUI();
  clearMessages();
  setMessage("notice", "Logged out.");
});

cancelBtn.addEventListener("click", () => { resetForm(); clearMessages(); });
refreshBtn.addEventListener("click", loadRecords);

tbody.addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-action]");
  if (!btn) return;
  const { action, id } = btn.dataset;
  if (action === "edit") startEdit(id);
  if (action === "delete") deleteRecord(id);
});

updateAuthUI();
loadRecords();

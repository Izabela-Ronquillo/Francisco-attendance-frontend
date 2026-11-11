const API_BASE = "";

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

let records = [];

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

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
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

cancelBtn.addEventListener("click", () => { resetForm(); clearMessages(); });
refreshBtn.addEventListener("click", loadRecords);

tbody.addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-action]");
  if (!btn) return;
  const { action, id } = btn.dataset;
  if (action === "edit") startEdit(id);
  if (action === "delete") deleteRecord(id);
});

loadRecords();


import React, { useEffect, useState } from "react";
import { api, getApiBase } from "./api.js";

const empty = { date: "", subjectName: "", section: "", studentName: "" };

export default function App() {
  const [records, setRecords] = useState([]);
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function load() {
    try {
      setLoading(true);
      setError("");
      const data = await api.list();
      setRecords(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function onChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function startEdit(r) {
    setEditingId(r.id);
    setForm({ date: r.date, subjectName: r.subjectName, section: r.section, studentName: r.studentName });
    setNotice("");
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(empty);
  }

  async function onSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      if (editingId) {
        await api.update(editingId, form);
        setNotice("Record updated.");
      } else {
        await api.create(form);
        setNotice("Record added.");
      }
      setForm(empty);
      setEditingId(null);
      await load();
    } catch (e2) {
      setError(e2.message);
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(id) {
    if (!window.confirm("Delete this attendance record?")) return;
    setError("");
    setNotice("");
    try {
      await api.remove(id);
      setNotice("Record deleted.");
      if (editingId === id) cancelEdit();
      await load();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div className="page">
      <header>
        <h1>Francisco Attendance Portal</h1>
        <p className="sub">Manage attendance records for FranciscoAttendancePortal / Attendance_List</p>
        <p className="api">API: <code>{getApiBase()}</code></p>
      </header>

      <section className="card">
        <h2>{editingId ? "Edit Attendance Record" : "Add Attendance Record"}</h2>
        <form onSubmit={onSubmit} className="form">
          <label>Date<input name="date" type="date" value={form.date} onChange={onChange} required /></label>
          <label>Subject Name<input name="subjectName" value={form.subjectName} onChange={onChange} required placeholder="e.g. IT 301" /></label>
          <label>Section<input name="section" value={form.section} onChange={onChange} required placeholder="e.g. BSIT-3A" /></label>
          <label>Student Name<input name="studentName" value={form.studentName} onChange={onChange} required placeholder="Full name" /></label>
          <div className="actions">
            <button type="submit" disabled={saving}>{saving ? "Saving..." : editingId ? "Update Record" : "Add Record"}</button>
            {editingId && <button type="button" className="secondary" onClick={cancelEdit}>Cancel</button>}
          </div>
        </form>
        {error && <div className="msg error">{error}</div>}
        {notice && <div className="msg ok">{notice}</div>}
      </section>

      <section className="card">
        <div className="table-head">
          <h2>Attendance Records</h2>
          <button type="button" className="secondary" onClick={load} disabled={loading}>Refresh</button>
        </div>
        {loading ? (
          <p>Loading records...</p>
        ) : records.length === 0 ? (
          <p className="muted">No attendance records found.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Subject Name</th>
                  <th>Section</th>
                  <th>Student Name</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r.id}>
                    <td>{r.date}</td>
                    <td>{r.subjectName}</td>
                    <td>{r.section}</td>
                    <td>{r.studentName}</td>
                    <td className="row-actions">
                      <button type="button" className="small" onClick={() => startEdit(r)}>Edit</button>
                      <button type="button" className="small danger" onClick={() => onDelete(r.id)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

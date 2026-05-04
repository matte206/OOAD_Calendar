// api.js — Thin API client pointing to ASP.NET Core backend
const API_BASE = 'http://localhost:5000/api';

const api = {
  async getAppointments(from, to) {
    const params = new URLSearchParams();
    if (from) params.set('from', from.toISOString());
    if (to) params.set('to', to.toISOString());
    const r = await fetch(`${API_BASE}/appointments?${params}`);
    if (!r.ok) throw await r.json();
    return r.json();
  },

  async getById(id) {
    const r = await fetch(`${API_BASE}/appointments/${id}`);
    if (!r.ok) throw await r.json();
    return r.json();
  },

  async create(dto) {
    const r = await fetch(`${API_BASE}/appointments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dto)
    });
    const data = await r.json();
    if (r.status === 409) return { conflictError: true, ...data };
    if (r.status === 200 && data.requireGroupDecision) return { groupDecision: true, ...data };
    if (!r.ok) throw data;
    return data;
  },

  async update(id, dto) {
    const r = await fetch(`${API_BASE}/appointments/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dto)
    });
    if (!r.ok) throw await r.json();
    return r.json();
  },

  async delete(id) {
    const r = await fetch(`${API_BASE}/appointments/${id}`, { method: 'DELETE' });
    if (!r.ok && r.status !== 204) throw await r.json();
    return true;
  }
};

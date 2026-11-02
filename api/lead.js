import crypto from 'crypto';
import { dayKey, readState, touchDay, writeState } from '../lib/store.js';

function body(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string' && req.body) return JSON.parse(req.body);
  return {};
}

function clean(value, max = 500) {
  return String(value || '').trim().slice(0, max);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false });
  const data = body(req);
  if (clean(data._honey)) return res.status(204).end();
  const name = clean(data.name, 120);
  const email = clean(data.email, 180);
  if (!name || !email || !email.includes('@')) {
    return res.status(400).json({ ok: false });
  }

  const state = await readState();
  const now = Date.now();
  const lead = {
    id: crypto.randomBytes(8).toString('hex'),
    createdAt: now,
    name,
    email,
    company: clean(data.company, 160),
    phone: clean(data.phone, 40),
    contact: clean(data.contact, 40),
    timeline: clean(data.timeline, 80),
    website: clean(data.website, 200),
    services: clean(data.services, 300),
    message: clean(data.message, 4000),
    status: 'new',
    note: '',
  };
  state.leads.unshift(lead);
  state.leads = state.leads.slice(0, 500);
  touchDay(state, dayKey(now)).leads += 1;
  await writeState(state);
  res.status(200).json({ ok: true });
}

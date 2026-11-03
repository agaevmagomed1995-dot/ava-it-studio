import crypto from 'crypto';
import { dayKey, readState, saveLeadRecord, touchDay, writeState } from '../lib/store.js';

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
  await saveLeadRecord(lead);
  try {
    const state = await readState();
    state.leads = [lead, ...state.leads.filter((item) => item.id !== lead.id)].slice(0, 500);
    touchDay(state, dayKey(now)).leads += 1;
    await writeState(state);
  } catch {
    /* the lead file is already saved */
  }
  await Promise.race([
    notify(lead),
    new Promise((resolve) => setTimeout(resolve, 2000)),
  ]);
  res.status(200).json({ ok: true });
}

function notify(lead) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2500);
  const lines = [
    `Name: ${lead.name}`,
    `Email: ${lead.email}`,
    `Phone: ${lead.phone || '—'}`,
    `Company: ${lead.company || '—'}`,
    `Services: ${lead.services || '—'}`,
    `Timeline: ${lead.timeline || '—'}`,
    `Website: ${lead.website || '—'}`,
    `Preferred contact: ${lead.contact || '—'}`,
    '',
    lead.message || '',
  ];
  return fetch('https://formsubmit.co/ajax/ava.magomed@gmail.com', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      name: lead.name,
      email: lead.email,
      message: lines.join('\n'),
      _subject: `AVA project request — ${lead.name}`,
      _template: 'table',
      _captcha: 'false',
      _replyto: lead.email,
    }),
    signal: controller.signal,
  }).catch(() => {}).finally(() => clearTimeout(timer));
}

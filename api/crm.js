import { isAuthed } from '../lib/auth.js';
import { dayKey, deleteLeadRecord, listLeadRecords, readState, saveLeadRecord, writeState } from '../lib/store.js';

function body(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string' && req.body) return JSON.parse(req.body);
  return {};
}

const STATUSES = new Set(['new', 'contacted', 'working', 'won', 'lost']);

function rangeDays(days, today) {
  const list = [];
  const start = new Date(`${today}T00:00:00Z`);
  for (let i = days - 1; i >= 0; i -= 1) {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() - i);
    list.push(date.toISOString().slice(0, 10));
  }
  return list;
}

function sum(state, keys) {
  return keys.reduce((acc, key) => {
    const day = state.days[key] || {};
    acc.views += day.views || 0;
    acc.uniques += day.uniques || 0;
    acc.starts += day.starts || 0;
    acc.leads += day.leads || 0;
    return acc;
  }, { views: 0, uniques: 0, starts: 0, leads: 0 });
}

export default async function handler(req, res) {
  if (!isAuthed(req)) return res.status(401).json({ ok: false });
  const state = await readState();
  let leads = await listLeadRecords();

  if (req.method === 'POST') {
    const data = body(req);
    if (data.action !== 'delete') return res.status(400).json({ ok: false });
    await deleteLeadRecord(data.id);
    state.leads = state.leads.filter((item) => item.id !== data.id);
    await writeState(state);
    return res.status(200).json({ ok: true });
  }

  if (req.method === 'PATCH') {
    const data = body(req);
    const lead = leads.find((item) => item.id === data.id);
    if (!lead) return res.status(404).json({ ok: false });
    if (STATUSES.has(data.status)) lead.status = data.status;
    if (typeof data.note === 'string') lead.note = data.note.slice(0, 2000);
    await saveLeadRecord(lead);
    const index = state.leads.findIndex((item) => item.id === lead.id);
    if (index >= 0) state.leads[index] = lead;
    await writeState(state);
    return res.status(200).json({ ok: true, lead });
  }

  if (req.method !== 'GET') return res.status(405).json({ ok: false });
  const today = dayKey();
  const week = rangeDays(7, today);
  const month = rangeDays(30, today);
  const allKeys = Object.keys(state.days);
  res.status(200).json({
    ok: true,
    today,
    periods: {
      '7': sum(state, week),
      '30': sum(state, month),
      all: sum(state, allKeys),
    },
    series: month.map((key) => ({
      day: key.slice(5),
      uniques: state.days[key]?.uniques || 0,
      leads: state.days[key]?.leads || 0,
    })),
    leads,
  });
}

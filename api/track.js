import { dayKey, prune, readState, touchDay, writeState } from '../lib/store.js';

function body(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string' && req.body) return JSON.parse(req.body);
  return {};
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false });
  const data = body(req);
  const type = data.type === 'start' ? 'start' : 'view';
  const vid = String(data.vid || '').slice(0, 80);
  if (!/^[a-zA-Z0-9_-]{8,80}$/.test(vid)) return res.status(400).json({ ok: false });

  const state = await readState();
  const day = dayKey();
  const bucket = touchDay(state, day);
  const mark = `${day}:${type}:${vid}`;
  if (!state.seen[mark]) {
    state.seen[mark] = day;
    if (type === 'view') {
      bucket.views += 1;
      bucket.uniques += 1;
    } else {
      bucket.starts += 1;
    }
  }
  prune(state, day);
  await writeState(state);
  res.status(204).end();
}

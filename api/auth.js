import { clearCookie, isAuthed, passwordOk, sessionCookie } from '../lib/auth.js';

function body(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string' && req.body) return JSON.parse(req.body);
  return {};
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    return res.status(200).json({ ok: isAuthed(req) });
  }
  if (req.method === 'DELETE') {
    res.setHeader('Set-Cookie', clearCookie());
    return res.status(200).json({ ok: true });
  }
  if (req.method !== 'POST') return res.status(405).json({ ok: false });
  if (!passwordOk(body(req).password)) {
    return res.status(401).json({ ok: false });
  }
  res.setHeader('Set-Cookie', sessionCookie());
  return res.status(200).json({ ok: true });
}

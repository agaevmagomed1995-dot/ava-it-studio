import crypto from 'crypto';

const COOKIE = 'ava_session';

function secret() {
  return process.env.ADMIN_SECRET || '';
}

export function passwordOk(input) {
  const expected = process.env.ADMIN_PASSWORD || '';
  if (!expected || !input) return false;
  const a = Buffer.from(String(input));
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function sessionCookie() {
  const exp = Date.now() + 14 * 24 * 60 * 60 * 1000;
  const body = String(exp);
  const mac = crypto.createHmac('sha256', secret()).update(body).digest('hex');
  const value = `${body}.${mac}`;
  return `${COOKIE}=${value}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=1209600`;
}

export function clearCookie() {
  return `${COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
}

function readCookie(header) {
  if (!header) return '';
  const parts = header.split(';');
  for (const part of parts) {
    const [name, ...rest] = part.trim().split('=');
    if (name === COOKIE) return rest.join('=');
  }
  return '';
}

export function isAuthed(req) {
  if (!secret()) return false;
  const raw = readCookie(req.headers.cookie || '');
  const [exp, mac] = raw.split('.');
  if (!exp || !mac || Number(exp) < Date.now()) return false;
  const expected = crypto.createHmac('sha256', secret()).update(exp).digest('hex');
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

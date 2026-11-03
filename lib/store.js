import { del, get, list, put } from '@vercel/blob';

const PATH = 'crm/state.json';
const LEAD_PREFIX = 'crm/leads/';

function empty() {
  return { days: {}, seen: {}, leads: [] };
}

export function dayKey(ts = Date.now()) {
  return new Date(ts + 4 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function normalize(data) {
  const state = data && typeof data === 'object' ? data : {};
  state.days = state.days && typeof state.days === 'object' ? state.days : {};
  state.seen = state.seen && typeof state.seen === 'object' ? state.seen : {};
  state.leads = Array.isArray(state.leads) ? state.leads : [];
  return state;
}

export async function readState() {
  try {
    const result = await get(PATH, { access: 'private', useCache: false });
    if (!result?.stream) return empty();
    const text = await new Response(result.stream).text();
    return normalize(JSON.parse(text));
  } catch {
    return empty();
  }
}

export async function writeState(state) {
  await put(PATH, JSON.stringify(state), {
    access: 'private',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/json',
    cacheControlMaxAge: 60,
  });
}

export function touchDay(state, day) {
  if (!state.days[day]) state.days[day] = { views: 0, uniques: 0, starts: 0, leads: 0 };
  return state.days[day];
}

export function prune(state, today) {
  const cutoff = new Date(`${today}T00:00:00Z`);
  cutoff.setUTCDate(cutoff.getUTCDate() - 45);
  const limit = cutoff.toISOString().slice(0, 10);
  for (const key of Object.keys(state.seen)) {
    if (state.seen[key] < limit) delete state.seen[key];
  }
}

async function readJson(urlOrPath) {
  const result = await get(urlOrPath, { access: 'private', useCache: false });
  if (!result?.stream) return null;
  return JSON.parse(await new Response(result.stream).text());
}

export async function saveLeadRecord(lead) {
  await put(`${LEAD_PREFIX}${lead.id}.json`, JSON.stringify(lead), {
    access: 'private',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/json',
    cacheControlMaxAge: 60,
  });
}

export async function deleteLeadRecord(id) {
  try {
    await del(`${LEAD_PREFIX}${id}.json`);
  } catch {
    /* already gone */
  }
}

export async function listLeadRecords() {
  const leads = [];
  let cursor;
  do {
    const page = await list({ prefix: LEAD_PREFIX, cursor, limit: 100 });
    const rows = await Promise.all(page.blobs.map(async (blob) => {
      try {
        return await readJson(blob.url);
      } catch {
        return null;
      }
    }));
    leads.push(...rows.filter(Boolean));
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);

  const state = await readState();
  const seen = new Set(leads.map((lead) => lead.id));
  for (const lead of state.leads) {
    if (!seen.has(lead.id)) leads.push(lead);
  }
  leads.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  return leads;
}

import { get, put } from '@vercel/blob';

const PATH = 'crm/state.json';

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

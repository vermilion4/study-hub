const KEY = 'studyhub.progress';

type State = Record<string, boolean>;

function read(): State {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as State) : {};
  } catch {
    return {};
  }
}

function write(state: State): void {
  localStorage.setItem(KEY, JSON.stringify(state));
}

export function isDone(id: string): boolean {
  return read()[id] === true;
}

export function setDone(id: string, done: boolean): void {
  const state = read();
  if (done) state[id] = true;
  else delete state[id];
  write(state);
}

export function toggle(id: string): boolean {
  const next = !isDone(id);
  setDone(id, next);
  return next;
}

export function courseProgress(resourceIds: string[]): number {
  if (resourceIds.length === 0) return 0;
  const state = read();
  const done = resourceIds.filter((id) => state[id] === true).length;
  return Math.round((done / resourceIds.length) * 100);
}

export function exportProgress(): string {
  return JSON.stringify(read(), null, 2);
}

export function importProgress(json: string): void {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error('Invalid progress file: not valid JSON.');
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Invalid progress file: expected an object of resource ids.');
  }
  // Sanitize: keep only entries explicitly marked done (true).
  const clean: State = {};
  for (const [id, done] of Object.entries(parsed as Record<string, unknown>)) {
    if (done === true) clean[id] = true;
  }
  write(clean);
}

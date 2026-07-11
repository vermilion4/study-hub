const KEY = 'studyhub.cards';

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

export function isKnown(key: string): boolean {
  return read()[key] === true;
}

export function setKnown(key: string, known: boolean): void {
  const state = read();
  if (known) state[key] = true;
  else delete state[key];
  write(state);
}

export function deckStats(keys: string[]): { known: number; total: number; mastered: boolean } {
  const state = read();
  const known = keys.filter((k) => state[k] === true).length;
  return { known, total: keys.length, mastered: keys.length > 0 && known === keys.length };
}

export function initialQueue(
  cardKeys: string[],
  opts: { unknownOnly: boolean; isKnown: (k: string) => boolean },
): string[] {
  return opts.unknownOnly ? cardKeys.filter((k) => !opts.isKnown(k)) : [...cardKeys];
}

export function grade(
  queue: string[],
  outcome: 'known' | 'review',
): { queue: string[]; done: boolean } {
  if (queue.length === 0) return { queue: [], done: true };
  const [head, ...rest] = queue;
  const next = outcome === 'known' ? rest : [...rest, head];
  return { queue: next, done: next.length === 0 };
}

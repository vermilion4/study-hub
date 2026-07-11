import { describe, it, expect, beforeEach, vi } from 'vitest';

class MemStorage {
  store = new Map<string, string>();
  getItem(k: string) { return this.store.has(k) ? this.store.get(k)! : null; }
  setItem(k: string, v: string) { this.store.set(k, v); }
  removeItem(k: string) { this.store.delete(k); }
}
beforeEach(() => { vi.stubGlobal('localStorage', new MemStorage()); vi.resetModules(); });
async function load() { return await import('./cards'); }

describe('grade', () => {
  it('known drops the head', async () => {
    const { grade } = await load();
    expect(grade(['a', 'b', 'c'], 'known')).toEqual({ queue: ['b', 'c'], done: false });
  });
  it('review moves the head to the tail', async () => {
    const { grade } = await load();
    expect(grade(['a', 'b', 'c'], 'review')).toEqual({ queue: ['b', 'c', 'a'], done: false });
  });
  it('is done when the queue empties', async () => {
    const { grade } = await load();
    expect(grade(['a'], 'known')).toEqual({ queue: [], done: true });
  });
  it('is safe on an empty queue', async () => {
    const { grade } = await load();
    expect(grade([], 'known')).toEqual({ queue: [], done: true });
  });
});

describe('initialQueue', () => {
  it('returns all keys by default, preserving order', async () => {
    const { initialQueue } = await load();
    expect(initialQueue(['a', 'b', 'c'], { unknownOnly: false, isKnown: () => false })).toEqual(['a', 'b', 'c']);
  });
  it('returns only unknown keys when unknownOnly', async () => {
    const { initialQueue } = await load();
    const known = new Set(['b']);
    expect(initialQueue(['a', 'b', 'c'], { unknownOnly: true, isKnown: (k) => known.has(k) })).toEqual(['a', 'c']);
  });
});

describe('deckStats + persistence', () => {
  it('counts known and flags mastered', async () => {
    const c = await load();
    c.setKnown('a', true); c.setKnown('b', true);
    expect(c.deckStats(['a', 'b'])).toEqual({ known: 2, total: 2, mastered: true });
    expect(c.deckStats(['a', 'b', 'x'])).toEqual({ known: 2, total: 3, mastered: false });
    expect(c.deckStats([])).toEqual({ known: 0, total: 0, mastered: false });
  });
  it('setKnown(false) clears known state', async () => {
    const c = await load();
    c.setKnown('a', true); c.setKnown('a', false);
    expect(c.isKnown('a')).toBe(false);
  });
});

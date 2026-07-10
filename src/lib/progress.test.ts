import { describe, it, expect, beforeEach, vi } from 'vitest';

// Minimal localStorage shim for node env
class MemStorage {
  store = new Map<string, string>();
  getItem(k: string) { return this.store.has(k) ? this.store.get(k)! : null; }
  setItem(k: string, v: string) { this.store.set(k, v); }
  removeItem(k: string) { this.store.delete(k); }
}

beforeEach(() => {
  vi.stubGlobal('localStorage', new MemStorage());
  vi.resetModules();
});

async function load() { return await import('./progress'); }

describe('progress', () => {
  it('starts not done and toggles on', async () => {
    const p = await load();
    expect(p.isDone('a')).toBe(false);
    expect(p.toggle('a')).toBe(true);
    expect(p.isDone('a')).toBe(true);
  });
  it('toggles back off', async () => {
    const p = await load();
    p.toggle('a'); p.toggle('a');
    expect(p.isDone('a')).toBe(false);
  });
  it('computes course progress as integer percent', async () => {
    const p = await load();
    p.setDone('x', true); p.setDone('y', true);
    expect(p.courseProgress(['x', 'y', 'z', 'w'])).toBe(50);
    expect(p.courseProgress([])).toBe(0);
  });
  it('exports and imports', async () => {
    const p = await load();
    p.setDone('a', true);
    const dump = p.exportProgress();
    p.setDone('a', false);
    p.importProgress(dump);
    expect(p.isDone('a')).toBe(true);
  });
  it('throws on malformed JSON import', async () => {
    const p = await load();
    expect(() => p.importProgress('not json')).toThrow();
  });
  it('throws when imported JSON is not an object', async () => {
    const p = await load();
    expect(() => p.importProgress('[1,2,3]')).toThrow();
  });
  it('sanitizes imported data, keeping only entries marked true', async () => {
    const p = await load();
    p.importProgress(JSON.stringify({ a: true, b: false, c: 'yes', d: true }));
    expect(p.isDone('a')).toBe(true);
    expect(p.isDone('d')).toBe(true);
    expect(p.isDone('b')).toBe(false);
    expect(p.isDone('c')).toBe(false);
  });
});

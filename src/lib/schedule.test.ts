import { describe, it, expect } from 'vitest';
import { orderResources, packIntoDays, type ResourceInput } from './schedule';
import {
  dateForDay, daysBetween, todayIndex, sessionKeys, isResourceComplete,
} from './schedule';

function r(over: Partial<ResourceInput>): ResourceInput {
  return {
    id: over.id ?? 'x', title: over.title ?? 'X', type: over.type ?? 'article',
    url: over.url ?? null, estMinutes: over.estMinutes ?? 30, difficulty: over.difficulty ?? 'beginner',
    course: over.course ?? 'c', courseTitle: over.courseTitle ?? 'C', topic: over.topic ?? 'T',
    term: over.term ?? 1, courseOrder: over.courseOrder ?? 1, order: over.order ?? 1,
  };
}

describe('orderResources', () => {
  it('sorts by term, then course order, then resource order', () => {
    const out = orderResources([
      r({ id: 'a', term: 1, courseOrder: 2, order: 1 }),
      r({ id: 'b', term: 1, courseOrder: 1, order: 2 }),
      r({ id: 'c', term: 1, courseOrder: 1, order: 1 }),
      r({ id: 'd', term: 2, courseOrder: 1, order: 1 }),
    ]).map((x) => x.id);
    expect(out).toEqual(['c', 'b', 'a', 'd']);
  });
});

describe('packIntoDays', () => {
  it('packs short items up to the budget, then starts a new day', () => {
    const days = packIntoDays(
      [r({ id: '1', estMinutes: 30 }), r({ id: '2', estMinutes: 30 }),
       r({ id: '3', estMinutes: 30 }), r({ id: '4', estMinutes: 30 })], 90);
    expect(days.length).toBe(2);
    expect(days[0].items.map((i) => i.resourceId)).toEqual(['1', '2', '3']);
    expect(days[0].totalMinutes).toBe(90);
    expect(days[1].items.map((i) => i.resourceId)).toEqual(['4']);
    expect(days[0].items[0].key).toBe('1');
    expect(days[0].items[0].part).toBeNull();
  });

  it('starts a new day when the next item would exceed the budget', () => {
    const days = packIntoDays([r({ id: '1', estMinutes: 50 }), r({ id: '2', estMinutes: 50 })], 90);
    expect(days.length).toBe(2);
  });

  it('splits an oversized resource into consecutive-day sessions', () => {
    const days = packIntoDays([r({ id: 'big', estMinutes: 200 })], 90);
    expect(days.length).toBe(3); // ceil(200/90)
    expect(days.every((d) => d.isHeavy)).toBe(true);
    expect(days.map((d) => d.items[0].key)).toEqual(['big#1', 'big#2', 'big#3']);
    expect(days.map((d) => d.items[0].minutesToday)).toEqual([90, 90, 20]);
    expect(days.map((d) => d.items[0].part)).toEqual([1, 2, 3]);
    expect(days.every((d) => d.items.length === 1)).toBe(true);
  });

  it('does not merge a single item onto a heavy multi-session day', () => {
    const days = packIntoDays([r({ id: 'big', estMinutes: 200 }), r({ id: 'small', estMinutes: 30 })], 90);
    expect(days.length).toBe(4);
    expect(days[3].items.map((i) => i.resourceId)).toEqual(['small']);
    expect(days[3].isHeavy).toBe(false);
  });

  it('never emits an empty day', () => {
    const days = packIntoDays([r({ id: '1', estMinutes: 10 })], 90);
    expect(days.length).toBe(1);
    expect(days[0].items.length).toBe(1);
  });
});

describe('date mapping', () => {
  it('maps a day index to a date, crossing month boundaries', () => {
    expect(dateForDay('2026-09-01', 0)).toBe('2026-09-01');
    expect(dateForDay('2026-09-01', 30)).toBe('2026-10-01');
  });
  it('counts days between two dates', () => {
    expect(daysBetween('2026-09-01', '2026-09-10')).toBe(9);
    expect(daysBetween('2026-09-10', '2026-09-01')).toBe(-9);
  });
  it('returns todayIndex within range, else -1', () => {
    expect(todayIndex('2026-09-01', '2026-09-05', 10)).toBe(4);
    expect(todayIndex('2026-09-01', '2026-08-30', 10)).toBe(-1); // before start
    expect(todayIndex('2026-09-01', '2026-09-20', 10)).toBe(-1); // past end (index 19 >= 10)
  });
});

describe('roll-up helpers', () => {
  it('builds session keys for single vs multi-session', () => {
    expect(sessionKeys('r', null)).toEqual(['r']);
    expect(sessionKeys('r', 1)).toEqual(['r']);
    expect(sessionKeys('r', 3)).toEqual(['r#1', 'r#2', 'r#3']);
  });
  it('is complete only when all session keys are done', () => {
    const done = new Set(['r#1', 'r#2']);
    expect(isResourceComplete('r', 3, (k) => done.has(k))).toBe(false);
    done.add('r#3');
    expect(isResourceComplete('r', 3, (k) => done.has(k))).toBe(true);
    expect(isResourceComplete('s', null, (k) => k === 's')).toBe(true);
  });
});

import { describe, it, expect } from 'vitest';
import { courseSchema, resourceSchema } from './schema';

describe('courseSchema', () => {
  it('accepts a valid course', () => {
    const parsed = courseSchema.parse({
      title: 'Introduction to Computer Programming',
      term: 1, order: 1, slug: 'intro-to-computer-programming',
      description: 'Fundamentals.', difficulty: 'beginner',
    });
    expect(parsed.term).toBe(1);
  });
  it('rejects an unknown difficulty', () => {
    expect(() => courseSchema.parse({
      title: 'x', term: 1, order: 1, slug: 'x', description: 'x', difficulty: 'wizard',
    })).toThrow();
  });
  it('rejects a non-positive term (int floor)', () => {
    expect(() => courseSchema.parse({
      title: 'x', term: 0, order: 1, slug: 'x', description: 'x', difficulty: 'beginner',
    })).toThrow();
  });
});

describe('resourceSchema', () => {
  it('accepts a valid video resource', () => {
    const parsed = resourceSchema.parse({
      course: 'intro-to-computer-programming', topic: 'Variables', order: 1,
      title: 'Variables 101', type: 'video', url: 'https://y.tube/x',
      estMinutes: 12, difficulty: 'beginner',
    });
    expect(parsed.type).toBe('video');
  });
  it('rejects an unknown resource type', () => {
    expect(() => resourceSchema.parse({
      course: 'x', topic: 'x', order: 1, title: 'x', type: 'podcast',
      estMinutes: 1, difficulty: 'beginner',
    })).toThrow();
  });
  it('rejects a malformed url', () => {
    expect(() => resourceSchema.parse({
      course: 'x', topic: 'x', order: 1, title: 'x', type: 'video',
      url: 'not-a-url', estMinutes: 1, difficulty: 'beginner',
    })).toThrow();
  });
  it('rejects a non-positive estMinutes (int floor)', () => {
    expect(() => resourceSchema.parse({
      course: 'x', topic: 'x', order: 1, title: 'x', type: 'article',
      estMinutes: 0, difficulty: 'beginner',
    })).toThrow();
  });
});

import { deckSchema } from './schema';

describe('deckSchema', () => {
  it('accepts a valid deck', () => {
    const d = deckSchema.parse({
      course: 'intro-to-computer-programming', topic: 'Control Flow', order: 1,
      cards: [{ q: 'Q?', a: 'A.' }],
    });
    expect(d.cards.length).toBe(1);
  });
  it('rejects a card missing q or a', () => {
    expect(() => deckSchema.parse({
      course: 'c', topic: 'T', order: 1, cards: [{ q: 'only q' }],
    })).toThrow();
  });
  it('rejects an empty cards array', () => {
    expect(() => deckSchema.parse({ course: 'c', topic: 'T', order: 1, cards: [] })).toThrow();
  });
});

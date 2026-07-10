import { getCollection } from 'astro:content';

export async function getCourseTree() {
  const entries = await getCollection('courses');
  const byTerm = new Map<number, typeof entries>();
  for (const e of entries) {
    const list = byTerm.get(e.data.term) ?? [];
    list.push(e);
    byTerm.set(e.data.term, list);
  }
  return [...byTerm.entries()]
    .sort(([a], [b]) => a - b)
    .map(([term, courses]) => ({
      term,
      courses: courses.sort((a, b) => a.data.order - b.data.order),
    }));
}

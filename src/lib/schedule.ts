export interface ResourceInput {
  id: string;
  title: string;
  type: string;
  url: string | null;
  estMinutes: number;
  difficulty: string;
  course: string;
  courseTitle: string;
  topic: string;
  term: number;
  courseOrder: number;
  order: number;
}

export interface SessionItem {
  key: string;
  resourceId: string;
  title: string;
  type: string;
  url: string | null;
  difficulty: string;
  courseTitle: string;
  topic: string;
  part: number | null;
  partCount: number | null;
  minutesToday: number;
}

export interface Day {
  dayIndex: number;
  items: SessionItem[];
  totalMinutes: number;
  isHeavy: boolean;
}

export function orderResources(resources: ResourceInput[]): ResourceInput[] {
  return [...resources].sort(
    (a, b) => a.term - b.term || a.courseOrder - b.courseOrder || a.order - b.order,
  );
}

function sessionItem(
  r: ResourceInput,
  key: string,
  part: number | null,
  partCount: number | null,
  minutesToday: number,
): SessionItem {
  return {
    key,
    resourceId: r.id,
    title: r.title,
    type: r.type,
    url: r.url,
    difficulty: r.difficulty,
    courseTitle: r.courseTitle,
    topic: r.topic,
    part,
    partCount,
    minutesToday,
  };
}

export function packIntoDays(resources: ResourceInput[], budget: number): Day[] {
  const days: Day[] = [];
  let current: Day | null = null;

  const newDay = (): Day => {
    const d: Day = { dayIndex: days.length, items: [], totalMinutes: 0, isHeavy: false };
    days.push(d);
    return d;
  };

  for (const r of resources) {
    if (r.estMinutes > budget) {
      const partCount = Math.ceil(r.estMinutes / budget);
      for (let k = 1; k <= partCount; k++) {
        const minutesToday = Math.min(budget, r.estMinutes - (k - 1) * budget);
        const d = newDay();
        d.items.push(sessionItem(r, `${r.id}#${k}`, k, partCount, minutesToday));
        d.totalMinutes = minutesToday;
        d.isHeavy = true;
      }
      current = null; // next resource starts a fresh day
    } else {
      if (!current || current.isHeavy || current.totalMinutes + r.estMinutes > budget) {
        current = newDay();
      }
      current.items.push(sessionItem(r, r.id, null, null, r.estMinutes));
      current.totalMinutes += r.estMinutes;
    }
  }

  return days;
}

const DAY_MS = 86_400_000;

function parseISO(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

function toISO(ms: number): string {
  const d = new Date(ms);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function dateForDay(startISO: string, dayIndex: number): string {
  return toISO(parseISO(startISO) + dayIndex * DAY_MS);
}

export function daysBetween(startISO: string, otherISO: string): number {
  return Math.round((parseISO(otherISO) - parseISO(startISO)) / DAY_MS);
}

export function todayIndex(startISO: string, todayISO: string, dayCount: number): number {
  const idx = daysBetween(startISO, todayISO);
  return idx >= 0 && idx < dayCount ? idx : -1;
}

export function sessionKeys(resourceId: string, partCount: number | null): string[] {
  if (!partCount || partCount <= 1) return [resourceId];
  return Array.from({ length: partCount }, (_, i) => `${resourceId}#${i + 1}`);
}

export function isResourceComplete(
  resourceId: string,
  partCount: number | null,
  isDone: (key: string) => boolean,
): boolean {
  return sessionKeys(resourceId, partCount).every(isDone);
}

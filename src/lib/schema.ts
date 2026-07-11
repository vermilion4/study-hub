import { z } from 'zod';

export const DIFFICULTIES = ['beginner', 'intermediate', 'advanced'] as const;
export const RESOURCE_TYPES = ['video', 'article', 'exercise', 'reference', 'note'] as const;

export const courseSchema = z.object({
  title: z.string(),
  term: z.number().int().min(1),
  order: z.number().int().min(1),
  description: z.string(),
  difficulty: z.enum(DIFFICULTIES),
});

export const resourceSchema = z.object({
  course: z.string(),            // course slug
  topic: z.string(),
  order: z.number().int().min(1),
  title: z.string(),
  type: z.enum(RESOURCE_TYPES),
  url: z.string().url().optional(),
  estMinutes: z.number().int().min(1),
  difficulty: z.enum(DIFFICULTIES),
});

export type Course = z.infer<typeof courseSchema>;
export type Resource = z.infer<typeof resourceSchema>;

export const cardSchema = z.object({
  q: z.string(),
  a: z.string(),
});

export const deckSchema = z.object({
  course: z.string(),
  topic: z.string(),
  order: z.number().int().min(1),
  cards: z.array(cardSchema).min(1),
});

export type Deck = z.infer<typeof deckSchema>;

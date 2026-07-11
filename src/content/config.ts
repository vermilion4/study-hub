import { defineCollection } from 'astro:content';
import { courseSchema, resourceSchema, deckSchema } from '../lib/schema';

const courses = defineCollection({ type: 'content', schema: courseSchema });
const resources = defineCollection({ type: 'content', schema: resourceSchema });
const flashcards = defineCollection({ type: 'content', schema: deckSchema });

export const collections = { courses, resources, flashcards };

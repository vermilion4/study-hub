import { defineCollection } from 'astro:content';
import { courseSchema, resourceSchema } from '../lib/schema';

const courses = defineCollection({ type: 'content', schema: courseSchema });
const resources = defineCollection({ type: 'content', schema: resourceSchema });

export const collections = { courses, resources };

import data from './data/exercises.json';
import type { Exercise } from './types';

export const exercises = data as unknown as Exercise[];
export const exerciseById = new Map(exercises.map((e) => [e.id, e]));

const IMAGE_BASE =
  'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/';

export const imageUrl = (path: string) => IMAGE_BASE + path;
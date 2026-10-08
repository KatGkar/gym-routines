import data from './data/exercises.json';
import type { Exercise } from './types';

export const exercises = data as unknown as Exercise[];
export const exerciseById = new Map(exercises.map((e) => [e.id, e]));


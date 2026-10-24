import { createContext, useContext } from 'react';
import type { Exercise } from './types';

// Lives apart from ExercisesProvider so that file only exports components (fast refresh)
export interface ExercisesCtx {
  all: Exercise[];
  byId: Map<string, Exercise>;
  custom: Exercise[];
  setCustom: (list: Exercise[]) => void;
  addCustom: (name: string, muscle: string, equipment: string) => Exercise;
  removeCustom: (id: string) => void;
}

export const ExercisesContext = createContext<ExercisesCtx | null>(null);

export function useExercises() {
  const ctx = useContext(ExercisesContext);
  if (!ctx) throw new Error('useExercises must be used inside ExercisesProvider');
  return ctx;
}

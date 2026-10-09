import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { exercises as builtIn } from './exercises';
import { uid } from './utils';
import type { Exercise } from './types';

const KEY = 'gym-routines:custom-exercises:v1';

function load(): Exercise[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

interface Ctx {
  all: Exercise[];
  byId: Map<string, Exercise>;
  custom: Exercise[];
  setCustom: (list: Exercise[]) => void;
  addCustom: (name: string, muscle: string, equipment: string) => Exercise;
  removeCustom: (id: string) => void;
}

const ExercisesContext = createContext<Ctx | null>(null);

export function ExercisesProvider({ children }: { children: ReactNode }) {
  const [custom, setCustom] = useState<Exercise[]>(load);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(custom));
    } catch {
      /* storage unavailable */
    }
  }, [custom]);

  const value = useMemo<Ctx>(() => {
    const all = [...custom, ...builtIn];
    return {
      all,
      byId: new Map(all.map((e) => [e.id, e])),
      custom,
      setCustom,
      addCustom: (name, muscle, equipment) => {
        const ex: Exercise = {
          id: 'custom-' + uid(),
          name: name.trim(),
          equipment: equipment.trim() ? equipment.trim().toLowerCase() : null,
          category: 'custom',
          level: '',
          primaryMuscles: muscle.trim() ? [muscle.trim().toLowerCase()] : [],
          secondaryMuscles: [],
          instructions: [],
          images: [],
          custom: true,
        };
        setCustom((c) => [ex, ...c]);
        return ex;
      },
      removeCustom: (id) => setCustom((c) => c.filter((e) => e.id !== id)),
    };
  }, [custom]);
  return <ExercisesContext.Provider value={value}>{children}</ExercisesContext.Provider>;
}

export function useExercises() {
  const ctx = useContext(ExercisesContext);
  if (!ctx) throw new Error('useExercises must be used inside ExercisesProvider');
  return ctx;
}

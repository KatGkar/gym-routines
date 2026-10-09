import { useEffect, useState } from 'react';
import type { Routine } from './types';

const KEY = 'gym-routines:v1';

function load(): Routine[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function useRoutines() {
  const [routines, setRoutines] = useState<Routine[]>(load);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(routines));
    } catch {
      /* storage unavailable */
    }
  }, [routines]);

  return [routines, setRoutines] as const;
}

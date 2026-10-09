import type { KeyboardEvent } from 'react';
import type { CardioField, RoutineExercise, WorkoutSet } from './types';

export type NumKey = 'weightKg' | 'seconds' | 'minutes' | 'distanceKm' | 'speedKmh' | 'inclinePct';
export interface ColDef {
  key: NumKey | 'reps';
  label: string;
  step: string;
}

export const COLS: Record<NumKey, ColDef> = {
  weightKg: { key: 'weightKg', label: 'kg', step: '0.5' },
  seconds: { key: 'seconds', label: 'Sec', step: '5' },
  minutes: { key: 'minutes', label: 'Min', step: '1' },
  distanceKm: { key: 'distanceKm', label: 'km', step: '0.1' },
  speedKmh: { key: 'speedKmh', label: 'km/h', step: '0.1' },
  inclinePct: { key: 'inclinePct', label: 'Incl. %', step: '0.5' },
};
export const REPS_COL: ColDef = { key: 'reps', label: 'Reps', step: '1' };

export const CARDIO_ORDER: CardioField[] = [
  'weightKg',
  'minutes',
  'distanceKm',
  'speedKmh',
  'inclinePct',
];
export const DEFAULT_CARDIO: CardioField[] = ['minutes', 'distanceKm'];

export const usesReps = (re: RoutineExercise) => {
  const k = re.kind ?? 'strength';
  return k === 'strength' || k === 'bodyweight';
};
export const isRange = (re: RoutineExercise) => usesReps(re) && re.repMode === 'range';

export function getCols(re: RoutineExercise): ColDef[] {
  const kind = re.kind ?? 'strength';
  if (kind === 'strength') return [COLS.weightKg, REPS_COL];
  if (kind === 'bodyweight') return [REPS_COL];
  if (kind === 'timed') return [COLS.seconds];
  const keys = re.cardioFields ?? DEFAULT_CARDIO;
  return CARDIO_ORDER.filter((k) => keys.includes(k)).map((k) => COLS[k]);
}

export function gridTemplate(re: RoutineExercise, lastCol: string): string {
  const range = isRange(re);
  const mid = getCols(re)
    .map((c) => (c.key === 'reps' && range ? 'minmax(0,1.6fr)' : 'minmax(0,1fr)'))
    .join(' ');
  return `2.5rem ${mid} ${lastCol}`;
}

// Never allow negative or invalid numbers
export const num = (v: string) => Math.max(0, Number(v) || 0);
export const blockMinus = (e: KeyboardEvent<HTMLInputElement>) => {
  if (['-', '+', 'e', 'E'].includes(e.key)) e.preventDefault();
};

// Text summary of one set, used in the history
export function formatSet(re: RoutineExercise, s: WorkoutSet): string {
  const range = isRange(re);
  return getCols(re)
    .map((c) => {
      if (c.key === 'reps') {
        return range && s.repsMax ? `${s.reps}–${s.repsMax} reps` : `${s.reps} reps`;
      }
      return `${s[c.key] ?? 0} ${c.label}`;
    })
    .join(' · ');
}
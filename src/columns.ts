import type { CardioField, RoutineExercise, SetType, WorkoutSet } from './types';
import { uid } from './utils';

export type NumKey = 'weightKg' | 'seconds' | 'minutes' | 'distanceKm' | 'speedKmh' | 'inclinePct';
export interface ColDef {
  key: NumKey | 'reps';
  label: string;
}

export const COLS: Record<NumKey, ColDef> = {
  weightKg: { key: 'weightKg', label: 'kg' },
  seconds: { key: 'seconds', label: 'Sec' },
  minutes: { key: 'minutes', label: 'Min' },
  distanceKm: { key: 'distanceKm', label: 'km' },
  speedKmh: { key: 'speedKmh', label: 'km/h' },
  inclinePct: { key: 'inclinePct', label: 'Incl. %' },
};
export const REPS_COL: ColDef = { key: 'reps', label: 'Reps' };

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

// "W" for warmup sets, 1, 2, 3... for normal sets
export function setLabels(sets: WorkoutSet[]): string[] {
  let n = 0;
  return sets.map((s) => (s.type === 'warmup' ? 'W' : String(++n)));
}

// A new empty set with sensible starting values for this kind of exercise
export function blankSet(re: RoutineExercise, type: SetType): WorkoutSet {
  const reps = usesReps(re);
  return {
    id: uid(),
    type,
    weightKg: 0,
    reps: reps ? 10 : 0,
    ...(re.kind === 'timed' ? { seconds: 30 } : {}),
    ...(isRange(re) ? { repsMax: 12 } : {}),
  };
}

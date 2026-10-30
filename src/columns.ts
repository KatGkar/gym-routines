import type {
  CardioField,
  Exercise,
  ExerciseKind,
  RoutineExercise,
  SetType,
  WorkoutSet,
} from './types';
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

// What type a newly added exercise starts as, based on its database category
export const defaultKind = (e: Exercise): ExerciseKind => {
  if (e.category === 'cardio') return 'cardio';
  if (e.category === 'stretching') return 'timed';
  if (e.category === 'plyometrics') return 'bodyweight';
  return 'strength';
};

export const usesReps = (re: RoutineExercise) => {
  const k = re.kind ?? 'strength';
  return k === 'strength' || k === 'bodyweight';
};
export const isRange = (re: RoutineExercise) => usesReps(re) && re.repMode === 'range';
export const isAmrap = (re: RoutineExercise) => usesReps(re) && re.repMode === 'amrap';

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
  const amrap = isAmrap(re);
  return getCols(re)
    .map((c) => {
      if (c.key === 'reps') {
        if (amrap) return s.reps ? `${s.reps} reps (AMRAP)` : 'AMRAP';
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
    // AMRAP working sets have no target, you fill in what you did
    reps: reps && !(isAmrap(re) && type === 'normal') ? 10 : 0,
    ...(re.kind === 'timed' ? { seconds: 30 } : {}),
    ...(isRange(re) ? { repsMax: 12 } : {}),
  };
}

// Adds a set where it belongs: warmups go before the first working set, working sets at the end
export function withSet(sets: WorkoutSet[], set: WorkoutSet): WorkoutSet[] {
  const firstNormal = sets.findIndex((s) => s.type === 'normal');
  if (set.type === 'normal' || firstNormal < 0) return [...sets, set];
  return [...sets.slice(0, firstNormal), set, ...sets.slice(firstNormal)];
}

// A set that hasn't been done yet
export const NOT_DONE = { done: false, failed: undefined } as const;

// The reps planned for a set, to tell when it fell short (AMRAP working sets have none)
export const repTarget = (re: RoutineExercise, s: WorkoutSet) =>
  usesReps(re) && !(isAmrap(re) && s.type === 'normal') && s.reps > 0 ? s.reps : undefined;

// A done set with fewer reps than planned is failed
export const withFailed = (s: WorkoutSet): WorkoutSet => ({
  ...s,
  failed: s.done && s.target !== undefined && s.reps < s.target ? true : undefined,
});

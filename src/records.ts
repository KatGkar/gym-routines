import type { FinishedWorkout, RoutineExercise, WorkoutSet } from './types';

// Weight records: a finished working set heavier than anything done on that exercise before

export interface WeightRecord {
  setId: string; // the first set that reached the new weight
  from: number; // the best before, in kg
  to: number;
}

// warmups and failed sets don't count, only sets that were really lifted
const counts = (s: WorkoutSet) => s.done && !s.failed && s.type === 'normal' && s.weightKg > 0;

// The heaviest counted set ever saved for this exercise, or undefined if it was never done
export function bestWeight(exerciseId: string, history: FinishedWorkout[]): number | undefined {
  let best: number | undefined;
  for (const w of history)
    for (const re of w.exercises)
      if (re.exerciseId === exerciseId)
        for (const s of re.sets) if (counts(s)) best = Math.max(best ?? 0, s.weightKg);
  return best;
}

// The record this exercise sets in the workout, if any. The first time an exercise is done
// there's nothing to beat, and cardio's weight isn't something to chase.
export function recordOf(re: RoutineExercise, best: number | undefined): WeightRecord | null {
  if (best === undefined || re.kind === 'cardio') return null;
  let top: WorkoutSet | undefined;
  for (const s of re.sets) if (counts(s) && s.weightKg > (top?.weightKg ?? best)) top = s;
  return top ? { setId: top.id, from: best, to: top.weightKg } : null;
}

// kg without trailing zeros: 50, 52.5
export const kg = (n: number) => `${Math.round(n * 100) / 100}`;

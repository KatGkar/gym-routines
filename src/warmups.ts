import type { Exercise, Routine, RoutineExercise, WorkoutSet } from './types';
import { uid } from './utils';

export const AUTO_WARMUPS = 2;

export const autoWarmupOn = (r: Routine) => r.autoWarmup !== false;

const isAutoWarmup = (s: WorkoutSet) => s.type === 'warmup' && !!s.auto;

// Ids of the exercises that are the first to train one of their primary muscles.
// Only weight & reps exercises count, since only those have warmup sets.
function firstForMuscle(exercises: RoutineExercise[], byId: Map<string, Exercise>): Set<string> {
  const trained = new Set<string>();
  const first = new Set<string>();
  for (const re of exercises) {
    if ((re.kind ?? 'strength') !== 'strength') continue;
    const muscles = byId.get(re.exerciseId)?.primaryMuscles ?? [];
    if (muscles.some((m) => !trained.has(m))) first.add(re.id);
    muscles.forEach((m) => trained.add(m));
  }
  return first;
}

// Warmups start at half the weight of the first working set, to the nearest 0.5 kg
function warmupSet(re: RoutineExercise): WorkoutSet {
  const work = re.sets.find((s) => s.type === 'normal');
  return {
    id: uid(),
    type: 'warmup',
    weightKg: work ? Math.round(work.weightKg) / 2 : 0,
    reps: work?.reps || 10,
    auto: true,
  };
}

// Called on every routine edit. An exercise that just became the first one for a
// primary muscle gets 2 warmups; one that no longer is loses its automatic warmups.
// Exercises that didn't change status are left alone, so deleting a warmup sticks.
export function syncAutoWarmups(
  prev: Routine,
  next: Routine,
  byId: Map<string, Exercise>,
): Routine {
  if (!autoWarmupOn(next)) {
    if (!autoWarmupOn(prev)) return next;
    // just switched off: remove the warmups that were added automatically
    return {
      ...next,
      exercises: next.exercises.map((re) => ({
        ...re,
        sets: re.sets.filter((s) => !isAutoWarmup(s)),
      })),
    };
  }

  const wasFirst = autoWarmupOn(prev) ? firstForMuscle(prev.exercises, byId) : new Set<string>();
  const isFirst = firstForMuscle(next.exercises, byId);

  return {
    ...next,
    exercises: next.exercises.map((re) => {
      if (!isFirst.has(re.id)) {
        return re.sets.some(isAutoWarmup)
          ? { ...re, sets: re.sets.filter((s) => !isAutoWarmup(s)) }
          : re;
      }
      if (wasFirst.has(re.id)) return re;
      const missing = AUTO_WARMUPS - re.sets.filter((s) => s.type === 'warmup').length;
      if (missing <= 0) return re;
      const added = Array.from({ length: missing }, () => warmupSet(re));
      return { ...re, sets: [...added, ...re.sets] };
    }),
  };
}

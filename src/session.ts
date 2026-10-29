import type { ExerciseSetup, Routine, RoutineExercise, WorkoutSession } from './types';
import { uid } from './utils';

export const elapsedMs = (s: WorkoutSession, now: number) =>
  s.accumulatedMs + (s.resumedAt ? now - s.resumedAt : 0);

export const formatDuration = (ms: number) => {
  const t = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  const p = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${p(m)}:${p(s)}` : `${p(m)}:${p(s)}`;
};

// Starts a running workout from a routine, with fresh ids and nothing done
export function createSession(r: Routine): WorkoutSession {
  const now = Date.now();
  return {
    id: uid(),
    routineId: r.id,
    routineName: r.name || 'Untitled routine',
    startedAt: now,
    accumulatedMs: 0,
    resumedAt: now,
    exercises: r.exercises.map((re) => ({
      ...re,
      sets: re.sets.map((s) => ({ ...s, id: uid(), done: false })),
    })),
  };
}

export const setupOf = ({
  exerciseId,
  sets,
  notes,
  repMode,
  kind,
  cardioFields,
}: RoutineExercise): ExerciseSetup => ({ exerciseId, sets, notes, repMode, kind, cardioFields });

// The exercise in use plus its alternatives, one per exercise
const setupsOf = (re: RoutineExercise) => [setupOf(re), ...(re.alternatives ?? [])];

// Swap during a workout. The outgoing exercise stays as an alternative to swap back to.
// A saved alternative comes with its own values, a new one keeps the current sets.
export function swapTo(re: RoutineExercise, exerciseId: string): RoutineExercise {
  if (exerciseId === re.exerciseId) return re;
  const saved = re.alternatives?.find((a) => a.exerciseId === exerciseId);
  const others = (re.alternatives ?? []).filter((a) => a.exerciseId !== exerciseId);
  const incoming: ExerciseSetup = saved
    ? { ...saved, sets: saved.sets.map((s) => ({ ...s, id: uid(), done: false })) }
    : { ...setupOf(re), exerciseId, notes: undefined };
  return { ...re, ...incoming, alternatives: [setupOf(re), ...others] };
}

// Values to keep in the routine: nothing done, and AMRAP has no target so it starts empty again
const forRoutine = (setup: ExerciseSetup): ExerciseSetup => ({
  ...setup,
  sets: setup.sets.map((s) => ({
    ...s,
    done: undefined,
    ...(setup.repMode === 'amrap' && s.type === 'normal' ? { reps: 0 } : {}),
  })),
});

// "Save and update routine": take the order and sets from the session, keep the rest.
// Exercises added during the workout join the routine. A swapped exercise stays as it was
// in the routine, and what it was swapped to is saved as an alternative with today's values.
export function applySessionToRoutine(r: Routine, session: WorkoutSession): Routine {
  const added = new Set(session.addedIds ?? []);
  const fromSession = session.exercises.flatMap((used) => {
    const re = r.exercises.find((x) => x.id === used.id) ?? (added.has(used.id) ? used : null);
    if (!re) return [];
    const setups = setupsOf(used);
    const main = setups.find((x) => x.exerciseId === re.exerciseId) ?? setups[0];
    const alternatives = setups.filter((x) => x !== main).map(forRoutine);
    return [
      {
        ...re,
        // the sets from today if the routine's exercise was done, otherwise they stay as they were
        sets: main === setups[0] ? forRoutine(main).sets : re.sets,
        alternatives: alternatives.length ? alternatives : undefined,
      },
    ];
  });
  const sessionIds = new Set(session.exercises.map((x) => x.id));
  const rest = r.exercises.filter((x) => !sessionIds.has(x.id));
  return { ...r, exercises: [...fromSession, ...rest] };
}

// Plain "Save": the routine keeps its values, but exercises swapped to for the first time
// are saved as alternatives so they're there next time
export function saveNewAlternatives(r: Routine, session: WorkoutSession): Routine {
  return {
    ...r,
    exercises: r.exercises.map((re) => {
      const used = session.exercises.find((x) => x.id === re.id);
      if (!used) return re;
      const known = new Set(setupsOf(re).map((x) => x.exerciseId));
      const fresh = setupsOf(used).filter((x) => !known.has(x.exerciseId));
      return fresh.length
        ? { ...re, alternatives: [...(re.alternatives ?? []), ...fresh.map(forRoutine)] }
        : re;
    }),
  };
}

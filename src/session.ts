import type { Routine, WorkoutSession } from './types';
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

// "Save and update routine": take the order and sets from the session, keep the rest.
// Exercises added during the workout join the routine, swapped ones take the new exercise.
export function applySessionToRoutine(r: Routine, session: WorkoutSession): Routine {
  const added = new Set(session.addedIds ?? []);
  const fromSession = session.exercises.flatMap((used) => {
    const re = r.exercises.find((x) => x.id === used.id) ?? (added.has(used.id) ? used : null);
    if (!re) return [];
    const swapped = used.exerciseId !== re.exerciseId;
    const sets = used.sets.map((s) => ({
      ...s,
      done: undefined,
      // AMRAP has no target, so the next workout starts empty again
      ...(used.repMode === 'amrap' && s.type === 'normal' ? { reps: 0 } : {}),
    }));
    return [
      {
        ...re,
        ...(swapped ? { exerciseId: used.exerciseId, notes: used.notes } : {}),
        sets,
      },
    ];
  });
  const sessionIds = new Set(session.exercises.map((x) => x.id));
  const rest = r.exercises.filter((x) => !sessionIds.has(x.id));
  return { ...r, exercises: [...fromSession, ...rest] };
}

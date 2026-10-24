import { describe, expect, it } from 'vitest';
import { applySessionToRoutine, createSession, elapsedMs, formatDuration } from './session';
import type { Routine, RoutineExercise, WorkoutSession, WorkoutSet } from './types';

const set = (id: string, patch: Partial<WorkoutSet> = {}): WorkoutSet => ({
  id,
  type: 'normal',
  weightKg: 0,
  reps: 10,
  ...patch,
});
const ex = (id: string, sets: WorkoutSet[] = []): RoutineExercise => ({
  id,
  exerciseId: 'x-' + id,
  sets,
});
const baseSession = (exercises: RoutineExercise[]): WorkoutSession => ({
  id: 'w',
  routineId: 'r1',
  routineName: 'Push',
  startedAt: 0,
  accumulatedMs: 0,
  resumedAt: null,
  exercises,
});

describe('formatDuration', () => {
  it('shows mm:ss under an hour and h:mm:ss after', () => {
    expect(formatDuration(0)).toBe('00:00');
    expect(formatDuration(65_000)).toBe('01:05');
    expect(formatDuration(3_725_000)).toBe('1:02:05');
  });

  it('never goes below zero', () => {
    expect(formatDuration(-5000)).toBe('00:00');
  });
});

describe('elapsedMs', () => {
  it('only counts saved time while paused', () => {
    const s = { ...baseSession([]), accumulatedMs: 4000, resumedAt: null };
    expect(elapsedMs(s, 99_000)).toBe(4000);
  });

  it('adds time since the last resume while running', () => {
    const s = { ...baseSession([]), accumulatedMs: 4000, resumedAt: 10_000 };
    expect(elapsedMs(s, 15_000)).toBe(9000);
  });
});

describe('createSession', () => {
  it('copies the routine with fresh ids and nothing done', () => {
    const r: Routine = { id: 'r1', name: '', exercises: [ex('a', [set('s1', { done: true })])] };
    const s = createSession(r);
    expect(s.routineId).toBe('r1');
    expect(s.routineName).toBe('Untitled routine');
    expect(s.resumedAt).toBe(s.startedAt);
    expect(s.exercises[0].id).toBe('a');
    expect(s.exercises[0].sets[0].id).not.toBe('s1');
    expect(s.exercises[0].sets[0].done).toBe(false);
  });
});

describe('applySessionToRoutine', () => {
  const routine: Routine = {
    id: 'r1',
    name: 'Push',
    exercises: [
      { ...ex('a', [set('a1')]), notes: 'seat 4', kind: 'timed' },
      ex('b', [set('b1')]),
      ex('c', [set('c1')]),
    ],
  };

  it('adopts the session order and sets, clearing done', () => {
    const session = baseSession([
      ex('b', [set('n1', { reps: 5, done: true }), set('n2', { done: true })]),
      ex('a', [set('n3', { reps: 8, done: true })]),
    ]);
    const out = applySessionToRoutine(routine, session);
    expect(out.exercises.map((e) => e.id)).toEqual(['b', 'a', 'c']);
    expect(out.exercises[0].sets.map((s) => s.id)).toEqual(['n1', 'n2']);
    expect(out.exercises[0].sets[0].reps).toBe(5);
    expect(out.exercises.flatMap((e) => e.sets).every((s) => s.done === undefined)).toBe(true);
  });

  it('keeps routine-only fields and appends exercises missing from the session', () => {
    const session = baseSession([ex('a', [set('n1')])]);
    const out = applySessionToRoutine(routine, session);
    expect(out.name).toBe('Push');
    expect(out.exercises[0]).toMatchObject({ id: 'a', notes: 'seat 4', kind: 'timed' });
    expect(out.exercises.slice(1)).toEqual(routine.exercises.slice(1));
  });

  it('ignores session exercises that are no longer in the routine', () => {
    const out = applySessionToRoutine(routine, baseSession([ex('zzz', [set('n1')])]));
    expect(out.exercises.map((e) => e.id)).toEqual(['a', 'b', 'c']);
  });

  it('adds exercises that were added during the workout', () => {
    const session = {
      ...baseSession([ex('a', [set('n1')]), ex('new', [set('n2')])]),
      addedIds: ['new'],
    };
    const out = applySessionToRoutine(routine, session);
    expect(out.exercises.map((e) => e.id)).toEqual(['a', 'new', 'b', 'c']);
  });

  it('takes the new exercise from a swap, with its notes', () => {
    const session = baseSession([{ ...ex('a', [set('n1')]), exerciseId: 'other' }]);
    const out = applySessionToRoutine(routine, session);
    expect(out.exercises[0]).toMatchObject({ id: 'a', exerciseId: 'other', kind: 'timed' });
    expect(out.exercises[0].notes).toBeUndefined();
  });

  it('does not keep AMRAP reps as a target', () => {
    const session = baseSession([
      {
        ...ex('b', [set('w', { type: 'warmup', reps: 10 }), set('n1', { reps: 15 })]),
        repMode: 'amrap',
      },
    ]);
    const out = applySessionToRoutine(routine, session);
    expect(out.exercises[0].sets.map((s) => s.reps)).toEqual([10, 0]);
  });
});

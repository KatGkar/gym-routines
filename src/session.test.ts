import { describe, expect, it } from 'vitest';
import {
  applySessionToRoutine,
  createSession,
  elapsedMs,
  finishedBy,
  formatDuration,
  saveNewAlternatives,
  swapTo,
} from './session';
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
    expect(s.exercises[0].sets[0].target).toBe(10); // the planned reps, to tell a failed set
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

  it('does not keep failed sets as failed in the routine', () => {
    const session = baseSession([ex('a', [set('n1', { reps: 5, done: true, failed: true })])]);
    const out = applySessionToRoutine(routine, session);
    expect(out.exercises[0].sets[0]).toMatchObject({ reps: 5, failed: undefined });
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

  it('keeps the routine exercise after a swap and saves the swap as an alternative', () => {
    const used = swapTo(createSession(routine).exercises[0], 'other');
    const session = baseSession([
      { ...used, sets: [set('n1', { reps: 6, done: true })] },
      ...routine.exercises.slice(1),
    ]);
    const out = applySessionToRoutine(routine, session).exercises[0];
    expect(out).toMatchObject({ id: 'a', exerciseId: 'x-a', notes: 'seat 4', kind: 'timed' });
    expect(out.sets[0].reps).toBe(10);
    expect(out.alternatives).toHaveLength(1);
    expect(out.alternatives?.[0]).toMatchObject({ exerciseId: 'other', kind: 'timed' });
    expect(out.alternatives?.[0].sets.map((s) => [s.reps, s.done])).toEqual([[6, undefined]]);
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

describe('swapTo', () => {
  const start = { ...ex('a', [set('s1', { reps: 5 })]), notes: 'seat 4' };

  it('keeps the current sets for a new exercise, and the old one as an alternative', () => {
    const out = swapTo(start, 'other');
    expect(out).toMatchObject({ id: 'a', exerciseId: 'other', notes: undefined });
    expect(out.sets[0].reps).toBe(5);
    expect(out.alternatives?.map((x) => [x.exerciseId, x.notes])).toEqual([['x-a', 'seat 4']]);
  });

  it('brings back a saved alternative with its own values', () => {
    const r = { ...start, alternatives: [{ exerciseId: 'alt', sets: [set('t1', { reps: 12 })] }] };
    const out = swapTo(r, 'alt');
    expect(out.exerciseId).toBe('alt');
    expect(out.sets.map((s) => [s.reps, s.done])).toEqual([[12, false]]);
    expect(out.alternatives?.map((x) => x.exerciseId)).toEqual(['x-a']);
    expect(swapTo(out, 'x-a')).toMatchObject({ exerciseId: 'x-a', notes: 'seat 4' });
  });
});

describe('saveNewAlternatives', () => {
  it('adds exercises swapped to for the first time and keeps the rest of the routine', () => {
    const alt = { exerciseId: 'alt', sets: [set('t1', { reps: 12 })] };
    const routine: Routine = {
      id: 'r1',
      name: '',
      exercises: [{ ...ex('a', [set('a1')]), alternatives: [alt] }, ex('b', [set('b1')])],
    };
    const session = createSession(routine);
    const used = swapTo(swapTo(session.exercises[0], 'alt'), 'new');
    const out = saveNewAlternatives(routine, { ...session, exercises: [used] });
    expect(out.exercises[0].exerciseId).toBe('x-a');
    expect(out.exercises[0].sets).toEqual(routine.exercises[0].sets);
    expect(out.exercises[0].alternatives?.map((x) => x.exerciseId)).toEqual(['alt', 'new']);
    expect(out.exercises[0].alternatives?.[0]).toBe(alt);
    expect(out.exercises[1]).toBe(routine.exercises[1]);
  });
});

describe('finishedBy', () => {
  const tick = (s: WorkoutSession, id: string, done = true): WorkoutSession => ({
    ...s,
    exercises: s.exercises.map((re) =>
      re.id === id ? { ...re, sets: re.sets.map((x) => ({ ...x, done })) } : re,
    ),
  });
  const start = baseSession([ex('a', [set('a1'), set('a2')]), ex('b', [set('b1')])]);

  it('notices an exercise getting all its sets done, failed ones too', () => {
    const half = {
      ...start,
      exercises: [ex('a', [set('a1', { done: true }), set('a2')]), start.exercises[1]],
    };
    expect(finishedBy(start, half)).toBeNull();
    const failed = tick(half, 'a');
    failed.exercises[0].sets[0].failed = true;
    expect(finishedBy(half, failed)).toBe('exercise');
  });

  it('calls it the whole workout when the last exercise is done', () => {
    const aDone = tick(start, 'a');
    expect(finishedBy(aDone, tick(aDone, 'b'))).toBe('workout');
  });

  it('stays quiet for changes to an exercise that was already done', () => {
    const aDone = tick(start, 'a');
    const edited = {
      ...aDone,
      exercises: [{ ...aDone.exercises[0], notes: 'x' }, aDone.exercises[1]],
    };
    expect(finishedBy(aDone, edited)).toBeNull();
    expect(finishedBy(aDone, tick(aDone, 'a', false))).toBeNull();
  });
});

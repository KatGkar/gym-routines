import { describe, expect, it } from 'vitest';
import { bestWeight, kg, recordOf } from './records';
import type { FinishedWorkout, RoutineExercise, WorkoutSet } from './types';

const set = (id: string, weightKg: number, patch: Partial<WorkoutSet> = {}): WorkoutSet => ({
  id,
  type: 'normal',
  weightKg,
  reps: 10,
  done: true,
  ...patch,
});
const bench = (sets: WorkoutSet[]): RoutineExercise => ({ id: 'e1', exerciseId: 'bench', sets });
const workout = (sets: WorkoutSet[]): FinishedWorkout => ({
  id: 'w',
  routineId: 'r',
  routineName: 'Push',
  startedAt: 0,
  durationMs: 0,
  exercises: [{ ...bench(sets), name: 'Bench' }],
});

describe('bestWeight', () => {
  it('is the heaviest set really lifted, across all workouts', () => {
    const history = [
      workout([set('a', 40), set('b', 60, { failed: true })]),
      workout([set('c', 45), set('d', 70, { type: 'warmup' }), set('e', 80, { done: false })]),
    ];
    expect(bestWeight('bench', history)).toBe(45);
  });

  it('is undefined for an exercise never done', () => {
    expect(bestWeight('bench', [])).toBeUndefined();
    expect(bestWeight('squat', [workout([set('a', 40)])])).toBeUndefined();
  });
});

describe('recordOf', () => {
  it('finds the first set that beats the best', () => {
    const re = bench([set('a', 40), set('b', 50), set('c', 50)]);
    expect(recordOf(re, 40)).toEqual({ setId: 'b', from: 40, to: 50 });
  });

  it('needs the set to be done, not failed and heavier than before', () => {
    expect(recordOf(bench([set('a', 50, { done: false })]), 40)).toBeNull();
    expect(recordOf(bench([set('a', 50, { failed: true })]), 40)).toBeNull();
    expect(recordOf(bench([set('a', 40)]), 40)).toBeNull();
  });

  it('has nothing to beat the first time, and skips cardio', () => {
    expect(recordOf(bench([set('a', 50)]), undefined)).toBeNull();
    expect(recordOf({ ...bench([set('a', 50)]), kind: 'cardio' }, 40)).toBeNull();
  });
});

it('kg drops trailing zeros', () => {
  expect(kg(50)).toBe('50');
  expect(kg(52.5)).toBe('52.5');
  expect(kg(0.1 + 0.2)).toBe('0.3');
});

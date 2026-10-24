import { describe, expect, it } from 'vitest';
import { blankSet, formatSet, getCols, gridTemplate, setLabels } from './columns';
import type { RoutineExercise, WorkoutSet } from './types';

const ex = (patch: Partial<RoutineExercise> = {}): RoutineExercise => ({
  id: 'e1',
  exerciseId: 'x',
  sets: [],
  ...patch,
});
const set = (patch: Partial<WorkoutSet> = {}): WorkoutSet => ({
  id: 's',
  type: 'normal',
  weightKg: 0,
  reps: 0,
  ...patch,
});
const keys = (re: RoutineExercise) => getCols(re).map((c) => c.key);

describe('getCols', () => {
  it('picks columns for each kind', () => {
    expect(keys(ex())).toEqual(['weightKg', 'reps']); // strength is the default
    expect(keys(ex({ kind: 'bodyweight' }))).toEqual(['reps']);
    expect(keys(ex({ kind: 'timed' }))).toEqual(['seconds']);
    expect(keys(ex({ kind: 'cardio' }))).toEqual(['minutes', 'distanceKm']);
  });

  it('keeps cardio fields in a fixed order', () => {
    const re = ex({ kind: 'cardio', cardioFields: ['inclinePct', 'weightKg', 'speedKmh'] });
    expect(keys(re)).toEqual(['weightKg', 'speedKmh', 'inclinePct']);
  });
});

describe('gridTemplate', () => {
  it('makes the range reps column wider', () => {
    expect(gridTemplate(ex(), '2rem')).toBe('2.5rem minmax(0,1fr) minmax(0,1fr) 2rem');
    expect(gridTemplate(ex({ repMode: 'range' }), '2rem')).toBe(
      '2.5rem minmax(0,1fr) minmax(0,1.6fr) 2rem',
    );
  });
});

describe('formatSet', () => {
  it('formats strength sets', () => {
    expect(formatSet(ex(), set({ weightKg: 60, reps: 8 }))).toBe('60 kg · 8 reps');
  });

  it('formats a rep range', () => {
    const re = ex({ repMode: 'range' });
    expect(formatSet(re, set({ weightKg: 50, reps: 8, repsMax: 12 }))).toBe('50 kg · 8–12 reps');
  });

  it('formats timed and cardio sets', () => {
    expect(formatSet(ex({ kind: 'timed' }), set({ seconds: 45 }))).toBe('45 Sec');
    expect(formatSet(ex({ kind: 'cardio' }), set({ minutes: 20 }))).toBe('20 Min · 0 km');
  });
});

describe('setLabels', () => {
  it('labels warmups W and counts only normal sets', () => {
    const types: WorkoutSet['type'][] = ['warmup', 'normal', 'warmup', 'normal'];
    expect(setLabels(types.map((type) => set({ type })))).toEqual(['W', '1', 'W', '2']);
  });
});

describe('blankSet', () => {
  it('starts strength sets at 10 reps', () => {
    expect(blankSet(ex(), 'normal')).toMatchObject({ type: 'normal', weightKg: 0, reps: 10 });
  });

  it('adds a max for rep ranges', () => {
    expect(blankSet(ex({ repMode: 'range' }), 'warmup')).toMatchObject({
      type: 'warmup',
      reps: 10,
      repsMax: 12,
    });
  });

  it('uses 30 seconds for timed and no reps for cardio', () => {
    expect(blankSet(ex({ kind: 'timed' }), 'normal')).toMatchObject({ reps: 0, seconds: 30 });
    const cardio = blankSet(ex({ kind: 'cardio', repMode: 'range' }), 'normal');
    expect(cardio.reps).toBe(0);
    expect(cardio.repsMax).toBeUndefined();
  });

  it('gives each set its own id and no done flag', () => {
    const a = blankSet(ex(), 'normal');
    const b = blankSet(ex(), 'normal');
    expect(a.id).not.toBe(b.id);
    expect(a.done).toBeUndefined();
  });
});

describe('AMRAP', () => {
  const amrap = ex({ kind: 'bodyweight', repMode: 'amrap' });

  it('shows the reps done, or just AMRAP when none were filled in', () => {
    expect(formatSet(amrap, set({ reps: 15 }))).toBe('15 reps (AMRAP)');
    expect(formatSet(amrap, set({ reps: 0 }))).toBe('AMRAP');
  });

  it('starts working sets empty but warmups at 10 reps', () => {
    expect(blankSet(amrap, 'normal').reps).toBe(0);
    expect(blankSet(amrap, 'warmup').reps).toBe(10);
  });
});

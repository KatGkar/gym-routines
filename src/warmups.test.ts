import { describe, expect, it } from 'vitest';
import { syncAutoWarmups } from './warmups';
import type { Exercise, Routine, RoutineExercise } from './types';

const byId = new Map(
  (
    [
      ['bench', ['chest'], ['shoulders', 'triceps']],
      ['fly', ['chest'], []],
      ['press', ['shoulders'], ['triceps']],
      ['crunch', ['abdominals'], []],
      ['run', ['quadriceps'], []],
      ['squat', ['quadriceps'], []],
    ] as const
  ).map(([id, primary, secondary]) => [
    id,
    { id, primaryMuscles: [...primary], secondaryMuscles: [...secondary] } as unknown as Exercise,
  ]),
);
const ex = (id: string, patch: Partial<RoutineExercise> = {}): RoutineExercise => ({
  id,
  exerciseId: id,
  kind: 'strength',
  sets: [{ id: id + '-1', type: 'normal', weightKg: 60, reps: 8 }],
  ...patch,
});
const routine = (exercises: RoutineExercise[], patch: Partial<Routine> = {}): Routine => ({
  id: 'r',
  name: '',
  exercises,
  ...patch,
});
const warmups = (r: Routine) =>
  r.exercises.map((e) => e.sets.filter((s) => s.type === 'warmup').length);

// adds the exercises one at a time, like in the editor
const build = (ids: string[]) =>
  ids.reduce(
    (r, id) => syncAutoWarmups(r, { ...r, exercises: [...r.exercises, ex(id)] }, byId),
    routine([]),
  );

describe('syncAutoWarmups', () => {
  it('gives 2 warmups to the first exercise of each primary muscle', () => {
    expect(warmups(build(['bench', 'fly', 'crunch']))).toEqual([2, 0, 2]);
  });

  it('skips muscles an earlier exercise already worked as a secondary muscle', () => {
    expect(warmups(build(['bench', 'press', 'crunch']))).toEqual([2, 0, 2]);
  });

  it('counts muscles from bodyweight exercises but not from cardio', () => {
    const r = syncAutoWarmups(
      routine([]),
      routine([
        ex('fly', { kind: 'bodyweight' }),
        ex('bench'),
        ex('run', { kind: 'cardio' }),
        ex('squat'),
      ]),
      byId,
    );
    expect(warmups(r)).toEqual([0, 0, 0, 2]);
  });

  it('starts warmups at half the working weight', () => {
    expect(build(['bench']).exercises[0].sets[0]).toMatchObject({
      weightKg: 30,
      reps: 8,
      auto: true,
    });
  });

  it('moves the warmups when the order changes', () => {
    const r = build(['bench', 'fly']);
    const out = syncAutoWarmups(r, { ...r, exercises: [r.exercises[1], r.exercises[0]] }, byId);
    expect(warmups(out)).toEqual([2, 0]);
  });

  it('keeps a deleted warmup deleted', () => {
    const r = build(['bench']);
    const edited = routine([{ ...r.exercises[0], sets: r.exercises[0].sets.slice(1) }]);
    expect(warmups(syncAutoWarmups(r, edited, byId))).toEqual([1]);
  });

  it('ignores exercises that are not weight & reps', () => {
    const r = syncAutoWarmups(routine([]), routine([ex('run', { kind: 'cardio' })]), byId);
    expect(warmups(r)).toEqual([0]);
  });

  it('removes only automatic warmups when switched off', () => {
    const r = build(['bench']);
    const manual = { id: 'm', type: 'warmup' as const, weightKg: 20, reps: 10 };
    const withManual = routine([{ ...r.exercises[0], sets: [manual, ...r.exercises[0].sets] }]);
    const off = syncAutoWarmups(withManual, { ...withManual, autoWarmup: false }, byId);
    expect(off.exercises[0].sets.map((s) => s.id)).toEqual(['m', 'bench-1']);
  });
});

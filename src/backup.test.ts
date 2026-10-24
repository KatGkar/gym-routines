import { describe, expect, it } from 'vitest';
import { parseBackup } from './backup';

const set = { id: 's1', type: 'normal', weightKg: 10, reps: 5 };
const routine = (
  id: string,
  exercises: unknown[] = [{ id: 'e', exerciseId: 'x', sets: [set] }],
) => ({ id, name: 'Push', exercises });
const workout = {
  id: 'w1',
  startedAt: 1000,
  durationMs: 60000,
  exercises: [{ id: 'e', sets: [set] }],
};

const parse = (patch: object) =>
  parseBackup(JSON.stringify({ app: 'gym-routines', version: 1, routines: [], ...patch }));

describe('parseBackup', () => {
  it('rejects files that are not backups', () => {
    expect(() => parseBackup('{"app":"other","routines":[]}')).toThrow(/not a Gym Routines/);
    expect(() => parseBackup('{"app":"gym-routines"}')).toThrow(/not a Gym Routines/);
    expect(() => parseBackup('null')).toThrow(/not a Gym Routines/);
    expect(() => parseBackup('nope')).toThrow();
  });

  it('keeps valid data and defaults missing lists', () => {
    const out = parse({ routines: [routine('r1')] });
    expect(out.routines).toHaveLength(1);
    expect(out.customExercises).toEqual([]);
    expect(out.history).toEqual([]);
  });

  it('drops malformed routines', () => {
    const out = parse({
      routines: [
        routine('ok'),
        null,
        { name: 'no id', exercises: [] },
        { id: 'no-list' },
        routine('no-sets', [{ id: 'e', exerciseId: 'x' }]),
        routine('no-exercise-id', [{ id: 'e', sets: [] }]),
      ],
    });
    expect(out.routines.map((r) => r.id)).toEqual(['ok']);
  });

  it('drops malformed history entries', () => {
    const out = parse({
      history: [
        workout,
        { ...workout, id: 'no-start', startedAt: undefined },
        { ...workout, id: 'text-start', startedAt: '1000' },
        { ...workout, id: 'no-duration', durationMs: undefined },
        { ...workout, id: 'no-sets', exercises: [{ id: 'e' }] },
        'junk',
      ],
    });
    expect(out.history.map((h) => h.id)).toEqual(['w1']);
  });

  it('drops bad custom exercises and fills missing arrays', () => {
    const out = parse({
      customExercises: [{ id: 'c1', name: 'Curl', primaryMuscles: 'biceps' }, { id: 'c2' }, 5],
    });
    expect(out.customExercises).toHaveLength(1);
    expect(out.customExercises[0]).toMatchObject({
      id: 'c1',
      primaryMuscles: [],
      secondaryMuscles: [],
      instructions: [],
      images: [],
    });
  });
});

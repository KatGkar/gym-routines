import { describe, expect, it } from 'vitest';
import { exerciseCheer, recordCheer, workoutCheer } from './cheers';

// every line a moment can get, by trying all the random picks
const allLines = (cheer: (rand: () => number) => string) => {
  const lines = new Set<string>();
  const steps = Array.from({ length: 10 }, (_, i) => i / 10);
  for (const a of steps)
    for (const b of steps)
      for (const c of steps) {
        const picks = [a, b, c];
        lines.add(cheer(() => picks.shift() ?? 0));
      }
  return [...lines];
};

const moment = { done: 2, total: 6, failed: 0, muscles: [] as string[] };

describe('exerciseCheer', () => {
  it('talks about the muscle that was trained', () => {
    const lines = allLines((r) => exerciseCheer({ ...moment, muscles: ['quadriceps'] }, r));
    expect(lines.some((l) => l.includes('Leg day'))).toBe(true);
    expect(lines.some((l) => l.includes('Chest'))).toBe(false);
  });

  it('knows the first, the halfway point and the last one coming up', () => {
    expect(allLines((r) => exerciseCheer({ ...moment, done: 1 }, r))).toContain(
      'One down! Your muscles just realised this is really happening.',
    );
    expect(allLines((r) => exerciseCheer({ ...moment, done: 3 }, r))).toContain(
      '50% done. The other 50% is already nervous.',
    );
    expect(allLines((r) => exerciseCheer({ ...moment, done: 5 }, r))).toContain(
      'One more. Your couch can wait.',
    );
  });

  it('is kind about failed sets, and only mentions them when there are some', () => {
    const failing = 'Failure is just your muscles asking for a rematch.';
    expect(allLines((r) => exerciseCheer({ ...moment, failed: 2 }, r))).toContain(failing);
    expect(allLines((r) => exerciseCheer(moment, r))).not.toContain(failing);
  });

  it('jokes about cardio instead of the muscles for cardio', () => {
    const lines = allLines((r) =>
      exerciseCheer({ ...moment, kind: 'cardio', muscles: ['quadriceps'] }, r),
    );
    expect(lines.some((l) => l.startsWith('Cardio'))).toBe(true);
    expect(lines.some((l) => l.includes('Leg day'))).toBe(false);
  });
});

describe('workoutCheer', () => {
  it('celebrates a perfect workout and goes easy on one with failed sets', () => {
    const flawless = 'Not a single rep missed. Flawless victory.';
    expect(allLines((r) => workoutCheer({ minutes: 50, failed: 0, hour: 12 }, r))).toContain(
      flawless,
    );
    expect(allLines((r) => workoutCheer({ minutes: 50, failed: 3, hour: 12 }, r))).not.toContain(
      flawless,
    );
  });

  it('notices quick, long, early and late workouts', () => {
    const lines = (minutes: number, hour: number) =>
      allLines((r) => workoutCheer({ minutes, failed: 0, hour }, r)).join(' ');
    expect(lines(20, 12)).toContain('gym ninja');
    expect(lines(120, 12)).toContain('saga');
    expect(lines(50, 6)).toContain('before sunrise');
    expect(lines(50, 22)).toContain('Night owl');
  });
});

describe('recordCheer', () => {
  it('can say every record line', () => {
    expect(allLines((r) => recordCheer(r))).toContain('The bar just filed for overtime.');
  });
});

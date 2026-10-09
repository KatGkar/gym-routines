import type { WorkoutSession } from './types';

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

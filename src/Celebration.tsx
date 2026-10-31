import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { kg } from './records';

const pick = <T,>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)];
const pct = (done: number, total: number) => Math.round((done / total) * 100);

interface ExerciseProps {
  message: string;
  done: number; // exercises done, including the one just finished
  total: number;
  onClose: () => void;
}

// A card that pops up from the bottom when an exercise is finished, then goes by itself
export function ExerciseCheer({ message, done, total, onClose }: ExerciseProps) {
  // long enough to read the joke
  useEffect(() => {
    const t = setTimeout(onClose, 3800);
    return () => clearTimeout(t);
  }, [onClose]);

  // the bar fills from where it was before this exercise to where it is now
  const bar = {
    '--from': `${pct(done - 1, total)}%`,
    '--to': `${pct(done, total)}%`,
  } as CSSProperties;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <button
        onClick={onClose}
        className="cheer-pop pointer-events-auto mx-auto block w-full max-w-md rounded-2xl bg-slate-900 p-4 text-left shadow-[0_14px_30px_-12px_rgb(60_30_10/0.5)] ring-1 ring-slate-800"
      >
        <div className="flex items-center gap-3">
          <span className="cheer-bounce text-3xl" aria-hidden="true">
            🎯
          </span>
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-slate-100">{message}</div>
            <div className="text-xs text-slate-500">
              {done} of {total} exercises done · {pct(done, total)}%
            </div>
          </div>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800">
          <div className="cheer-bar h-full rounded-full bg-emerald-500" style={bar} />
        </div>
      </button>
    </div>
  );
}

interface RecordProps {
  message: string;
  name: string; // the exercise
  from: number; // the best before, in kg
  to: number;
  onClose: () => void;
}

// Like the exercise card, in gold, when a set beats the heaviest weight ever done
export function RecordCheer({ message, name, from, to, onClose }: RecordProps) {
  useEffect(() => {
    const t = setTimeout(onClose, 4200);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <button
        onClick={onClose}
        className="cheer-pop pointer-events-auto mx-auto block w-full max-w-md rounded-2xl bg-slate-900 p-4 text-left shadow-[0_14px_30px_-12px_rgb(60_30_10/0.5)] ring-2 ring-yellow-600"
      >
        <div className="flex items-center gap-3">
          <span className="cheer-bounce text-3xl" aria-hidden="true">
            🏆
          </span>
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-slate-100">
              New record: +{kg(to - from)} kg on {name}
            </div>
            <div className="text-xs text-slate-500">{message}</div>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2 text-xs text-slate-500 tabular-nums">
          {kg(from)}
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-800">
            <div
              className="cheer-bar h-full rounded-full bg-yellow-600"
              style={{ '--from': '0%', '--to': '100%' } as CSSProperties}
            />
          </div>
          {kg(to)} kg
        </div>
      </button>
    </div>
  );
}

const CONFETTI_COLORS = ['#92654d', '#d6b49a', '#ca8a04', '#3d6b73', '#b91c1c', '#bf8e7a'];

// Two waves, so it keeps raining for a few seconds
function makeConfetti() {
  return Array.from({ length: 180 }, (_, i) => ({
    id: i,
    style: {
      left: `${Math.random() * 100}%`,
      width: `${5 + Math.random() * 7}px`,
      height: `${7 + Math.random() * 9}px`,
      background: pick(CONFETTI_COLORS),
      animationDelay: `${i < 110 ? Math.random() * 0.7 : 1.3 + Math.random() * 1.2}s`,
      animationDuration: `${2.2 + Math.random() * 1.8}s`,
      '--dx': `${(Math.random() - 0.5) * 220}px`,
      '--rot': `${(Math.random() - 0.5) * 1080}deg`,
    } as CSSProperties,
  }));
}

interface WorkoutProps {
  message: string;
  time: string;
  sets: number;
  failed: number;
  exercises: number;
  records: { name: string; from: number; to: number }[];
  onFinish: () => void;
  onClose: () => void;
}

// Confetti and a summary when the last exercise is done
export function WorkoutCheer({
  message,
  time,
  sets,
  failed,
  exercises,
  records,
  onFinish,
  onClose,
}: WorkoutProps) {
  const [confetti] = useState(makeConfetti);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-black/50 px-6"
      onClick={onClose}
    >
      {confetti.map((c) => (
        <span key={c.id} className="confetti" style={c.style} aria-hidden="true" />
      ))}
      <div
        onClick={(e) => e.stopPropagation()}
        className="cheer-pop relative w-full max-w-sm rounded-3xl bg-slate-900 p-6 text-center ring-1 ring-slate-800"
      >
        <div className="cheer-bounce text-6xl" aria-hidden="true">
          🏆
        </div>
        <div className="mt-3 text-2xl font-bold text-slate-100">Workout complete! 🎉</div>
        <p className="mt-1 text-sm text-slate-400">{message}</p>
        <div className="mt-5 grid grid-cols-3 gap-2">
          {[
            [time, 'time'],
            [String(exercises), 'exercises'],
            [String(sets), failed ? `sets · ${failed} failed` : 'sets'],
          ].map(([value, label]) => (
            <div key={label} className="rounded-xl bg-slate-800/50 px-2 py-3">
              <div className="text-lg font-bold text-slate-100 tabular-nums">{value}</div>
              <div className="text-[11px] text-slate-500">{label}</div>
            </div>
          ))}
        </div>
        {records.length > 0 && (
          <div className="mt-3 rounded-xl bg-yellow-600/15 px-3 py-2 text-left text-sm text-yellow-700">
            <div className="font-semibold">
              🏆 {records.length} new {records.length === 1 ? 'record' : 'records'}
            </div>
            {records.map((r) => (
              <div key={r.name}>
                {r.name} {kg(r.from)} → {kg(r.to)} kg (+{kg(r.to - r.from)})
              </div>
            ))}
          </div>
        )}
        <button
          onClick={onFinish}
          className="mt-6 w-full rounded-2xl bg-emerald-500 py-4 text-base font-semibold text-slate-950 active:bg-emerald-400"
        >
          Finish & save
        </button>
        <button
          onClick={onClose}
          className="mt-2 w-full py-2 text-sm text-slate-400 active:text-slate-100"
        >
          Keep going
        </button>
      </div>
    </div>
  );
}

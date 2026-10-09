import { useMemo, useState } from 'react';
import { formatSet } from './columns';
import { formatDuration } from './session';
import type { FinishedWorkout, WorkoutSet } from './types';

interface Props {
  history: FinishedWorkout[];
  onDelete: (id: string) => void;
  onBack: () => void;
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const pad = (n: number) => String(n).padStart(2, '0');
const dayKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const monthName = (d: Date) => d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
const hm = (ms: number) => {
  const m = Math.round(ms / 60000);
  return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`;
};

const labelOf = (sets: WorkoutSet[], i: number) =>
  sets[i].type === 'warmup'
    ? 'W'
    : String(sets.slice(0, i + 1).filter((s) => s.type === 'normal').length);

function WorkoutCard({ w, onDelete }: { w: FinishedWorkout; onDelete: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const total = w.exercises.reduce((n, e) => n + e.sets.length, 0);
  const done = w.exercises.reduce((n, e) => n + e.sets.filter((s) => s.done).length, 0);

  return (
    <li className="rounded-2xl bg-slate-900 ring-1 ring-slate-800">
      <div className="flex items-center">
        <button
          onClick={() => setOpen(!open)}
          className="min-w-0 flex-1 rounded-2xl px-4 py-4 text-left active:bg-slate-800"
        >
          <div className="truncate text-lg font-semibold">{w.routineName}</div>
          <div className="text-sm text-slate-400">
            {new Date(w.startedAt).toLocaleString(undefined, {
              dateStyle: 'medium',
              timeStyle: 'short',
            })}
          </div>
          <div className="text-sm text-slate-500">
            {formatDuration(w.durationMs)} · {done}/{total} sets
          </div>
        </button>
        <button
          onClick={() => {
            if (confirm('Delete this workout from the history?')) onDelete(w.id);
          }}
          aria-label="Delete workout"
          className="shrink-0 px-4 py-4 text-slate-500 active:text-red-400"
        >
          🗑
        </button>
      </div>

      {open && (
        <div className="space-y-3 border-t border-slate-800 px-4 py-3">
          {w.exercises.map((e) => (
            <div key={e.id}>
              <div className="font-medium text-emerald-400">{e.name}</div>
              {e.sets.length === 0 && <div className="text-xs text-slate-500">No sets</div>}
              {e.sets.map((s, i) => (
                <div key={s.id} className="text-sm text-slate-300">
                  <span className="inline-block w-6 text-slate-500">{labelOf(e.sets, i)}</span>
                  {formatSet(e, s)}{' '}
                  <span className={s.done ? 'text-emerald-400' : 'text-slate-600'}>
                    {s.done ? '✓' : '✗'}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </li>
  );
}

export default function HistoryScreen({ history, onDelete, onBack }: Props) {
  const today = new Date();
  const [mode, setMode] = useState<'calendar' | 'list'>('calendar');
  const [month, setMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selected, setSelected] = useState<string | null>(dayKey(today));

  // workouts grouped by the day they were started (local time)
  const byDay = useMemo(() => {
    const m = new Map<string, FinishedWorkout[]>();
    for (const w of history) {
      const k = dayKey(new Date(w.startedAt));
      m.set(k, [...(m.get(k) ?? []), w]);
    }
    return m;
  }, [history]);

  const statsFor = (first: Date) => {
    const y = first.getFullYear();
    const mo = first.getMonth();
    const n = new Date(y, mo + 1, 0).getDate();
    let days = 0;
    let workouts = 0;
    let ms = 0;
    for (let d = 1; d <= n; d++) {
      const list = byDay.get(dayKey(new Date(y, mo, d)));
      if (list) {
        days++;
        workouts += list.length;
        ms += list.reduce((a, w) => a + w.durationMs, 0);
      }
    }
    return { n, days, workouts, ms };
  };

  const y = month.getFullYear();
  const mo = month.getMonth();
  const cur = statsFor(month);
  const prevMonth = new Date(y, mo - 1, 1);
  const prev = statsFor(prevMonth);

  const offset = (new Date(y, mo, 1).getDay() + 6) % 7; // Monday first
  const cells: (number | null)[] = [
    ...Array<null>(offset).fill(null),
    ...Array.from({ length: cur.n }, (_, i) => i + 1),
  ];

  const isCurrentMonth = y === today.getFullYear() && mo === today.getMonth();
  const todayKey = dayKey(today);
  const selectedWorkouts = selected ? (byDay.get(selected) ?? []) : [];

  const goMonth = (delta: number) => {
    setMonth(new Date(y, mo + delta, 1));
    setSelected(null);
  };

  return (
    <div>
      <button onClick={onBack} className="mb-4 py-1 text-slate-400 active:text-white">
        ← Routines
      </button>
      <h1 className="mb-4 text-3xl font-bold tracking-tight">History</h1>

      <div className="mb-4 flex rounded-xl bg-slate-900 p-1 ring-1 ring-slate-800">
        {(['calendar', 'list'] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={
              'flex-1 rounded-lg py-2 text-sm font-medium capitalize ' +
              (mode === m ? 'bg-emerald-500 text-slate-950' : 'text-slate-400')
            }
          >
            {m}
          </button>
        ))}
      </div>

      {mode === 'list' ? (
        <>
          {history.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-700 p-8 text-center text-slate-400">
              No finished workouts yet.
            </div>
          )}
          <ul className="space-y-3">
            {history.map((w) => (
              <WorkoutCard key={w.id} w={w} onDelete={onDelete} />
            ))}
          </ul>
        </>
      ) : (
        <>
          {/* Month stats */}
          <div className="mb-4 rounded-2xl bg-slate-900 p-4 ring-1 ring-slate-800">
            <div className="text-sm text-slate-400">{monthName(month)}</div>
            <div className="mt-1 text-2xl font-bold">
              {cur.days}{' '}
              <span className="text-base font-normal text-slate-400">
                of {cur.n} days trained
              </span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full bg-emerald-500"
                style={{ width: `${(cur.days / cur.n) * 100}%` }}
              />
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-lg font-semibold">{cur.workouts}</div>
                <div className="text-xs text-slate-500">workouts</div>
              </div>
              <div>
                <div className="text-lg font-semibold">{hm(cur.ms)}</div>
                <div className="text-xs text-slate-500">total time</div>
              </div>
              <div>
                <div className="text-lg font-semibold">
                  {cur.workouts ? hm(cur.ms / cur.workouts) : '–'}
                </div>
                <div className="text-xs text-slate-500">avg workout</div>
              </div>
            </div>
            <div className="mt-3 text-xs text-slate-500">
              {prevMonth.toLocaleDateString(undefined, { month: 'long' })}: {prev.days} of{' '}
              {prev.n} days
            </div>
          </div>

          {/* Calendar */}
          <div className="mb-4 rounded-2xl bg-slate-900 p-3 ring-1 ring-slate-800">
            <div className="mb-2 flex items-center justify-between">
              <button
                onClick={() => goMonth(-1)}
                aria-label="Previous month"
                className="px-3 py-1 text-xl text-slate-400 active:text-white"
              >
                ‹
              </button>
              <div className="font-semibold">{monthName(month)}</div>
              <button
                onClick={() => goMonth(1)}
                disabled={isCurrentMonth}
                aria-label="Next month"
                className="px-3 py-1 text-xl text-slate-400 active:text-white disabled:opacity-20"
              >
                ›
              </button>
            </div>

            <div className="mb-1 grid grid-cols-7 gap-1 text-center text-xs text-slate-500">
              {WEEKDAYS.map((d) => (
                <div key={d}>{d}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {cells.map((d, i) => {
                if (d === null) return <div key={`e${i}`} />;
                const k = dayKey(new Date(y, mo, d));
                const list = byDay.get(k);
                const isSelected = selected === k;
                const isToday = k === todayKey;
                return (
                  <button
                    key={k}
                    onClick={() => setSelected(k)}
                    className={
                      'relative flex h-14 items-center justify-center rounded-lg ' +
                      (isSelected
                        ? 'bg-emerald-500/20 ring-2 ring-emerald-500'
                        : isToday
                          ? 'ring-1 ring-slate-500'
                          : 'active:bg-slate-800')
                    }
                  >
                    <span
                      className={
                        'absolute right-1 top-0.5 text-[10px] leading-none ' +
                        (isToday ? 'font-bold text-white' : 'text-slate-400')
                      }
                    >
                      {d}
                    </span>
                    {list && <span className="text-3xl leading-none">💪</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected day */}
          {selected && (
            <div>
              <div className="mb-2 text-sm text-slate-400">
                {new Date(selected + 'T00:00:00').toLocaleDateString(undefined, {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                })}
              </div>
              {selectedWorkouts.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-700 p-6 text-center text-sm text-slate-500">
                  No workout on this day.
                </div>
              ) : (
                <ul className="space-y-3">
                  {selectedWorkouts.map((w) => (
                    <WorkoutCard key={w.id} w={w} onDelete={onDelete} />
                  ))}
                </ul>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
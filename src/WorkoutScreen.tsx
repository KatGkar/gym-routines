import { useEffect, useState } from 'react';
import { imageUrl } from './exercises';
import { useExercises } from './ExercisesContext';
import { blockMinus, getCols, gridTemplate, isRange, num, usesReps } from './columns';
import { elapsedMs, formatDuration } from './session';
import { uid } from './utils';
import type { RoutineExercise, WorkoutSession, WorkoutSet } from './types';

export type FinishMode = 'save' | 'update' | 'discard';

interface Props {
  session: WorkoutSession;
  onChange: (s: WorkoutSession) => void;
  onMinimize: () => void;
  onFinish: (mode: FinishMode) => void;
}

const inputClass =
  'w-full min-w-0 rounded-lg bg-slate-800 px-2 py-2 text-center text-base text-white focus:outline-none focus:ring-2 focus:ring-emerald-500';

const newSet = (re: RoutineExercise): WorkoutSet => {
  const kind = re.kind ?? 'strength';
  const reps = usesReps(re);
  return {
    id: uid(),
    type: 'normal',
    weightKg: 0,
    reps: reps ? 10 : 0,
    ...(kind === 'timed' ? { seconds: 30 } : {}),
    ...(reps && re.repMode === 'range' ? { repsMax: 12 } : {}),
    done: false,
  };
};

const labelOf = (sets: WorkoutSet[], i: number) =>
  sets[i].type === 'warmup'
    ? 'W'
    : String(sets.slice(0, i + 1).filter((s) => s.type === 'normal').length);

export default function WorkoutScreen({ session, onChange, onMinimize, onFinish }: Props) {
  const { byId } = useExercises();
  const [now, setNow] = useState(Date.now());
  const [finishing, setFinishing] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const paused = session.resumedAt === null;
  const elapsed = elapsedMs(session, now);
  const totalSets = session.exercises.reduce((n, re) => n + re.sets.length, 0);
  const doneSets = session.exercises.reduce(
    (n, re) => n + re.sets.filter((s) => s.done).length,
    0,
  );

  const pause = () =>
    onChange({ ...session, accumulatedMs: elapsedMs(session, Date.now()), resumedAt: null });
  const resume = () => onChange({ ...session, resumedAt: Date.now() });

  const updateExercise = (id: string, fn: (re: RoutineExercise) => RoutineExercise) =>
    onChange({
      ...session,
      exercises: session.exercises.map((re) => (re.id === id ? fn(re) : re)),
    });

  const patchSet = (reId: string, setId: string, patch: Partial<WorkoutSet>) =>
    updateExercise(reId, (re) => ({
      ...re,
      sets: re.sets.map((s) => (s.id === setId ? { ...s, ...patch } : s)),
    }));

  const addSet = (reId: string) =>
    updateExercise(reId, (re) => {
      const last = re.sets[re.sets.length - 1];
      return {
        ...re,
        sets: [...re.sets, last ? { ...last, id: uid(), done: false } : newSet(re)],
      };
    });

  const removeLastSet = (reId: string) =>
    updateExercise(reId, (re) => ({ ...re, sets: re.sets.slice(0, -1) }));

  return (
    <div>
      <div className="sticky top-0 z-10 -mx-4 bg-slate-950/95 px-4 pb-3 pt-1 backdrop-blur">
        <div className="mb-1 flex items-center justify-between">
          <button onClick={onMinimize} className="py-1 text-slate-400 active:text-white">
            ← Routines
          </button>
          <span className="truncate pl-3 text-sm text-slate-400">{session.routineName}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <div>
            <div
              className={
                'text-4xl font-bold tabular-nums ' + (paused ? 'text-amber-400' : 'text-white')
              }
            >
              {formatDuration(elapsed)}
            </div>
            <div className="text-xs text-slate-500">
              {paused ? 'Paused' : 'Running'} · {doneSets}/{totalSets} sets
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={paused ? resume : pause}
              className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold ring-1 ring-slate-800 active:bg-slate-800"
            >
              {paused ? '▶ Resume' : '⏸ Pause'}
            </button>
            <button
              onClick={() => setFinishing(true)}
              className="rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-slate-950 active:bg-emerald-400"
            >
              Finish
            </button>
          </div>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-800">
          <div
            className="h-full bg-emerald-500 transition-all"
            style={{ width: `${totalSets ? (doneSets / totalSets) * 100 : 0}%` }}
          />
        </div>
      </div>

      <div className="mt-2 space-y-4 pb-24">
        {session.exercises.map((re) => {
          const ex = byId.get(re.exerciseId);
          const cols = getCols(re);
          const range = isRange(re);
          const template = gridTemplate(re, '2.75rem');
          const allDone = re.sets.length > 0 && re.sets.every((s) => s.done);

          return (
            <section key={re.id} className="rounded-2xl bg-slate-900 p-4 ring-1 ring-slate-800">
              <div className="mb-3 flex items-center gap-3">
                {ex?.images[0] && (
                  <img
                    src={imageUrl(ex.images[0])}
                    alt=""
                    loading="lazy"
                    className="h-12 w-12 shrink-0 rounded-lg bg-slate-800 object-cover"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-emerald-400">
                    {ex?.name ?? 'Unknown exercise'}
                    {allDone && <span className="ml-2 text-xs text-slate-400">✓ done</span>}
                  </div>
                  {re.notes && <div className="text-xs text-slate-400">{re.notes}</div>}
                </div>
              </div>

              {re.sets.length > 0 && (
                <div
                  className="mb-1 grid gap-2 px-0.5 text-center text-xs uppercase text-slate-500"
                  style={{ gridTemplateColumns: template }}
                >
                  <span>Set</span>
                  {cols.map((c) => (
                    <span key={c.key}>
                      {c.key === 'reps' && range ? 'Range reps' : c.label}
                    </span>
                  ))}
                  <span>✓</span>
                </div>
              )}

              <div className="space-y-2">
                {re.sets.map((s, i) => (
                  <div
                    key={s.id}
                    className={'grid items-center gap-2 ' + (s.done ? 'opacity-60' : '')}
                    style={{ gridTemplateColumns: template }}
                  >
                    <div
                      className={
                        'flex h-10 items-center justify-center rounded-lg font-semibold ' +
                        (s.type === 'warmup'
                          ? 'bg-amber-500/20 text-amber-400'
                          : 'bg-slate-800 text-slate-200')
                      }
                    >
                      {labelOf(re.sets, i)}
                    </div>

                    {cols.map((c) => {
                      if (c.key !== 'reps') {
                        const key = c.key;
                        return (
                          <input
                            key={key}
                            type="number"
                            inputMode="decimal"
                            step={c.step}
                            min={0}
                            placeholder="0"
                            value={s[key] || ''}
                            onKeyDown={blockMinus}
                            onChange={(e) =>
                              patchSet(re.id, s.id, {
                                [key]: num(e.target.value),
                              } as Partial<WorkoutSet>)
                            }
                            className={inputClass}
                          />
                        );
                      }
                      return range ? (
                        <div key="reps" className="flex items-center gap-1">
                          <input
                            type="number"
                            inputMode="numeric"
                            min={0}
                            placeholder="8"
                            value={s.reps || ''}
                            onKeyDown={blockMinus}
                            onChange={(e) => {
                              const v = num(e.target.value);
                              patchSet(re.id, s.id, {
                                reps: v,
                                ...(s.repsMax !== undefined && v > s.repsMax
                                  ? { repsMax: v }
                                  : {}),
                              });
                            }}
                            className={inputClass}
                          />
                          <span className="text-slate-500">–</span>
                          <input
                            type="number"
                            inputMode="numeric"
                            min={0}
                            placeholder="12"
                            value={s.repsMax || ''}
                            onKeyDown={blockMinus}
                            onChange={(e) =>
                              patchSet(re.id, s.id, { repsMax: num(e.target.value) })
                            }
                            onBlur={() => {
                              if (s.repsMax !== undefined && s.repsMax > 0 && s.repsMax < s.reps) {
                                patchSet(re.id, s.id, { repsMax: s.reps });
                              }
                            }}
                            className={inputClass}
                          />
                        </div>
                      ) : (
                        <input
                          key="reps"
                          type="number"
                          inputMode="numeric"
                          min={0}
                          placeholder="0"
                          value={s.reps || ''}
                          onKeyDown={blockMinus}
                          onChange={(e) => patchSet(re.id, s.id, { reps: num(e.target.value) })}
                          className={inputClass}
                        />
                      );
                    })}

                    <button
                      onClick={() => patchSet(re.id, s.id, { done: !s.done })}
                      aria-label={s.done ? 'Mark set not done' : 'Mark set done'}
                      className={
                        'h-10 rounded-lg text-lg font-bold ' +
                        (s.done
                          ? 'bg-emerald-500 text-slate-950'
                          : 'bg-slate-800 text-slate-600')
                      }
                    >
                      ✓
                    </button>
                  </div>
                ))}
              </div>

              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => addSet(re.id)}
                  className="flex-1 rounded-lg bg-slate-800 py-2 text-sm font-medium text-slate-200 active:bg-slate-700"
                >
                  + Set
                </button>
                {re.sets.length > 0 && (
                  <button
                    onClick={() => removeLastSet(re.id)}
                    className="flex-1 rounded-lg bg-slate-800 py-2 text-sm font-medium text-slate-400 active:bg-slate-700"
                  >
                    − Last set
                  </button>
                )}
              </div>
            </section>
          );
        })}
      </div>

      {finishing && (
        <div
          className="fixed inset-0 z-50 flex items-end bg-black/60"
          onClick={() => setFinishing(false)}
        >
          <div
            className="mx-auto w-full max-w-md rounded-t-2xl bg-slate-900 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold">Finish workout?</h2>
            <p className="mb-4 mt-1 text-sm text-slate-400">
              {doneSets}/{totalSets} sets done · {formatDuration(elapsed)}
            </p>
            <div className="space-y-2">
              <button
                onClick={() => onFinish('save')}
                className="w-full rounded-xl bg-emerald-500 py-3 font-semibold text-slate-950 active:bg-emerald-400"
              >
                Save workout
              </button>
              <button
                onClick={() => onFinish('update')}
                className="w-full rounded-xl bg-slate-800 py-3 text-sm font-medium text-slate-200 active:bg-slate-700"
              >
                Save and update routine with these values
              </button>
              <button
                onClick={() => {
                  if (confirm('Discard this workout? Nothing will be saved.')) onFinish('discard');
                }}
                className="w-full rounded-xl py-3 text-sm font-medium text-red-400 active:bg-slate-800"
              >
                Discard workout
              </button>
              <button
                onClick={() => setFinishing(false)}
                className="w-full rounded-xl py-3 text-sm text-slate-400 active:bg-slate-800"
              >
                Keep going
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
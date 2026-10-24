import { useEffect, useState } from 'react';
import ExercisePicker from './ExercisePicker';
import { imageUrl } from './exercises';
import { useExercises } from './useExercises';
import {
  blockMinus,
  defaultKind,
  formatSet,
  getCols,
  gridTemplate,
  isAmrap,
  isRange,
  num,
  usesReps,
} from './columns';
import { elapsedMs, formatDuration } from './session';
import { uid } from './utils';
import type {
  Exercise,
  FinishedExercise,
  FinishedWorkout,
  RoutineExercise,
  WorkoutSession,
  WorkoutSet,
} from './types';

export type FinishMode = 'save' | 'update' | 'discard';

interface Props {
  session: WorkoutSession;
  history: FinishedWorkout[];
  onChange: (s: WorkoutSession) => void;
  onMinimize: () => void;
  onFinish: (mode: FinishMode) => void;
}

const inputClass =
  'w-full min-w-0 rounded-lg bg-slate-800 px-2 py-2 text-center text-base text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500';

const newSet = (re: RoutineExercise): WorkoutSet => {
  const kind = re.kind ?? 'strength';
  const reps = usesReps(re);
  return {
    id: uid(),
    type: 'normal',
    weightKg: 0,
    reps: reps && re.repMode !== 'amrap' ? 10 : 0,
    ...(kind === 'timed' ? { seconds: 30 } : {}),
    ...(reps && re.repMode === 'range' ? { repsMax: 12 } : {}),
    done: false,
  };
};

// Reps done in each working set the last time this exercise was done as AMRAP
const lastAmrapReps = (re: RoutineExercise, history: FinishedWorkout[]): number[] => {
  for (const w of history) {
    const prev =
      w.exercises.find((x) => x.id === re.id) ??
      w.exercises.find((x) => x.exerciseId === re.exerciseId);
    if (prev?.repMode !== 'amrap') continue;
    const reps = prev.sets.filter((s) => s.type === 'normal').map((s) => s.reps);
    if (reps.some((n) => n > 0)) return reps;
  }
  return [];
};

// This exercise in the most recent saved workout where at least one of its sets was done
const previousOf = (
  re: Pick<RoutineExercise, 'id' | 'exerciseId'>,
  history: FinishedWorkout[],
): FinishedExercise | undefined => {
  for (const w of history) {
    const prev =
      w.exercises.find((x) => x.id === re.id && x.exerciseId === re.exerciseId) ??
      w.exercises.find((x) => x.exerciseId === re.exerciseId);
    if (prev?.sets.some((s) => s.done)) return prev;
  }
  return undefined;
};

// The matching done set from last time: the nth warmup for a warmup, the nth working set otherwise
const previousSet = (prev: FinishedExercise | undefined, sets: WorkoutSet[], i: number) => {
  const type = sets[i].type;
  const n = sets.slice(0, i).filter((s) => s.type === type).length;
  const match = prev?.sets.filter((s) => s.type === type)[n];
  return match?.done ? match : undefined;
};

const labelOf = (sets: WorkoutSet[], i: number) =>
  sets[i].type === 'warmup'
    ? 'W'
    : String(sets.slice(0, i + 1).filter((s) => s.type === 'normal').length);

export default function WorkoutScreen({ session, history, onChange, onMinimize, onFinish }: Props) {
  const { byId } = useExercises();
  const [now, setNow] = useState(() => Date.now());
  const [finishing, setFinishing] = useState(false);
  // null = closed, 'add' = add a new exercise, otherwise the id of the exercise to swap
  const [picking, setPicking] = useState<string | null>(null);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const paused = session.resumedAt === null;
  const elapsed = elapsedMs(session, now);
  const totalSets = session.exercises.reduce((n, re) => n + re.sets.length, 0);
  const doneSets = session.exercises.reduce((n, re) => n + re.sets.filter((s) => s.done).length, 0);

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
        sets: [
          ...re.sets,
          last
            ? {
                ...last,
                id: uid(),
                done: false,
                ...(isAmrap(re) && last.type === 'normal' ? { reps: 0 } : {}),
              }
            : newSet(re),
        ],
      };
    });

  const removeLastSet = (reId: string) =>
    updateExercise(reId, (re) => ({ ...re, sets: re.sets.slice(0, -1) }));

  // Copy last time's values into a set (only the fields this exercise shows)
  const copyPrevious = (re: RoutineExercise, setId: string, prev: WorkoutSet) =>
    patchSet(
      re.id,
      setId,
      Object.fromEntries(
        getCols(re).flatMap((c) =>
          c.key === 'reps'
            ? [
                ['reps', prev.reps],
                ['repsMax', prev.repsMax],
              ]
            : [[c.key, prev[c.key]]],
        ),
      ),
    );

  // A new exercise starts with the sets done last time, or one empty set
  const addExercise = (e: Exercise) => {
    const id = uid();
    const prev = previousOf({ id, exerciseId: e.id }, history);
    const base: RoutineExercise = prev
      ? {
          id,
          exerciseId: e.id,
          kind: prev.kind,
          repMode: prev.repMode,
          cardioFields: prev.cardioFields,
          sets: [],
        }
      : { id, exerciseId: e.id, kind: defaultKind(e), sets: [] };
    const sets = prev ? prev.sets.map((s) => ({ ...s, id: uid(), done: false })) : [newSet(base)];
    onChange({ ...session, exercises: [...session.exercises, { ...base, sets }] });
  };

  // Swap is a like-for-like replacement (e.g. the machine is taken): keep the type and sets,
  // but the notes were for the old exercise
  const swapExercise = (reId: string, e: Exercise) =>
    updateExercise(reId, (re) => ({ ...re, exerciseId: e.id, notes: undefined }));

  const removeExercise = (re: RoutineExercise) => {
    if (re.sets.some((s) => s.done) && !confirm('Remove this exercise and its done sets?')) return;
    onChange({ ...session, exercises: session.exercises.filter((x) => x.id !== re.id) });
  };

  const pick = (e: Exercise) => {
    if (picking === 'add') addExercise(e);
    else if (picking) swapExercise(picking, e);
    setPicking(null);
  };

  return (
    <div>
      <div className="sticky top-0 z-10 -mx-4 bg-slate-950/95 px-4 pt-1 pb-3 backdrop-blur">
        <div className="mb-1 flex items-center justify-between">
          <button onClick={onMinimize} className="py-1 text-slate-400 active:text-slate-100">
            ← Routines
          </button>
          <span className="truncate pl-3 text-sm text-slate-400">{session.routineName}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <div>
            <div
              className={
                'text-4xl font-bold tabular-nums ' + (paused ? 'text-amber-400' : 'text-slate-100')
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
          const amrap = isAmrap(re);
          const lastReps = amrap ? lastAmrapReps(re, history) : [];
          const prev = previousOf(re, history);
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
                <div className="flex shrink-0 items-center">
                  <button
                    onClick={() => setPicking(re.id)}
                    className="px-2 py-1 text-xs font-medium text-slate-400 active:text-slate-100"
                  >
                    Swap
                  </button>
                  <button
                    onClick={() => removeExercise(re)}
                    aria-label="Remove exercise"
                    className="px-2 py-1 text-slate-500 active:text-red-400"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {re.sets.length > 0 && (
                <div
                  className="mb-1 grid gap-2 px-0.5 text-center text-xs text-slate-500 uppercase"
                  style={{ gridTemplateColumns: template }}
                >
                  <span>Set</span>
                  {cols.map((c) => (
                    <span key={c.key}>
                      {c.key === 'reps' && range
                        ? 'Range reps'
                        : c.key === 'reps' && amrap
                          ? 'AMRAP'
                          : c.label}
                    </span>
                  ))}
                  <span>✓</span>
                </div>
              )}

              <div className="space-y-2">
                {re.sets.map((s, i) => {
                  const last = previousSet(prev, re.sets, i);
                  // AMRAP working sets already show last time's reps inside the box
                  const showLast = last && !(amrap && s.type === 'normal');
                  return (
                    <div key={s.id} className={s.done ? 'opacity-60' : ''}>
                      <div
                        className="grid items-center gap-2"
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
                                  if (
                                    s.repsMax !== undefined &&
                                    s.repsMax > 0 &&
                                    s.repsMax < s.reps
                                  ) {
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
                              placeholder={
                                amrap && s.type === 'normal'
                                  ? lastReps[Number(labelOf(re.sets, i)) - 1]
                                    ? `last ${lastReps[Number(labelOf(re.sets, i)) - 1]}`
                                    : 'max'
                                  : '0'
                              }
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
                      {showLast && (
                        <button
                          onClick={() => copyPrevious(re, s.id, last)}
                          className="mt-0.5 block pl-12 text-left text-[11px] text-slate-500 active:text-slate-300"
                        >
                          Last: {formatSet(prev!, last)}
                        </button>
                      )}
                    </div>
                  );
                })}
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

        <button
          onClick={() => setPicking('add')}
          className="w-full rounded-2xl bg-slate-900 py-4 text-base font-semibold text-emerald-400 ring-1 ring-slate-800 active:bg-slate-800"
        >
          + Add exercise
        </button>
      </div>

      {picking && (
        <ExercisePicker
          title={picking === 'add' ? 'Add exercise' : 'Swap exercise'}
          onPick={pick}
          onClose={() => setPicking(null)}
        />
      )}

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
            <p className="mt-1 mb-4 text-sm text-slate-400">
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

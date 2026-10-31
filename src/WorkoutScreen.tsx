import { useCallback, useEffect, useState } from 'react';
import ExercisePicker from './ExercisePicker';
import { imageUrl } from './exercises';
import { useExercises } from './useExercises';
import {
  NOT_DONE,
  blankSet,
  defaultKind,
  formatSet,
  getCols,
  gridTemplate,
  isAmrap,
  isRange,
  repTarget,
  setLabels,
  withFailed,
} from './columns';
import ImageViewer from './ImageViewer';
import NumInput from './NumInput';
import { elapsedMs, finishedBy, formatDuration, isExerciseDone, swapTo } from './session';
import { ExerciseCheer, RecordCheer, WorkoutCheer } from './Celebration';
import { exerciseCheer, recordCheer, workoutCheer } from './cheers';
import { bestWeight, recordOf } from './records';
import { uid } from './utils';
import { SwapIcon, UndoIcon } from './icons';
import { setEditKey, useUndo } from './useUndo';
import { CARD_GAP, cardShadow, flipCards, isFlipTap, stackRoom } from './cards';
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
  onUpdateRoutine: () => void; // save the current values to the routine, mid-workout
}

const inputClass =
  'w-full min-w-0 rounded-lg bg-slate-800 px-2 py-2 text-center text-base text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500';

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

export default function WorkoutScreen({
  session,
  history,
  onChange,
  onMinimize,
  onFinish,
  onUpdateRoutine,
}: Props) {
  const { byId } = useExercises();
  const [now, setNow] = useState(() => Date.now());
  const [finishing, setFinishing] = useState(false);
  // shows "Routine updated" on the button for a moment
  const [updated, setUpdated] = useState(false);
  useEffect(() => {
    if (!updated) return;
    const t = setTimeout(() => setUpdated(false), 2500);
    return () => clearTimeout(t);
  }, [updated]);
  // the celebration showing after finishing an exercise or the whole workout
  const [cheer, setCheer] = useState<{
    kind: 'exercise' | 'workout' | 'record';
    message: string;
    at: number;
    record?: { name: string; from: number; to: number };
  } | null>(null);
  // stable, so the cheer's timer isn't restarted by the clock ticking every second
  const closeCheer = useCallback(() => setCheer(null), []);
  const [viewing, setViewing] = useState<Exercise | null>(null);
  // null = closed, 'add' = add a new exercise, otherwise the id of the exercise to swap
  const [picking, setPicking] = useState<string | null>(null);
  // the exercise card turned to its empty back side, to add a swap exercise
  const [emptySide, setEmptySide] = useState<string | null>(null);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const paused = session.resumedAt === null;
  const elapsed = elapsedMs(session, now);
  const totalSets = session.exercises.reduce((n, re) => n + re.sets.length, 0);
  const doneSets = session.exercises.reduce((n, re) => n + re.sets.filter((s) => s.done).length, 0);
  const failedSets = session.exercises.reduce(
    (n, re) => n + re.sets.filter((s) => s.failed).length,
    0,
  );
  const doneExercises = session.exercises.filter(isExerciseDone).length;
  const recordFor = (re: RoutineExercise) => recordOf(re, bestWeight(re.exerciseId, history));
  const nameOf = (re: RoutineExercise) => byId.get(re.exerciseId)?.name ?? 'Unknown exercise';

  // the timer is not part of undo: pausing isn't a step, and undo leaves the clock alone
  const { change, undo, canUndo, previous } = useUndo(session, onChange, (old, cur) => ({
    ...old,
    accumulatedMs: cur.accumulatedMs,
    resumedAt: cur.resumedAt,
  }));

  const pause = () =>
    onChange({ ...session, accumulatedMs: elapsedMs(session, Date.now()), resumedAt: null });
  const resume = () => onChange({ ...session, resumedAt: Date.now() });

  const updateExercise = (
    id: string,
    fn: (re: RoutineExercise) => RoutineExercise,
    undoKey?: string,
  ) => {
    const next = {
      ...session,
      exercises: session.exercises.map((re) => (re.id === id ? fn(re) : re)),
    };
    // a cheer when this finishes an exercise or sets a record (undo never does, it doesn't
    // come through here). Finishing the workout beats a record, a record beats an exercise.
    const finished = finishedBy(session, next);
    const before = session.exercises.find((x) => x.id === id);
    const after = next.exercises.find((x) => x.id === id);
    const was = before && recordFor(before);
    const record = after && recordFor(after);
    if (record && finished !== 'workout' && (!was || record.to > was.to)) {
      setCheer((c) => ({
        kind: 'record',
        message: recordCheer(),
        at: (c?.at ?? 0) + 1,
        record: { name: nameOf(after), from: record.from, to: record.to },
      }));
    } else if (finished) {
      const re = next.exercises.find((x) => x.id === id)!;
      const message =
        finished === 'workout'
          ? workoutCheer({
              minutes: elapsed / 60_000,
              failed: next.exercises.reduce((n, x) => n + x.sets.filter((s) => s.failed).length, 0),
              hour: new Date(now).getHours(),
            })
          : exerciseCheer({
              done: next.exercises.filter(isExerciseDone).length,
              total: next.exercises.length,
              failed: re.sets.filter((s) => s.failed).length,
              muscles: byId.get(re.exerciseId)?.primaryMuscles ?? [],
              kind: re.kind,
            });
      // `at` counts up, so a second exercise finished while a cheer shows gets a fresh one
      setCheer((c) => ({ kind: finished, message, at: (c?.at ?? 0) + 1 }));
    }
    change(next, undoKey);
  };

  const patchSet = (reId: string, setId: string, patch: Partial<WorkoutSet>) =>
    updateExercise(
      reId,
      (re) => ({
        ...re,
        sets: re.sets.map((s) => (s.id === setId ? withFailed({ ...s, ...patch }) : s)),
      }),
      setEditKey(setId, patch),
    );

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
                ...NOT_DONE,
                // AMRAP has no target, the next set starts empty again
                ...(isAmrap(re) && last.type === 'normal' ? { reps: 0 } : {}),
              }
            : { ...blankSet(re, 'normal'), ...NOT_DONE },
        ],
      };
    });

  const removeLastSet = (reId: string) =>
    updateExercise(reId, (re) => ({ ...re, sets: re.sets.slice(0, -1) }));

  const toggleAll = (reId: string) =>
    updateExercise(reId, (re) => {
      const allDone = re.sets.length > 0 && re.sets.every((s) => s.done);
      return { ...re, sets: re.sets.map((s) => withFailed({ ...s, done: !allDone })) };
    });

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
    const sets = prev
      ? prev.sets.map((s) => ({ ...s, id: uid(), ...NOT_DONE, target: repTarget(base, s) }))
      : [{ ...blankSet(base, 'normal'), ...NOT_DONE }];
    change({
      ...session,
      exercises: [...session.exercises, { ...base, sets }],
      addedIds: [...(session.addedIds ?? []), id],
    });
  };

  // Swap is for when the machine is taken. The old exercise is kept to swap back to,
  // and on finish the routine saves the new one as an alternative
  const swapExercise = (reId: string, exerciseId: string) =>
    updateExercise(reId, (re) => swapTo(re, exerciseId));

  const removeExercise = (re: RoutineExercise) => {
    if (re.sets.some((s) => s.done) && !confirm('Remove this exercise and its done sets?')) return;
    change({ ...session, exercises: session.exercises.filter((x) => x.id !== re.id) });
  };

  const pick = (e: Exercise) => {
    if (picking === 'add') addExercise(e);
    else if (picking) swapExercise(picking, e.id);
    setPicking(null);
    setEmptySide(null);
  };

  // Tapping a card turns it over: to the next alternative, or to the empty side to add one
  const flipCard = (card: HTMLElement, re: RoutineExercise) => {
    const next = re.alternatives?.[0];
    flipCards([card], () => {
      if (emptySide === re.id) setEmptySide(null);
      else if (next) swapExercise(re.id, next.exerciseId);
      else setEmptySide(re.id);
    });
  };

  // Undoing a swap turns the card back over too
  const undoWithFlip = () => {
    const swapped = session.exercises.filter((re) =>
      previous?.exercises.some((x) => x.id === re.id && x.exerciseId !== re.exerciseId),
    );
    const cards = swapped.flatMap((re) => {
      const card = document.querySelector<HTMLElement>(`[data-card="${re.id}"]`);
      return card ? [card] : [];
    });
    flipCards(cards, undo);
  };

  const moveExercise = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= session.exercises.length) return;
    const list = [...session.exercises];
    [list[index], list[target]] = [list[target], list[index]];
    change({ ...session, exercises: list });
  };

  return (
    <div>
      <div className="sticky top-0 z-10 -mx-4 bg-slate-950/95 px-4 pt-1 pb-3 backdrop-blur">
        <div className="mb-1 flex items-center justify-between">
          <button onClick={onMinimize} className="py-1 text-slate-400 active:text-slate-100">
            ← Routines
          </button>
          <span className="min-w-0 flex-1 truncate px-3 text-center text-lg font-bold text-slate-100">
            {session.routineName}
          </span>
          <button
            onClick={undoWithFlip}
            disabled={!canUndo}
            className="flex shrink-0 items-center gap-1.5 py-1 text-sm text-slate-400 active:text-slate-100 disabled:opacity-30"
          >
            <UndoIcon className="h-4 w-4" />
            Undo
          </button>
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
              {paused ? 'Paused' : 'Running'} · {doneExercises}/{session.exercises.length} exercises
              · {doneSets}/{totalSets} sets
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={paused ? resume : pause}
              className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold ring-1 ring-slate-800 active:bg-slate-800"
            >
              {paused ? 'Resume' : 'Pause'}
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

      <div className={`mt-2 flex flex-col ${CARD_GAP} pb-24`}>
        {session.exercises.map((re, index) => {
          const ex = byId.get(re.exerciseId);
          const cols = getCols(re);
          const range = isRange(re);
          const amrap = isAmrap(re);
          const prev = previousOf(re, history);
          const record = recordFor(re);
          const template = gridTemplate(re, '2.75rem');
          const labels = setLabels(re.sets);
          const allDone = re.sets.length > 0 && re.sets.every((s) => s.done);
          const next = re.alternatives?.[0];
          const name = ex?.name ?? 'Unknown exercise';
          const onBack = emptySide === re.id;

          return (
            <section
              key={re.id}
              data-card={re.id}
              onClick={(e) => {
                // the buttons and boxes on the card do their own thing
                if (isFlipTap(e)) flipCard(e.currentTarget, re);
              }}
              className={
                'relative cursor-pointer rounded-2xl p-4 ' +
                (onBack
                  ? 'border-2 border-dashed border-slate-700 bg-slate-900/60'
                  : 'bg-slate-900 ' + stackRoom(re.alternatives?.length ?? 0))
              }
              style={onBack ? undefined : { boxShadow: cardShadow(re.alternatives?.length ?? 0) }}
            >
              {onBack ? (
                <div className="flex flex-col items-center gap-3 py-6 text-center">
                  <div className="font-semibold text-slate-200">Swap exercise</div>
                  <p className="max-w-60 text-xs text-slate-500">
                    For when {name} is taken. It's saved with your values for next time.
                  </p>
                  <button
                    onClick={() => setPicking(re.id)}
                    className="rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-slate-950 active:bg-emerald-400"
                  >
                    + Add swap exercise
                  </button>
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                    <SwapIcon className="h-3.5 w-3.5" />
                    Tap to go back to {name}
                  </div>
                </div>
              ) : (
                <>
                  <div className="mb-3 flex items-center gap-3">
                    {ex?.images[0] && (
                      <button
                        onClick={() => setViewing(ex)}
                        aria-label="View large photo"
                        className="shrink-0"
                      >
                        <img
                          src={imageUrl(ex.images[0])}
                          crossOrigin="anonymous"
                          alt=""
                          loading="lazy"
                          className="h-12 w-12 rounded-lg bg-slate-800 object-cover"
                        />
                      </button>
                    )}
                    <div className="min-w-0 flex-1">
                      {ex ? (
                        <button
                          onClick={() => setViewing(ex)}
                          className="text-left font-semibold text-emerald-400 active:text-emerald-500"
                        >
                          {ex.name}
                        </button>
                      ) : (
                        <div className="font-semibold text-emerald-400">Unknown exercise</div>
                      )}
                      <div className="flex flex-wrap gap-x-2 text-xs capitalize">
                        <span className="text-slate-300">{ex?.primaryMuscles.join(', ')}</span>
                        {ex && ex.secondaryMuscles.length > 0 && (
                          <span className="text-sky-400">{ex.secondaryMuscles.join(', ')}</span>
                        )}
                      </div>
                      {re.notes && <div className="text-xs text-slate-400">{re.notes}</div>}
                    </div>
                    <button
                      onClick={() => removeExercise(re)}
                      aria-label="Remove exercise"
                      className="shrink-0 px-1 py-1 text-slate-500 active:text-red-400"
                    >
                      ✕
                    </button>
                    <button
                      onClick={() => toggleAll(re.id)}
                      disabled={re.sets.length === 0}
                      aria-label={allDone ? 'Mark all sets not done' : 'Mark all sets done'}
                      className={
                        'flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg font-bold disabled:opacity-30 ' +
                        (allDone ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-600')
                      }
                    >
                      ✓
                    </button>
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
                      const isRecord = record?.setId === s.id;
                      // AMRAP working sets show last time's reps inside the box instead
                      const amrapSet = amrap && s.type === 'normal';
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
                              {labels[i]}
                            </div>

                            {cols.map((c) => {
                              if (c.key !== 'reps') {
                                const key = c.key;
                                const input = (
                                  <NumInput
                                    key={key}
                                    value={s[key]}
                                    decimal={key !== 'seconds'}
                                    onChange={(v) =>
                                      patchSet(re.id, s.id, { [key]: v } as Partial<WorkoutSet>)
                                    }
                                    className={
                                      inputClass +
                                      (isRecord && key === 'weightKg'
                                        ? ' bg-yellow-600/20 ring-2 ring-yellow-600'
                                        : '')
                                    }
                                  />
                                );
                                return isRecord && key === 'weightKg' ? (
                                  <div key={key} className="relative">
                                    {input}
                                    <span className="pointer-events-none absolute -top-2 -right-1 rounded-full bg-yellow-600 px-1.5 text-[10px] leading-4 font-bold text-white">
                                      PR
                                    </span>
                                  </div>
                                ) : (
                                  input
                                );
                              }
                              return range ? (
                                <div key="reps" className="flex items-center gap-1">
                                  <NumInput
                                    value={s.reps}
                                    decimal={false}
                                    placeholder="8"
                                    onChange={(v) =>
                                      patchSet(re.id, s.id, {
                                        reps: v,
                                        ...(s.repsMax !== undefined && v > s.repsMax
                                          ? { repsMax: v }
                                          : {}),
                                      })
                                    }
                                    className={inputClass}
                                  />
                                  <span className="text-slate-500">–</span>
                                  <NumInput
                                    value={s.repsMax}
                                    decimal={false}
                                    placeholder="12"
                                    onChange={(v) => patchSet(re.id, s.id, { repsMax: v })}
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
                                <div key="reps" className="relative">
                                  <NumInput
                                    value={s.reps}
                                    decimal={false}
                                    placeholder={
                                      amrapSet ? (last?.reps ? `last ${last.reps}` : 'max') : '0'
                                    }
                                    onChange={(v) => patchSet(re.id, s.id, { reps: v })}
                                    className={inputClass}
                                  />
                                  {/* the planned reps, once what you type differs */}
                                  {s.target !== undefined && s.reps !== s.target && (
                                    <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-xs text-slate-500">
                                      /{s.target}
                                    </span>
                                  )}
                                </div>
                              );
                            })}

                            {/* turns red as failed when ticked with fewer reps than planned */}
                            <button
                              onClick={() => patchSet(re.id, s.id, { done: !s.done })}
                              aria-label={s.done ? 'Mark set not done' : 'Mark set done'}
                              className={
                                'h-10 rounded-lg text-lg font-bold ' +
                                (s.failed
                                  ? 'bg-red-400 text-slate-950'
                                  : s.done
                                    ? 'bg-emerald-500 text-slate-950'
                                    : 'bg-slate-800 text-slate-600')
                              }
                            >
                              {s.failed ? '✕' : '✓'}
                            </button>
                          </div>
                          {last && !amrapSet && (
                            <button
                              onClick={() => copyPrevious(re, s.id, last)}
                              className="mt-0.5 block pl-12 text-left text-[11px] text-slate-500 active:text-slate-300"
                            >
                              Last: {formatSet(prev!, last)}
                              {last.failed && <span className="text-red-400"> · failed</span>}
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
                    <button
                      onClick={() => moveExercise(index, -1)}
                      disabled={index === 0}
                      aria-label="Move exercise up"
                      className="rounded-lg bg-slate-800 px-4 py-2 text-sm text-slate-300 active:bg-slate-700 disabled:opacity-30"
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => moveExercise(index, 1)}
                      disabled={index === session.exercises.length - 1}
                      aria-label="Move exercise down"
                      className="rounded-lg bg-slate-800 px-4 py-2 text-sm text-slate-300 active:bg-slate-700 disabled:opacity-30"
                    >
                      ↓
                    </button>
                  </div>

                  <div className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
                    <SwapIcon className="h-3.5 w-3.5" />
                    {next ? (
                      <span>
                        Tap to swap to{' '}
                        <span className="text-slate-300">
                          {byId.get(next.exerciseId)?.name ?? 'Unknown exercise'}
                        </span>
                      </span>
                    ) : (
                      'Tap to add a swap exercise'
                    )}
                  </div>
                </>
              )}
            </section>
          );
        })}

        <button
          onClick={() => setPicking('add')}
          className="w-full rounded-2xl bg-slate-900 py-4 text-base font-semibold text-emerald-400 ring-1 ring-slate-800 active:bg-slate-800"
        >
          + Add exercise
        </button>
        <button
          onClick={() => {
            if (!confirm('Update the routine with the values from this workout?')) return;
            onUpdateRoutine();
            setUpdated(true);
          }}
          className="w-full rounded-2xl py-3 text-sm font-medium text-slate-400 ring-1 ring-slate-800 active:bg-slate-900"
        >
          {updated ? '✓ Routine updated' : 'Update routine with these values'}
        </button>
      </div>

      {picking && (
        <ExercisePicker
          title={picking === 'add' ? 'Add exercise' : 'Add swap exercise'}
          onPick={pick}
          onClose={() => setPicking(null)}
        />
      )}

      {cheer?.kind === 'exercise' && (
        <ExerciseCheer
          key={cheer.at}
          message={cheer.message}
          done={doneExercises}
          total={session.exercises.length}
          onClose={closeCheer}
        />
      )}
      {cheer?.kind === 'record' && cheer.record && (
        <RecordCheer
          key={cheer.at}
          message={cheer.message}
          {...cheer.record}
          onClose={closeCheer}
        />
      )}
      {cheer?.kind === 'workout' && (
        <WorkoutCheer
          message={cheer.message}
          time={formatDuration(elapsed)}
          sets={doneSets}
          failed={failedSets}
          exercises={session.exercises.length}
          records={session.exercises.flatMap((re) => {
            const r = recordFor(re);
            return r ? [{ name: nameOf(re), from: r.from, to: r.to }] : [];
          })}
          onFinish={() => {
            setCheer(null);
            setFinishing(true);
          }}
          onClose={closeCheer}
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

      {viewing && <ImageViewer exercise={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
}

import { useState } from 'react';
import type { KeyboardEvent } from 'react';
import ExercisePicker from './ExercisePicker';
import ImageViewer from './ImageViewer';
import { imageUrl } from './exercises';
import { useExercises } from './ExercisesContext';
import { uid } from './utils';

import type {
  CardioField,
  Exercise,
  ExerciseKind,
  Routine,
  RoutineExercise,
  SetType,
  WorkoutSet,
} from './types';

interface Props {
  routine: Routine;
  onChange: (r: Routine) => void;
  onBack: () => void;
}

type NumKey = 'weightKg' | 'seconds' | 'minutes' | 'distanceKm' | 'speedKmh' | 'inclinePct';
interface ColDef {
  key: NumKey | 'reps';
  label: string;
  step: string;
}

const COLS: Record<NumKey, ColDef> = {
  weightKg: { key: 'weightKg', label: 'kg', step: '0.5' },
  seconds: { key: 'seconds', label: 'Sec', step: '5' },
  minutes: { key: 'minutes', label: 'Min', step: '1' },
  distanceKm: { key: 'distanceKm', label: 'km', step: '0.1' },
  speedKmh: { key: 'speedKmh', label: 'km/h', step: '0.1' },
  inclinePct: { key: 'inclinePct', label: 'Incl. %', step: '0.5' },
};
const REPS_COL: ColDef = { key: 'reps', label: 'Reps', step: '1' };

const CARDIO_CHIPS: { key: CardioField; chip: string }[] = [
  { key: 'weightKg', chip: 'Weight' },
  { key: 'minutes', chip: 'Time' },
  { key: 'distanceKm', chip: 'Distance' },
  { key: 'speedKmh', chip: 'Speed' },
  { key: 'inclinePct', chip: 'Incline' },
];
const DEFAULT_CARDIO: CardioField[] = ['minutes', 'distanceKm'];

const KIND_LABELS: Record<ExerciseKind, string> = {
  strength: 'Weight & reps',
  bodyweight: 'Bodyweight reps',
  timed: 'Timed',
  cardio: 'Cardio / distance',
};

// What type a newly added exercise starts as, based on its database category
const defaultKind = (e: Exercise): ExerciseKind => {
  if (e.category === 'cardio') return 'cardio';
  if (e.category === 'stretching') return 'timed';
  if (e.category === 'plyometrics') return 'bodyweight';
  return 'strength';
};

// "W" for warmup sets, 1, 2, 3... for normal sets
const labels = (sets: WorkoutSet[]) => {
  let n = 0;
  return sets.map((s) => (s.type === 'warmup' ? 'W' : String(++n)));
};

// Never allow negative or invalid numbers
const num = (v: string) => Math.max(0, Number(v) || 0);
const blockMinus = (e: KeyboardEvent<HTMLInputElement>) => {
  if (['-', '+', 'e', 'E'].includes(e.key)) e.preventDefault();
};

const inputClass =
  'w-full rounded-lg bg-slate-800 px-2 py-2 text-center text-base text-white focus:outline-none focus:ring-2 focus:ring-emerald-500';

const Chevron = () => (
  <svg
    aria-hidden="true"
    viewBox="0 0 20 20"
    className="h-4 w-4 text-emerald-400"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M5 8l5 5 5-5" />
  </svg>
);

export default function RoutineEditor({ routine, onChange, onBack }: Props) {
  const { byId } = useExercises();
  const [picking, setPicking] = useState(false);
  const [viewing, setViewing] = useState<Exercise | null>(null);

  const updateExercise = (id: string, fn: (re: RoutineExercise) => RoutineExercise) =>
    onChange({
      ...routine,
      exercises: routine.exercises.map((re) => (re.id === id ? fn(re) : re)),
    });

  const addExercise = (e: Exercise) => {
    onChange({
      ...routine,
      exercises: [
        ...routine.exercises,
        { id: uid(), exerciseId: e.id, sets: [], kind: defaultKind(e) },
      ],
    });
    setPicking(false);
  };

  const removeExercise = (id: string) =>
    onChange({ ...routine, exercises: routine.exercises.filter((re) => re.id !== id) });

  const moveExercise = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= routine.exercises.length) return;
    const list = [...routine.exercises];
    [list[index], list[target]] = [list[target], list[index]];
    onChange({ ...routine, exercises: list });
  };

  const setKind = (reId: string, kind: ExerciseKind) =>
    updateExercise(reId, (re) => ({ ...re, kind }));

  const toggleCardioField = (reId: string, field: CardioField) =>
    updateExercise(reId, (re) => {
      const cur = re.cardioFields ?? DEFAULT_CARDIO;
      if (cur.includes(field) && cur.length === 1) return re; // keep at least one
      const next = CARDIO_CHIPS.map((c) => c.key).filter((k) =>
        k === field ? !cur.includes(field) : cur.includes(k),
      );
      return { ...re, cardioFields: next };
    });

  const setRepMode = (reId: string, mode: 'fixed' | 'range') =>
    updateExercise(reId, (re) => ({
      ...re,
      repMode: mode,
      sets: re.sets.map((s) =>
        mode === 'range'
          ? { ...s, repsMax: s.repsMax ?? s.reps + 2 }
          : { ...s, repsMax: undefined },
      ),
    }));

  const addSet = (reId: string, type: SetType) =>
    updateExercise(reId, (re) => {
      const k = re.kind ?? 'strength';
      const usesReps = k === 'strength' || k === 'bodyweight';
      return {
        ...re,
        sets: [
          ...re.sets,
          {
            id: uid(),
            type,
            weightKg: 0,
            reps: usesReps ? 10 : 0,
            ...(k === 'timed' ? { seconds: 30 } : {}),
            ...(usesReps && re.repMode === 'range' ? { repsMax: 12 } : {}),
          },
        ],
      };
    });

  const updateSet = (reId: string, setId: string, patch: Partial<WorkoutSet>) =>
    updateExercise(reId, (re) => ({
      ...re,
      sets: re.sets.map((s) => (s.id === setId ? { ...s, ...patch } : s)),
    }));

  const removeSet = (reId: string, setId: string) =>
    updateExercise(reId, (re) => ({
      ...re,
      sets: re.sets.filter((s) => s.id !== setId),
    }));

  if (picking) {
    return <ExercisePicker onPick={addExercise} onClose={() => setPicking(false)} />;
  }

  return (
    <div>
      <button onClick={onBack} className="mb-4 py-1 text-slate-400 active:text-white">
        ← Routines
      </button>

      <div className="mb-4 flex items-center gap-2 border-b-2 border-transparent focus-within:border-emerald-500">
        <input
          value={routine.name}
          onChange={(e) => onChange({ ...routine, name: e.target.value })}
          onFocus={(e) => e.target.select()}
          placeholder="Routine name"
          className="w-full bg-transparent py-2 text-2xl font-semibold placeholder:text-slate-400 focus:outline-none"
        />
        <span aria-hidden="true" className="text-2xl leading-none text-emerald-400">✎</span>
      </div>

      <div className="space-y-4">
        {routine.exercises.map((re, index) => {
          const ex = byId.get(re.exerciseId);
          const setLabels = labels(re.sets);
          const kind: ExerciseKind = re.kind ?? 'strength';
          const usesReps = kind === 'strength' || kind === 'bodyweight';
          const range = usesReps && re.repMode === 'range';
          const cardioKeys = re.cardioFields ?? DEFAULT_CARDIO;

          const cols: ColDef[] =
            kind === 'strength'
              ? [COLS.weightKg, REPS_COL]
              : kind === 'bodyweight'
                ? [REPS_COL]
                : kind === 'timed'
                  ? [COLS.seconds]
                  : CARDIO_CHIPS.map((c) => c.key)
                      .filter((k) => cardioKeys.includes(k))
                      .map((k) => COLS[k]);

          const gridStyle = {
            gridTemplateColumns: `2.5rem ${cols
              .map((c) => (c.key === 'reps' && range ? 'minmax(0,1.6fr)' : 'minmax(0,1fr)'))
              .join(' ')} 2rem`,
          };

          return (
            <section key={re.id} className="rounded-2xl bg-slate-900 p-4 ring-1 ring-slate-800">
              <div className="mb-3 flex items-center gap-3">
                {ex?.images[0] && (
                  <button
                    onClick={() => setViewing(ex)}
                    aria-label="View large photo"
                    className="shrink-0"
                  >
                    <img
                      src={imageUrl(ex.images[0])}
                      alt=""
                      loading="lazy"
                      className="h-14 w-14 rounded-lg bg-slate-800 object-cover"
                    />
                  </button>
                )}
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-emerald-400">
                    {ex?.name ?? 'Unknown exercise'}
                  </div>
                  <div className="text-xs capitalize text-slate-500">
                    {ex?.primaryMuscles.join(', ')}
                  </div>
                </div>
                <div className="flex shrink-0 items-center">
                  <button
                    onClick={() => moveExercise(index, -1)}
                    disabled={index === 0}
                    aria-label="Move up"
                    className="px-2 py-1 text-slate-400 active:text-white disabled:opacity-20"
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => moveExercise(index, 1)}
                    disabled={index === routine.exercises.length - 1}
                    aria-label="Move down"
                    className="px-2 py-1 text-slate-400 active:text-white disabled:opacity-20"
                  >
                    ↓
                  </button>
                  <button
                    onClick={() => removeExercise(re.id)}
                    aria-label="Remove exercise"
                    className="px-2 py-1 text-slate-500 active:text-red-400"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <textarea
                value={re.notes ?? ''}
                onChange={(e) =>
                  updateExercise(re.id, (x) => ({ ...x, notes: e.target.value }))
                }
                placeholder="Notes (e.g. seat position 4)"
                rows={2}
                className="mb-3 w-full resize-none rounded-lg bg-slate-800 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />

              <div className="mb-3">
                <label className="relative inline-flex items-center gap-1 text-xs uppercase text-slate-500">
                  <span>{KIND_LABELS[kind]}</span>
                  <Chevron />
                  <select
                    value={kind}
                    onChange={(e) => setKind(re.id, e.target.value as ExerciseKind)}
                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                  >
                    <option value="strength">Weight & reps</option>
                    <option value="bodyweight">Bodyweight reps</option>
                    <option value="timed">Timed</option>
                    <option value="cardio">Cardio / distance</option>
                  </select>
                </label>
              </div>

              {kind === 'cardio' && (
                <div className="mb-3 flex flex-wrap gap-2">
                  {CARDIO_CHIPS.map((c) => {
                    const on = cardioKeys.includes(c.key);
                    return (
                      <button
                        key={c.key}
                        onClick={() => toggleCardioField(re.id, c.key)}
                        className={
                          'rounded-full px-3 py-1 text-xs font-medium ' +
                          (on ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400')
                        }
                      >
                        {c.chip}
                      </button>
                    );
                  })}
                </div>
              )}

              {re.sets.length > 0 && (
                <div
                  className="mb-1 grid gap-2 px-0.5 text-center text-xs uppercase text-slate-500"
                  style={gridStyle}
                >
                  <span>Set</span>
                  {cols.map((c) =>
                    c.key === 'reps' ? (
                      <label key="reps" className="relative flex items-center justify-center gap-1">
                        <span>{range ? 'Range reps' : 'Reps'}</span>
                        <Chevron />
                        <select
                          value={range ? 'range' : 'fixed'}
                          onChange={(e) =>
                            setRepMode(re.id, e.target.value as 'fixed' | 'range')
                          }
                          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                        >
                          <option value="fixed">Reps</option>
                          <option value="range">Range reps</option>
                        </select>
                      </label>
                    ) : (
                      <span key={c.key}>{c.label}</span>
                    ),
                  )}
                  <span />
                </div>
              )}

              <div className="space-y-2">
                {re.sets.map((s, i) => (
                  <div key={s.id} className="grid items-center gap-2" style={gridStyle}>
                    <button
                      onClick={() =>
                        updateSet(re.id, s.id, {
                          type: s.type === 'warmup' ? 'normal' : 'warmup',
                        })
                      }
                      aria-label="Toggle warmup or normal set"
                      className={
                        'h-10 rounded-lg font-semibold ' +
                        (s.type === 'warmup'
                          ? 'bg-amber-500/20 text-amber-400'
                          : 'bg-slate-800 text-slate-200')
                      }
                    >
                      {setLabels[i]}
                    </button>

                    {cols.map((c) => {
                      if (c.key !== 'reps') {
                        const key = c.key;
                        return (
                          <input
                            key={key}
                            type="number"
                            inputMode="decimal"
                            step={c.step}
                            placeholder="0"
                            value={s[key] || ''}
                            onChange={(e) =>
                              updateSet(re.id, s.id, {
                                [key]: num(e.target.value),
                              } as Partial<WorkoutSet>)
                            }
                            min={0} onKeyDown={blockMinus} className={inputClass + ' min-w-0'}
                          />
                        );
                      }
                      return range ? (
                        <div key="reps" className="flex items-center gap-1">
                          <input
                            type="number"
                            inputMode="numeric"
                            placeholder="8"
                            value={s.reps || ''}
                            onChange={(e) => {
                              const v = num(e.target.value);
                              updateSet(re.id, s.id, {
                                reps: v,
                                ...(s.repsMax !== undefined && v > s.repsMax
                                  ? { repsMax: v }
                                  : {}),
                              });
                            }}
                            min={0} onKeyDown={blockMinus} className={inputClass + ' min-w-0'}
                          />
                          <span className="text-slate-500">–</span>
                          <input
                            type="number"
                            inputMode="numeric"
                            placeholder="12"
                            value={s.repsMax || ''}
                            onChange={(e) =>
                              updateSet(re.id, s.id, { repsMax: num(e.target.value) })
                            }
                            onBlur={() => {
                              if (
                                s.repsMax !== undefined &&
                                s.repsMax > 0 &&
                                s.repsMax < s.reps
                              ) {
                                updateSet(re.id, s.id, { repsMax: s.reps });
                              }
                            }}
                            min={0} onKeyDown={blockMinus} className={inputClass + ' min-w-0'}
                          />
                        </div>
                      ) : (
                        <input
                          key="reps"
                          type="number"
                          inputMode="numeric"
                          placeholder="0"
                          value={s.reps || ''}
                          onChange={(e) =>
                            updateSet(re.id, s.id, { reps: num(e.target.value) })
                          }
                          min={0} onKeyDown={blockMinus} className={inputClass + ' min-w-0'}
                        />
                      );
                    })}

                    <button
                      onClick={() => removeSet(re.id, s.id)}
                      aria-label="Remove set"
                      className="text-slate-600 active:text-red-400"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>

              <div className="mt-3 flex gap-2">
                {kind === 'strength' && (
                  <button
                    onClick={() => addSet(re.id, 'warmup')}
                    className="flex-1 rounded-lg bg-amber-500/10 py-2 text-sm font-medium text-amber-400 active:bg-amber-500/20"
                  >
                    + Warmup
                  </button>
                )}
                <button
                  onClick={() => addSet(re.id, 'normal')}
                  className="flex-1 rounded-lg bg-slate-800 py-2 text-sm font-medium text-slate-200 active:bg-slate-700"
                >
                  + Set
                </button>
              </div>
            </section>
          );
        })}
      </div>

      <button
        onClick={() => setPicking(true)}
        className="mt-6 w-full rounded-2xl bg-emerald-500 py-4 text-base font-semibold text-slate-950 active:bg-emerald-400"
      >
        + Add exercise
      </button>

      {viewing && <ImageViewer exercise={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
}
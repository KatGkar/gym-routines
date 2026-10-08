import { useState } from 'react';
import ExercisePicker from './ExercisePicker';
import { imageUrl } from './exercises';
import { useExercises } from './ExercisesContext';
import { uid } from './utils';
import type { Exercise, Routine, RoutineExercise, SetType, WorkoutSet } from './types';

interface Props {
  routine: Routine;
  onChange: (r: Routine) => void;
  onBack: () => void;
}

// "W" for warmup sets, 1, 2, 3... for normal sets
const labels = (sets: WorkoutSet[]) => {
  let n = 0;
  return sets.map((s) => (s.type === 'warmup' ? 'W' : String(++n)));
};

const inputClass =
  'w-full rounded-lg bg-slate-800 px-2 py-2 text-center text-base text-white focus:outline-none focus:ring-2 focus:ring-emerald-500';

export default function RoutineEditor({ routine, onChange, onBack }: Props) {
  const { byId } = useExercises();
  const [picking, setPicking] = useState(false);

  const updateExercise = (id: string, fn: (re: RoutineExercise) => RoutineExercise) =>
    onChange({
      ...routine,
      exercises: routine.exercises.map((re) => (re.id === id ? fn(re) : re)),
    });

  const addExercise = (e: Exercise) => {
    onChange({
      ...routine,
      exercises: [...routine.exercises, { id: uid(), exerciseId: e.id, sets: [] }],
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

  const addSet = (reId: string, type: SetType) =>
    updateExercise(reId, (re) => ({
      ...re,
      sets: [...re.sets, { id: uid(), type, weightKg: 0, reps: 10 }],
    }));

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

      <input
        value={routine.name}
        onChange={(e) => onChange({ ...routine, name: e.target.value })}
        placeholder="Routine name"
        className="mb-6 w-full bg-transparent text-3xl font-bold tracking-tight placeholder:text-slate-600 focus:outline-none"
      />

      <div className="space-y-4">
        {routine.exercises.map((re, index) => {
          const ex = byId.get(re.exerciseId);
          const setLabels = labels(re.sets);
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

              {re.sets.length > 0 && (
                <div className="mb-1 grid grid-cols-[2.5rem_1fr_1fr_2rem] gap-2 px-0.5 text-center text-xs uppercase text-slate-500">
                  <span>Set</span>
                  <span>kg</span>
                  <span>Reps</span>
                  <span />
                </div>
              )}

              <div className="space-y-2">
                {re.sets.map((s, i) => (
                  <div key={s.id} className="grid grid-cols-[2.5rem_1fr_1fr_2rem] items-center gap-2">
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
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.5"
                      placeholder="0"
                      value={s.weightKg || ''}
                      onChange={(e) => updateSet(re.id, s.id, { weightKg: Number(e.target.value) })}
                      className={inputClass}
                    />
                    <input
                      type="number"
                      inputMode="numeric"
                      placeholder="0"
                      value={s.reps || ''}
                      onChange={(e) => updateSet(re.id, s.id, { reps: Number(e.target.value) })}
                      className={inputClass}
                    />
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
                <button
                  onClick={() => addSet(re.id, 'warmup')}
                  className="flex-1 rounded-lg bg-amber-500/10 py-2 text-sm font-medium text-amber-400 active:bg-amber-500/20"
                >
                  + Warmup
                </button>
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
    </div>
  );
}
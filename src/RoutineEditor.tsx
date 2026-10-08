import { useState } from 'react';
import ExercisePicker from './ExercisePicker';
import { exerciseById } from './exercises';
import { uid } from './utils';
import type { Exercise, Routine, RoutineExercise, SetType, WorkoutSet } from './types';

interface Props {
  routine: Routine;
  onChange: (r: Routine) => void;
  onBack: () => void;
}

export default function RoutineEditor({ routine, onChange, onBack }: Props) {
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
      <button onClick={onBack}>← Back</button>
      <input
        value={routine.name}
        onChange={(e) => onChange({ ...routine, name: e.target.value })}
        style={{ display: 'block', width: '100%', fontSize: 22, margin: '12px 0', padding: 8 }}
      />

      {routine.exercises.map((re) => (
        <section key={re.id} style={{ borderTop: '1px solid #ccc', padding: '12px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <strong>{exerciseById.get(re.exerciseId)?.name ?? 'Unknown exercise'}</strong>
            <button onClick={() => removeExercise(re.id)}>Remove</button>
          </div>

          {re.sets.map((s, i) => (
            <div key={s.id} style={{ display: 'flex', gap: 8, alignItems: 'center', margin: '6px 0' }}>
              <span style={{ width: 24 }}>{i + 1}</span>
              <select
                value={s.type}
                onChange={(e) => updateSet(re.id, s.id, { type: e.target.value as SetType })}
              >
                <option value="warmup">Warmup</option>
                <option value="normal">Normal</option>
              </select>
              <input
                type="number"
                inputMode="decimal"
                step="0.5"
                value={s.weightKg}
                onChange={(e) => updateSet(re.id, s.id, { weightKg: Number(e.target.value) })}
                style={{ width: 70 }}
              />
              <span>kg ×</span>
              <input
                type="number"
                inputMode="numeric"
                value={s.reps}
                onChange={(e) => updateSet(re.id, s.id, { reps: Number(e.target.value) })}
                style={{ width: 55 }}
              />
              <button onClick={() => removeSet(re.id, s.id)}>✕</button>
            </div>
          ))}

          <button onClick={() => addSet(re.id, 'warmup')}>+ Warmup set</button>{' '}
          <button onClick={() => addSet(re.id, 'normal')}>+ Normal set</button>
        </section>
      ))}

      <button onClick={() => setPicking(true)} style={{ marginTop: 16 }}>
        + Add exercise
      </button>
    </div>
  );
}
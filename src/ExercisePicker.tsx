import { useMemo, useState } from 'react';
import { imageUrl } from './exercises';
import { useExercises } from './ExercisesContext';
import type { Exercise } from './types';

interface Props {
  onPick: (e: Exercise) => void;
  onClose: () => void;
}

const fieldClass =
  'w-full rounded-xl bg-slate-900 px-4 py-3 text-base text-white ring-1 ring-slate-800 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500';

export default function ExercisePicker({ onPick, onClose }: Props) {
  const { all, addCustom } = useExercises();
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [muscle, setMuscle] = useState('');
  const [equipment, setEquipment] = useState('');

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q ? all.filter((e) => e.name.toLowerCase().includes(q)) : all;
    return list.slice(0, 50);
  }, [query, all]);

  const startCreating = () => {
    setName(query.trim());
    setCreating(true);
  };

  const create = () => {
    if (!name.trim()) return;
    onPick(addCustom(name, muscle, equipment));
  };

  if (creating) {
    return (
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold">Custom exercise</h2>
          <button onClick={() => setCreating(false)} className="px-2 py-2 text-slate-400 active:text-white">
            Back
          </button>
        </div>
        <div className="space-y-3">
          <input
            autoFocus
            placeholder="Name (required)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={fieldClass}
          />
          <input
            placeholder="Muscle group (e.g. chest)"
            value={muscle}
            onChange={(e) => setMuscle(e.target.value)}
            className={fieldClass}
          />
          <input
            placeholder="Equipment (e.g. machine, dumbbell)"
            value={equipment}
            onChange={(e) => setEquipment(e.target.value)}
            className={fieldClass}
          />
          <button
            onClick={create}
            disabled={!name.trim()}
            className="w-full rounded-2xl bg-emerald-500 py-4 text-base font-semibold text-slate-950 active:bg-emerald-400 disabled:opacity-40"
          >
            Create and add
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="sticky top-0 -mx-4 bg-slate-950/95 px-4 pb-3 pt-1 backdrop-blur">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-2xl font-bold">Add exercise</h2>
          <button onClick={onClose} className="px-2 py-2 text-slate-400 active:text-white">
            Cancel
          </button>
        </div>
        <input
          type="search"
          autoFocus
          placeholder="Search exercises..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className={fieldClass}
        />
        <button
          onClick={startCreating}
          className="mt-2 w-full rounded-xl bg-slate-900 py-2 text-sm font-medium text-emerald-400 ring-1 ring-slate-800 active:bg-slate-800"
        >
          + Create custom exercise
        </button>
      </div>

      <ul className="mt-2 space-y-2">
        {results.map((e) => (
          <li key={e.id}>
            <button
              onClick={() => onPick(e)}
              className="flex w-full items-center gap-3 rounded-xl bg-slate-900 p-3 text-left ring-1 ring-slate-800 active:bg-slate-800"
            >
              {e.images[0] ? (
                <img
                  src={imageUrl(e.images[0])}
                  alt=""
                  loading="lazy"
                  className="h-14 w-14 shrink-0 rounded-lg bg-slate-800 object-cover"
                />
              ) : (
                <div className="h-14 w-14 shrink-0 rounded-lg bg-slate-800" />
              )}
              <div className="min-w-0">
                <div className="font-medium">{e.name}</div>
                <div className="mt-1 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 capitalize text-emerald-400">
                    {e.primaryMuscles.join(', ') || 'n/a'}
                  </span>
                  <span className="rounded-full bg-slate-800 px-2 py-0.5 capitalize text-slate-400">
                    {e.equipment ?? 'no equipment'}
                  </span>
                  {e.custom && (
                    <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-amber-400">custom</span>
                  )}
                </div>
              </div>
            </button>
          </li>
        ))}
        {results.length === 0 && (
          <li className="py-8 text-center text-slate-500">
            No exercises found. Create a custom one above.
          </li>
        )}
      </ul>
    </div>
  );
}
import { useMemo, useState } from 'react';
import ImageViewer from './ImageViewer';
import { imageUrl } from './exercises';
import { useExercises } from './ExercisesContext';
import { TrashIcon } from './icons';
import type { Exercise } from './types';

interface Props {
  onPick: (e: Exercise) => void;
  onClose: () => void;
}

interface Filters {
  muscle: string;
  secondary: string;
  equipment: string;
  category: string;
  level: string;
}

const NO_FILTERS: Filters = {
  muscle: 'all',
  secondary: 'all',
  equipment: 'all',
  category: 'all',
  level: 'all',
};

const LEVEL_ORDER = ['beginner', 'intermediate', 'expert'];

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const unique = (xs: string[]) => Array.from(new Set(xs)).sort();

const fieldClass =
  'w-full rounded-xl bg-slate-900 px-4 py-3 text-base text-slate-100 ring-1 ring-slate-800 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500';

const selectClass = (active: boolean) =>
  'w-full rounded-xl bg-slate-900 px-3 py-2 text-sm ring-1 focus:outline-none focus:ring-2 focus:ring-emerald-500 ' +
  (active ? 'text-emerald-400 ring-emerald-500' : 'text-slate-100 ring-slate-800');

export default function ExercisePicker({ onPick, onClose }: Props) {
  const { all, addCustom, removeCustom } = useExercises();
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [muscle, setMuscle] = useState('');
  const [equipment, setEquipment] = useState('');
  const [viewing, setViewing] = useState<Exercise | null>(null);

  const setFilter = (key: keyof Filters, value: string) =>
    setFilters((f) => ({ ...f, [key]: value }));

  const activeCount = Object.values(filters).filter((v) => v !== 'all').length;
  const hasAnything = activeCount > 0 || query.trim() !== '';

  const clearAll = () => {
    setFilters(NO_FILTERS);
    setQuery('');
  };

  // Dropdown options are built from the exercise data (including custom ones)
  const options = useMemo(() => {
    const levels = unique(all.map((e) => e.level).filter(Boolean)).sort(
      (a, b) => LEVEL_ORDER.indexOf(a) - LEVEL_ORDER.indexOf(b),
    );
    return {
      muscle: unique(all.flatMap((e) => e.primaryMuscles)),
      secondary: unique(all.flatMap((e) => e.secondaryMuscles)),
      equipment: unique(all.map((e) => e.equipment).filter((x): x is string => !!x)),
      category: unique(all.map((e) => e.category).filter(Boolean)),
      level: levels,
    };
  }, [all]);

  const selects: {
    key: keyof Filters;
    allLabel: string;
    items: { value: string; label: string }[];
  }[] = [
    {
      key: 'muscle',
      allLabel: 'All muscles',
      items: options.muscle.map((m) => ({ value: m, label: cap(m) })),
    },
    {
      key: 'secondary',
      allLabel: 'Any secondary muscle',
      items: options.secondary.map((m) => ({ value: m, label: cap(m) })),
    },
    {
      key: 'equipment',
      allLabel: 'All equipment',
      items: [
        { value: 'none', label: 'No equipment' },
        ...options.equipment.map((m) => ({ value: m, label: cap(m) })),
      ],
    },
    {
      key: 'category',
      allLabel: 'All categories',
      items: options.category.map((m) => ({ value: m, label: cap(m) })),
    },
    {
      key: 'level',
      allLabel: 'All levels',
      items: options.level.map((m) => ({ value: m, label: cap(m) })),
    },
  ];

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return all.filter(
      (e) =>
        (!q || e.name.toLowerCase().includes(q)) &&
        (filters.muscle === 'all' || e.primaryMuscles.includes(filters.muscle)) &&
        (filters.secondary === 'all' || e.secondaryMuscles.includes(filters.secondary)) &&
        (filters.equipment === 'all' ||
          (filters.equipment === 'none' ? !e.equipment : e.equipment === filters.equipment)) &&
        (filters.category === 'all' || e.category === filters.category) &&
        (filters.level === 'all' || e.level === filters.level),
    );
  }, [query, all, filters]);

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
          <button
            onClick={() => setCreating(false)}
            className="px-2 py-2 text-slate-400 active:text-slate-100"
          >
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
    <div className="fixed inset-0 z-40 bg-slate-950">
      <div className="mx-auto flex h-full max-w-md flex-col px-4 pt-6">
        <div className="shrink-0 pb-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-2xl font-bold">Add exercise</h2>
            <button onClick={onClose} className="px-2 py-2 text-slate-400 active:text-slate-100">
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

          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              onClick={() => setShowFilters((v) => !v)}
              className={
                'rounded-xl bg-slate-900 py-2 text-sm font-medium ring-1 active:bg-slate-800 ' +
                (activeCount > 0
                  ? 'text-emerald-400 ring-emerald-500'
                  : 'text-slate-300 ring-slate-800')
              }
            >
              Filters{activeCount > 0 ? ` (${activeCount})` : ''} {showFilters ? '▴' : '▾'}
            </button>
            <button
              onClick={startCreating}
              className="rounded-xl bg-slate-900 py-2 text-sm font-medium text-emerald-400 ring-1 ring-slate-800 active:bg-slate-800"
            >
              + Custom exercise
            </button>
          </div>

          {showFilters && (
            <div className="mt-2 grid grid-cols-2 gap-2">
              {selects.map((s) => (
                <select
                  key={s.key}
                  value={filters[s.key]}
                  onChange={(e) => setFilter(s.key, e.target.value)}
                  className={selectClass(filters[s.key] !== 'all')}
                >
                  <option value="all">{s.allLabel}</option>
                  {s.items.map((it) => (
                    <option key={it.value} value={it.value}>
                      {it.label}
                    </option>
                  ))}
                </select>
              ))}
            </div>
          )}

          <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
            <span>{matches.length} exercises</span>
            {hasAnything && (
              <button onClick={clearAll} className="px-1 py-1 text-sm text-emerald-400">
                Clear filters
              </button>
            )}
          </div>
        </div>

        <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto rounded-2xl bg-slate-900/50 p-2 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {matches.map((e) => (
            <li key={e.id} className="flex items-stretch gap-2">
              <div className="flex min-w-0 flex-1 items-center gap-3 rounded-xl bg-slate-900 p-3 ring-1 ring-slate-800">
                {e.images[0] ? (
                  <button
                    onClick={() => setViewing(e)}
                    aria-label="View large photo"
                    className="shrink-0"
                  >
                    <img
                      src={imageUrl(e.images[0])}
                      alt=""
                      loading="lazy"
                      className="h-16 w-16 rounded-lg bg-slate-800 object-cover"
                    />
                  </button>
                ) : (
                  <div className="h-16 w-16 shrink-0 rounded-lg bg-slate-800" />
                )}
                <button
                  onClick={() => onPick(e)}
                  className="min-w-0 flex-1 text-left active:opacity-70"
                >
                  <div className="font-medium">{e.name}</div>
                  <div className="mt-1 flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 capitalize text-emerald-400">
                      {e.primaryMuscles.join(', ') || 'n/a'}
                    </span>
                    {e.secondaryMuscles.length > 0 && (
                      <span className="rounded-full bg-sky-500/15 px-2 py-0.5 capitalize text-sky-400">
                        {e.secondaryMuscles.join(', ')}
                      </span>
                    )}
                    <span className="rounded-full bg-slate-800 px-2 py-0.5 capitalize text-slate-400">
                      {e.equipment ?? 'no equipment'}
                    </span>
                    {e.custom && (
                      <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-amber-400">
                        custom
                      </span>
                    )}
                  </div>
                </button>
              </div>
              {e.custom && (
                <button
                  onClick={() => {
                    if (
                      confirm(
                        `Delete "${e.name}"? Routines that use it will show it as "Unknown exercise".`,
                      )
                    ) {
                      removeCustom(e.id);
                    }
                  }}
                  aria-label="Delete custom exercise"
                  className="shrink-0 rounded-xl bg-slate-900 px-3 text-slate-500 ring-1 ring-slate-800 active:text-red-400"
                >
                  <TrashIcon className="h-5 w-5" />
                </button>
              )}
            </li>
          ))}
          {matches.length === 0 && (
            <li className="py-8 text-center text-slate-500">
              No exercises found. Try clearing the filters or create a custom exercise.
            </li>
          )}
        </ul>
      </div>

      {viewing && <ImageViewer exercise={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
}

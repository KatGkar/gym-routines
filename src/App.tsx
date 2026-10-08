import { useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import RoutineEditor from './RoutineEditor';
import { ExercisesProvider, useExercises } from './ExercisesContext';
import { useRoutines } from './useRoutines';
import { exportBackup, parseBackup } from './backup';
import { uid } from './utils';
import type { Routine } from './types';

function AppInner() {
  const [routines, setRoutines] = useRoutines();
  const { custom, setCustom } = useExercises();
  const [openId, setOpenId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const open = routines.find((r) => r.id === openId);

  const createRoutine = () => {
    const r: Routine = { id: uid(), name: 'New routine', exercises: [] };
    setRoutines((rs) => [...rs, r]);
    setOpenId(r.id);
  };

  const deleteRoutine = (id: string) => {
    if (confirm('Delete this routine?')) {
      setRoutines((rs) => rs.filter((r) => r.id !== id));
    }
  };

  const duplicateRoutine = (id: string) => {
    const src = routines.find((r) => r.id === id);
    if (!src) return;
    const copy: Routine = {
      id: uid(),
      name: src.name + ' (copy)',
      exercises: src.exercises.map((re) => ({
        ...re,
        id: uid(),
        sets: re.sets.map((s) => ({ ...s, id: uid() })),
      })),
    };
    setRoutines((rs) => [...rs, copy]);
  };

  const onImportFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const data = parseBackup(await file.text());
      const haveRoutines = new Set(routines.map((r) => r.id));
      const newRoutines = data.routines.filter(
        (r) => r && typeof r.id === 'string' && Array.isArray(r.exercises) && !haveRoutines.has(r.id),
      );
      const haveCustom = new Set(custom.map((c) => c.id));
      const newCustom = data.customExercises.filter((c) => c && !haveCustom.has(c.id));

      setRoutines((rs) => [...rs, ...newRoutines]);
      if (newCustom.length) setCustom([...custom, ...newCustom]);
      alert(
        `Imported ${newRoutines.length} routine(s). Skipped ${data.routines.length - newRoutines.length} already here.`,
      );
    } catch (err) {
      alert('Import failed: ' + (err as Error).message);
    }
  };

  return (
    <div className="mx-auto min-h-screen max-w-md px-4 pb-32 pt-6">
      {open ? (
        <RoutineEditor
          routine={open}
          onChange={(r) => setRoutines((rs) => rs.map((x) => (x.id === r.id ? r : x)))}
          onBack={() => setOpenId(null)}
        />
      ) : (
        <>
          <div className="mb-6 flex items-center justify-between">
            <h1 className="text-3xl font-bold tracking-tight">My routines</h1>
            <div className="flex gap-2">
              <button
                onClick={() => exportBackup(routines, custom)}
                className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-slate-300 ring-1 ring-slate-800 active:bg-slate-800"
              >
                Export
              </button>
              <button
                onClick={() => fileRef.current?.click()}
                className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-slate-300 ring-1 ring-slate-800 active:bg-slate-800"
              >
                Import
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="application/json,.json"
                onChange={onImportFile}
                className="hidden"
              />
            </div>
          </div>

          {routines.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-700 p-8 text-center text-slate-400">
              No routines yet. Create your first one below.
            </div>
          )}

          <ul className="space-y-3">
            {routines.map((r) => {
              const setCount = r.exercises.reduce((n, re) => n + re.sets.length, 0);
              return (
                <li
                  key={r.id}
                  className="flex items-center rounded-2xl bg-slate-900 ring-1 ring-slate-800"
                >
                  <button
                    onClick={() => setOpenId(r.id)}
                    className="flex-1 rounded-2xl px-4 py-4 text-left active:bg-slate-800"
                  >
                    <div className="text-lg font-semibold">{r.name || 'Untitled'}</div>
                    <div className="text-sm text-slate-400">
                      {r.exercises.length} exercises · {setCount} sets
                    </div>
                  </button>
                  <button
                    onClick={() => duplicateRoutine(r.id)}
                    aria-label="Duplicate routine"
                    className="px-3 py-4 text-slate-500 active:text-white"
                  >
                    📋
                  </button>
                  <button
                    onClick={() => deleteRoutine(r.id)}
                    aria-label="Delete routine"
                    className="px-4 py-4 text-slate-500 active:text-red-400"
                  >
                    🗑
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="fixed inset-x-0 bottom-0 bg-gradient-to-t from-slate-950 via-slate-950/95 to-transparent px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-8">
            <button
              onClick={createRoutine}
              className="mx-auto block w-full max-w-md rounded-2xl bg-emerald-500 py-4 text-base font-semibold text-slate-950 active:bg-emerald-400"
            >
              + New routine
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default function App() {
  return (
    <ExercisesProvider>
      <AppInner />
    </ExercisesProvider>
  );
}
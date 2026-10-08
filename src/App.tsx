import { useState } from 'react';
import RoutineEditor from './RoutineEditor';
import { useRoutines } from './useRoutines';
import { uid } from './utils';
import type { Routine } from './types';

export default function App() {
  const [routines, setRoutines] = useRoutines();
  const [openId, setOpenId] = useState<string | null>(null);
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
          <h1 className="mb-6 text-3xl font-bold tracking-tight">My routines</h1>

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
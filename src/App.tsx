import { useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import RoutineEditor from './RoutineEditor';
import WorkoutScreen from './WorkoutScreen';
import type { FinishMode } from './WorkoutScreen';
import HistoryScreen from './HistoryScreen';
import { ExercisesProvider, useExercises } from './ExercisesContext';
import { useRoutines } from './useRoutines';
import { useLocalState } from './useLocalState';
import { exportBackup, parseBackup } from './backup';
import { elapsedMs } from './session';
import { uid } from './utils';
import type { FinishedWorkout, Routine, WorkoutSession } from './types';
import { CopyIcon, PlayIcon, TrashIcon } from './icons';

type View = 'routines' | 'history' | 'workout';

function AppInner() {
  const [routines, setRoutines] = useRoutines();
  const { custom, setCustom, byId } = useExercises();
  const [session, setSession] = useLocalState<WorkoutSession | null>(
    'gym-routines:session:v1',
    null,
  );
  const [history, setHistory] = useLocalState<FinishedWorkout[]>('gym-routines:history:v1', []);
  const [view, setView] = useState<View>(session ? 'workout' : 'routines');
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
      name: (src.name || 'Untitled routine') + ' (copy)',
      exercises: src.exercises.map((re) => ({
        ...re,
        id: uid(),
        sets: re.sets.map((s) => ({ ...s, id: uid() })),
      })),
    };
    setRoutines((rs) => [...rs, copy]);
  };

  const startWorkout = (r: Routine) => {
    if (session?.routineId === r.id) {
      setView('workout');
      return;
    }
    if (r.exercises.length === 0) {
      alert('Add some exercises to this routine first.');
      return;
    }
    if (session && !confirm('A workout is already in progress. Discard it and start this one?')) {
      return;
    }
    const now = Date.now();
    setSession({
      id: uid(),
      routineId: r.id,
      routineName: r.name || 'Untitled routine',
      startedAt: now,
      accumulatedMs: 0,
      resumedAt: now,
      exercises: r.exercises.map((re) => ({
        ...re,
        sets: re.sets.map((s) => ({ ...s, id: uid(), done: false })),
      })),
    });
    setView('workout');
  };

  const finishWorkout = (mode: FinishMode) => {
    if (!session) return;
    if (mode !== 'discard') {
      const finished: FinishedWorkout = {
        id: uid(),
        routineId: session.routineId,
        routineName: session.routineName,
        startedAt: session.startedAt,
        durationMs: elapsedMs(session, Date.now()),
        exercises: session.exercises.map((re) => ({
          ...re,
          name: byId.get(re.exerciseId)?.name ?? 'Unknown exercise',
        })),
      };
      setHistory((h) => [finished, ...h]);

      if (mode === 'update') {
        setRoutines((rs) =>
          rs.map((r) =>
            r.id !== session.routineId
              ? r
              : {
                  ...r,
                  exercises: r.exercises.map((re) => {
                    const used = session.exercises.find((x) => x.id === re.id);
                    return used
                      ? { ...re, sets: used.sets.map((s) => ({ ...s, done: undefined })) }
                      : re;
                  }),
                },
          ),
        );
      }
    }
    setSession(null);
    setView('routines');
  };

  const onImportFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const data = parseBackup(await file.text());
      const haveRoutines = new Set(routines.map((r) => r.id));
      const newRoutines = data.routines.filter(
        (r) =>
          r && typeof r.id === 'string' && Array.isArray(r.exercises) && !haveRoutines.has(r.id),
      );
      const haveCustom = new Set(custom.map((c) => c.id));
      const newCustom = data.customExercises.filter((c) => c && !haveCustom.has(c.id));
      const haveHistory = new Set(history.map((h) => h.id));
      const newHistory = data.history.filter(
        (h) => h && typeof h.id === 'string' && !haveHistory.has(h.id),
      );

      setRoutines((rs) => [...rs, ...newRoutines]);
      if (newCustom.length) setCustom([...custom, ...newCustom]);
      if (newHistory.length) {
        setHistory((h) => [...h, ...newHistory].sort((a, b) => b.startedAt - a.startedAt));
      }
      alert(
        `Imported ${newRoutines.length} routine(s) and ${newHistory.length} workout(s). Skipped ${
          data.routines.length - newRoutines.length
        } routine(s) already here.`,
      );
    } catch (err) {
      alert('Import failed: ' + (err as Error).message);
    }
  };

  if (view === 'workout' && session) {
    return (
      <div className="mx-auto min-h-screen max-w-md px-4 pt-6">
        <WorkoutScreen
          session={session}
          onChange={setSession}
          onMinimize={() => setView('routines')}
          onFinish={finishWorkout}
        />
      </div>
    );
  }

  if (view === 'history') {
    return (
      <div className="mx-auto min-h-screen max-w-md px-4 pb-16 pt-6">
        <HistoryScreen
          history={history}
          onDelete={(id) => setHistory((h) => h.filter((w) => w.id !== id))}
          onBack={() => setView('routines')}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen max-w-md px-4 pb-44 pt-6">
      {open ? (
        <RoutineEditor
          routine={open}
          onChange={(r) => setRoutines((rs) => rs.map((x) => (x.id === r.id ? r : x)))}
          onBack={() => setOpenId(null)}
        />
      ) : (
        <>
          <h1 className="mb-4 text-center text-4xl font-bold tracking-tight">My routines</h1>
          <div className="mb-6 flex flex-wrap justify-end gap-2">
            <button
              onClick={() => setView('history')}
              className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-slate-300 ring-1 ring-slate-800 active:bg-slate-800"
            >
              History
            </button>
            <button
              onClick={() => exportBackup(routines, custom, history)}
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

          {session && (
            <button
              onClick={() => setView('workout')}
              className="mb-4 flex w-full items-center justify-between rounded-2xl bg-emerald-500/15 px-4 py-3 text-left ring-1 ring-emerald-500/40 active:bg-emerald-500/25"
            >
              <div>
                <div className="text-sm font-semibold text-emerald-400">Workout in progress</div>
                <div className="text-xs text-slate-400">{session.routineName}</div>
              </div>
              <span className="text-emerald-400">Resume →</span>
            </button>
          )}

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
                    className="min-w-0 flex-1 rounded-2xl px-4 py-4 text-left active:bg-slate-800"
                  >
                    <div className="truncate text-lg font-semibold">
                      {r.name || 'Untitled routine'}
                    </div>
                    <div className="truncate text-sm text-slate-400">
                      {r.exercises.length} exercises · {setCount} sets
                    </div>
                  </button>
                  <button
                    onClick={() => startWorkout(r)}
                    aria-label="Start workout"
                    className="shrink-0 px-3 py-4 text-emerald-400 active:text-slate-100"
                  >
                    <PlayIcon className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => duplicateRoutine(r.id)}
                    aria-label="Duplicate routine"
                    className="shrink-0 px-3 py-4 text-slate-500 active:text-slate-100"
                  >
                    <CopyIcon className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => deleteRoutine(r.id)}
                    aria-label="Delete routine"
                    className="shrink-0 px-3 py-4 text-slate-500 active:text-red-400"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="fixed inset-x-0 bottom-0 bg-gradient-to-t from-slate-950 via-slate-950/95 to-transparent px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-8">
            <button
              onClick={createRoutine}
              className="mx-auto block w-full max-w-md rounded-2xl bg-emerald-500 py-4 text-base font-semibold text-slate-950 active:bg-emerald-400"
            >
              New routine
            </button>
                        <p className="mx-auto mt-2 max-w-md text-center text-[11px] leading-tight text-slate-500">
              Icons made by{' '}
              <a
                href="https://www.magnific.com"
                title="Magnific"
                target="_blank"
                rel="noreferrer"
                className="underline"
              >
                Magnific
              </a>{' '}
              from{' '}
              <a
                href="https://www.flaticon.com/"
                title="Flaticon"
                target="_blank"
                rel="noreferrer"
                className="underline"
              >
                www.flaticon.com
              </a>
              {' · '}Exercises:{' '}
              <a
                href="https://github.com/yuhonas/free-exercise-db"
                target="_blank"
                rel="noreferrer"
                className="underline"
              >
                free-exercise-db
              </a>
            </p>
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

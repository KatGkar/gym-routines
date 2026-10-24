import type { Exercise, FinishedWorkout, Routine } from './types';

export interface BackupFile {
  app: 'gym-routines';
  version: 1;
  exportedAt: string;
  routines: Routine[];
  customExercises: Exercise[];
  history: FinishedWorkout[];
}

export async function exportBackup(
  routines: Routine[],
  customExercises: Exercise[],
  history: FinishedWorkout[],
) {
  const data: BackupFile = {
    app: 'gym-routines',
    version: 1,
    exportedAt: new Date().toISOString(),
    routines,
    customExercises,
    history,
  };
  const name = `gym-routines-${new Date().toISOString().slice(0, 10)}.json`;
  const file = new File([JSON.stringify(data, null, 2)], name, { type: 'application/json' });

  // On iPhone this opens the share sheet (choose "Save to Files")
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Gym routines backup' });
      return;
    } catch (e) {
      if ((e as Error).name === 'AbortError') return;
    }
  }

  // Fallback: normal download (desktop)
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const isStr = (v: unknown) => typeof v === 'string';
const isNum = (v: unknown) => typeof v === 'number' && Number.isFinite(v);

// Sets only need to be objects with an id; everything else is optional or defaulted
const validSets = (v: unknown) => Array.isArray(v) && v.every((s) => isObj(s) && isStr(s.id));

const validExercise = (e: unknown) =>
  isObj(e) && isStr(e.id) && isStr(e.exerciseId) && validSets(e.sets);

const validRoutine = (r: unknown) =>
  isObj(r) && isStr(r.id) && Array.isArray(r.exercises) && r.exercises.every(validExercise);

const validWorkout = (w: unknown) =>
  isObj(w) &&
  isStr(w.id) &&
  isNum(w.startedAt) &&
  isNum(w.durationMs) &&
  Array.isArray(w.exercises) &&
  w.exercises.every((e) => isObj(e) && validSets(e.sets));

const validCustom = (c: unknown): c is Exercise => isObj(c) && isStr(c.id) && isStr(c.name);

const list = (v: unknown) => (Array.isArray(v) ? v : []);

// Make sure the list fields of a custom exercise are real arrays
const fillCustom = (c: Exercise): Exercise => ({
  ...c,
  primaryMuscles: list(c.primaryMuscles),
  secondaryMuscles: list(c.secondaryMuscles),
  instructions: list(c.instructions),
  images: list(c.images),
});

// Reads a backup and drops anything malformed, so a bad file can't crash the app
export function parseBackup(text: string): BackupFile {
  const data = JSON.parse(text);
  if (!isObj(data) || data.app !== 'gym-routines' || !Array.isArray(data.routines)) {
    throw new Error('This is not a Gym Routines backup file');
  }
  return {
    ...(data as unknown as BackupFile),
    routines: data.routines.filter(validRoutine),
    customExercises: list(data.customExercises).filter(validCustom).map(fillCustom),
    history: list(data.history).filter(validWorkout),
  };
}

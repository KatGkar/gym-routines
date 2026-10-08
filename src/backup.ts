import type { Exercise, Routine } from './types';

export interface BackupFile {
  app: 'gym-routines';
  version: 1;
  exportedAt: string;
  routines: Routine[];
  customExercises: Exercise[];
}

export async function exportBackup(routines: Routine[], customExercises: Exercise[]) {
  const data: BackupFile = {
    app: 'gym-routines',
    version: 1,
    exportedAt: new Date().toISOString(),
    routines,
    customExercises,
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

export function parseBackup(text: string): BackupFile {
  const data = JSON.parse(text);
  if (!data || data.app !== 'gym-routines' || !Array.isArray(data.routines)) {
    throw new Error('This is not a Gym Routines backup file');
  }
  return {
    ...data,
    customExercises: Array.isArray(data.customExercises) ? data.customExercises : [],
  };
}
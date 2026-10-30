export interface Exercise {
  id: string;
  name: string;
  equipment: string | null;
  category: string;
  level: string;
  force?: string | null;
  mechanic?: string | null;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  instructions: string[];
  images: string[];
  custom?: boolean;
}

export type SetType = 'warmup' | 'normal';

export type ExerciseKind = 'strength' | 'bodyweight' | 'timed' | 'cardio';

export type CardioField = 'weightKg' | 'minutes' | 'distanceKm' | 'speedKmh' | 'inclinePct';

export type RepMode = 'fixed' | 'range' | 'amrap'; // amrap = as many as possible

export interface WorkoutSet {
  id: string;
  type: SetType;
  weightKg: number;
  reps: number;
  repsMax?: number;
  seconds?: number;
  minutes?: number;
  distanceKm?: number;
  speedKmh?: number;
  inclinePct?: number;
  done?: boolean;
  failed?: boolean; // done, but fewer reps than planned (e.g. 5 of 15); always done too
  target?: number; // the reps planned for this set, in a workout
}

export interface RoutineExercise {
  id: string;
  exerciseId: string;
  sets: WorkoutSet[];
  notes?: string;
  repMode?: RepMode;
  kind?: ExerciseKind;
  cardioFields?: CardioField[];
  alternatives?: ExerciseSetup[]; // saved swaps, e.g. for when the machine is taken
}

// One exercise with its own values, so a routine exercise can keep alternatives to swap to
export type ExerciseSetup = Omit<RoutineExercise, 'id' | 'alternatives'>;

export interface Routine {
  id: string;
  name: string;
  exercises: RoutineExercise[];
}

// A workout in progress (a copy of a routine with done flags)
export interface WorkoutSession {
  id: string;
  routineId: string;
  routineName: string;
  startedAt: number;
  accumulatedMs: number; // time counted before the last resume
  resumedAt: number | null; // null = paused
  exercises: RoutineExercise[];
  addedIds?: string[]; // exercises added during the workout, not in the routine
}

export interface FinishedExercise extends RoutineExercise {
  name: string;
}

export interface FinishedWorkout {
  id: string;
  routineId: string;
  routineName: string;
  startedAt: number;
  durationMs: number;
  exercises: FinishedExercise[];
}

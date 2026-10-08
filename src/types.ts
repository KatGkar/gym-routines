export interface Exercise {
  id: string;
  name: string;
  equipment: string | null;
  category: string;
  level: string;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  instructions: string[];
  images: string[];
  custom?: boolean;
}

export type SetType = 'warmup' | 'normal';

export interface WorkoutSet {
  id: string;
  type: SetType;
  weightKg: number;
  reps: number;
  repsMax?: number;
}

export interface RoutineExercise {
  id: string;
  exerciseId: string;
  sets: WorkoutSet[];
  notes?: string;
  repMode?: 'fixed' | 'range';
}

export interface Routine {
  id: string;
  name: string;
  exercises: RoutineExercise[];
}
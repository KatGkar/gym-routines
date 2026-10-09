import { imageUrl } from './exercises';
import type { Exercise } from './types';

interface Props {
  exercise: Exercise;
  onClose: () => void;
}

export default function ImageViewer({ exercise, onClose }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-slate-950/95 backdrop-blur"
      onClick={onClose}
    >
      <div className="mx-auto flex w-full max-w-md items-start justify-between gap-3 px-4 pt-6">
        <div>
          <h2 className="text-xl font-bold">{exercise.name}</h2>
          <div className="text-sm capitalize text-slate-400">
            {exercise.primaryMuscles.join(', ')}
            {exercise.equipment ? ` · ${exercise.equipment}` : ''}
          </div>
        </div>
        <button
          onClick={onClose}
          aria-label="Close"
          className="px-2 py-1 text-2xl text-slate-400 active:text-white"
        >
          ✕
        </button>
      </div>

      <div
        className="mx-auto w-full max-w-md flex-1 overflow-y-auto px-4 pb-8 pt-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-3">
          {exercise.images.map((p, i) => (
            <img
              key={p}
              src={imageUrl(p)}
              alt={`${exercise.name}, photo ${i + 1}`}
              className="w-full rounded-xl bg-slate-800"
            />
          ))}
        </div>

        {exercise.instructions.length > 0 && (
          <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-slate-300">
            {exercise.instructions.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
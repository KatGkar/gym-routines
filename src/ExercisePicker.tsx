import { useMemo, useState } from 'react';
import { exercises } from './exercises';
import type { Exercise } from './types';

interface Props {
    onPick: (e: Exercise) => void;
    onClose: () => void;
}

export default function ExercisePicker({ onPick, onClose }: Props) {
    const [query, setQuery] = useState('');

    const results = useMemo(() => {
        const q = query.trim().toLowerCase();
        const list = q
            ? exercises.filter((e) => e.name.toLowerCase().includes(q))
            : exercises;
        return list.slice(0, 50);
    }, [query]);

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
                    className="w-full rounded-xl bg-slate-900 px-4 py-3 text-base text-white ring-1 ring-slate-800 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
            </div>

            <ul className="mt-2 space-y-2">
                {results.map((e) => (
                    <li key={e.id}>
                        <button
                            onClick={() => onPick(e)}
                            className="w-full rounded-xl bg-slate-900 px-4 py-3 text-left ring-1 ring-slate-800 active:bg-slate-800"
                        >
                            <div className="font-medium">{e.name}</div>
                            <div className="mt-1 flex flex-wrap gap-2 text-xs">
                                <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 capitalize text-emerald-400">
                                    {e.primaryMuscles.join(', ') || 'n/a'}
                                </span>
                                <span className="rounded-full bg-slate-800 px-2 py-0.5 capitalize text-slate-400">
                                    {e.equipment ?? 'no equipment'}
                                </span>
                            </div>
                        </button>
                    </li>
                ))}
                {results.length === 0 && (
                    <li className="py-8 text-center text-slate-500">No exercises found.</li>
                )}
            </ul>
        </div>
    );
}
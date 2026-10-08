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
      <button onClick={onClose}>← Cancel</button>
      <h2>Add exercise</h2>
      <input
        type="search"
        placeholder="Search exercises..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={{ width: '100%', padding: 8, fontSize: 16 }}
      />
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {results.map((e) => (
          <li key={e.id}>
            <button
              onClick={() => onPick(e)}
              style={{ width: '100%', textAlign: 'left', padding: '10px 0' }}
            >
              <strong>{e.name}</strong>
              <div style={{ fontSize: 13, opacity: 0.7 }}>
                {e.equipment ?? 'no equipment'} · {e.primaryMuscles.join(', ')}
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
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

  return (
    <main style={{ maxWidth: 480, margin: '0 auto', padding: 16 }}>
      {open ? (
        <RoutineEditor
          routine={open}
          onChange={(r) => setRoutines((rs) => rs.map((x) => (x.id === r.id ? r : x)))}
          onBack={() => setOpenId(null)}
        />
      ) : (
        <>
          <h1>My routines</h1>
          {routines.length === 0 && <p>No routines yet.</p>}
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {routines.map((r) => (
              <li
                key={r.id}
                style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #ccc' }}
              >
                <button onClick={() => setOpenId(r.id)} style={{ textAlign: 'left' }}>
                  <strong>{r.name}</strong>
                  <div style={{ fontSize: 13, opacity: 0.7 }}>
                    {r.exercises.length} exercises
                  </div>
                </button>
                <button onClick={() => deleteRoutine(r.id)}>Delete</button>
              </li>
            ))}
          </ul>
          <button onClick={createRoutine}>+ New routine</button>
        </>
      )}
    </main>
  );
}
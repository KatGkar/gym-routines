import { useRef, useState } from 'react';

const LIMIT = 50;

// Undo for a value kept by the parent. Changes with the same key in a row (typing in one
// box) are a single step. `restore` picks what of the current value survives an undo.
export function useUndo<T>(value: T, onChange: (v: T) => void, restore?: (old: T, cur: T) => T) {
  const [past, setPast] = useState<T[]>([]);
  const lastKey = useRef<string | null>(null);

  const change = (next: T, key?: string) => {
    if (!key || key !== lastKey.current) setPast((p) => [...p.slice(1 - LIMIT), value]);
    lastKey.current = key ?? null;
    onChange(next);
  };

  const undo = () => {
    const old = past[past.length - 1];
    if (old === undefined) return;
    lastKey.current = null;
    setPast((p) => p.slice(0, -1));
    onChange(restore ? restore(old, value) : old);
  };

  // previous: what undo would go back to (before `restore`)
  return { change, undo, canUndo: past.length > 0, previous: past[past.length - 1] };
}

// Key for a set edit, so typing a number is one undo step (toggles are always their own)
export const setEditKey = (setId: string, patch: object) =>
  'done' in patch || 'type' in patch ? undefined : `${setId}:${Object.keys(patch).sort()}`;

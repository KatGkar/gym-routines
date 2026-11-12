import { useEffect, useRef, useState } from 'react';
import type { ComponentType, SVGProps } from 'react';
import { DotsIcon, DownloadIcon, HistoryIcon, MoonIcon, SunIcon, UploadIcon } from './icons';
import type { Theme } from './useTheme';

type Props = {
  theme: Theme;
  onHistory: () => void;
  onExport: () => void;
  onImport: () => void;
  onToggleTheme: () => void;
};

export default function MainMenu({ theme, onHistory, onExport, onImport, onToggleTheme }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const item = (
    Icon: ComponentType<SVGProps<SVGSVGElement>>,
    label: string,
    action: () => void,
  ) => (
    <button
      role="menuitem"
      onClick={() => {
        setOpen(false);
        action();
      }}
      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-slate-200 active:bg-slate-800"
    >
      <Icon className="h-5 w-5 text-slate-400" />
      {label}
    </button>
  );

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Menu"
        aria-haspopup="menu"
        aria-expanded={open}
        className="rounded-lg p-2 text-slate-400 active:bg-slate-800 active:text-slate-100"
      >
        <DotsIcon className="h-6 w-6" />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute top-full right-0 z-30 mt-1 w-52 rounded-xl bg-slate-900 p-1 shadow-lg ring-1 ring-slate-700"
        >
          {item(HistoryIcon, 'History', onHistory)}
          <div className="my-1 border-t border-slate-800" />
          {item(DownloadIcon, 'Export backup', onExport)}
          {item(UploadIcon, 'Import backup', onImport)}
          <div className="my-1 border-t border-slate-800" />
          {theme === 'black'
            ? item(SunIcon, 'Light theme', onToggleTheme)
            : item(MoonIcon, 'Black theme', onToggleTheme)}
        </div>
      )}
    </div>
  );
}

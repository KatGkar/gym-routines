import type { SVGProps } from 'react';

type P = SVGProps<SVGSVGElement>;

const base = (p: P): P => ({
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  ...p,
});

export const PlayIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M8 5v14l11-7z" fill="currentColor" />
  </svg>
);

export const CopyIcon = (p: P) => (
  <svg {...base(p)}>
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <path d="M5 15V6a2 2 0 0 1 2-2h9" />
  </svg>
);

export const TrashIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 7h16" />
    <path d="M10 11v6M14 11v6" />
    <path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12" />
    <path d="M9 7V4h6v3" />
  </svg>
);

export const CheckIcon = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M8 12.5l2.5 2.5L16 9.5" />
  </svg>
);

export const PencilIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
  </svg>
);

export const UndoIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M9 14 4 9l5-5" />
    <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
  </svg>
);

export const SwapIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M7 4 3 8l4 4" />
    <path d="M3 8h14" />
    <path d="m17 12 4 4-4 4" />
    <path d="M21 16H7" />
  </svg>
);

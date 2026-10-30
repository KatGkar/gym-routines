// The 3D exercise cards, shared by the routine editor and the workout screen

// Space between the cards
export const CARD_GAP = 'gap-[21px]';

// A card with some thickness and a soft shadow, and its alternatives stacked
// underneath it (up to 2 shown)
export const cardShadow = (stacked: number) =>
  [
    // the outline (ring-1 is a box-shadow too, so it has to be here)
    '0 0 0 1px var(--color-slate-800)',
    '0 2px 0 var(--color-slate-800)',
    ...[1, 2]
      .slice(0, stacked)
      .flatMap((n) => [
        `0 ${n * 7}px 0 ${-n * 3}px var(--color-slate-900)`,
        `0 ${n * 7 + 2}px 0 ${-n * 3 + 1}px var(--color-slate-800)`,
      ]),
    `0 ${14 + Math.min(stacked, 2) * 7}px 24px -14px rgb(60 30 10 / 0.45)`,
  ].join(', ');

// Extra room below a card for the stacked cards
export const stackRoom = (stacked: number) => ['', 'mb-[9px]', 'mb-[18px]'][Math.min(stacked, 2)];

// A tap on the card itself, not on one of its buttons or boxes, which do their own thing
export const isFlipTap = (e: { target: EventTarget }) =>
  !(e.target as HTMLElement).closest('button, input, select, textarea, a, label');

// Turns cards over, with `turn` changing what they show while they're edge-on.
// A tap while cards are still turning is ignored.
let turning = false;

export function flipCards(cards: HTMLElement[], turn: () => void) {
  if (turning) return;
  if (!cards.length || matchMedia('(prefers-reduced-motion: reduce)').matches) return turn();
  turning = true;
  // darker while it's edge-on, so it turns like a real card (a far perspective keeps
  // the near edge from growing into the cards above and below)
  const flat = { transform: 'perspective(2400px) rotateY(0)', filter: 'brightness(1)' };
  const edgeOn = (deg: number) => ({
    transform: `perspective(2400px) rotateY(${deg}deg)`,
    filter: 'brightness(0.8)',
  });
  const opts = { duration: 260, fill: 'forwards' } as const;
  const outs = cards.map((card) => {
    card.style.zIndex = '1';
    return card.animate([flat, edgeOn(90)], {
      ...opts,
      easing: 'cubic-bezier(0.45, 0, 0.8, 0.4)',
    });
  });
  outs[0].onfinish = () => {
    turn();
    cards.forEach((card, i) => {
      // settles with a small overshoot
      card.animate([edgeOn(-90), flat], {
        ...opts,
        easing: 'cubic-bezier(0.2, 0.9, 0.4, 1.2)',
      }).onfinish = (e) => {
        (e.target as Animation).cancel();
        card.style.zIndex = '';
        if (i === 0) turning = false;
      };
      outs[i].cancel();
    });
  };
}

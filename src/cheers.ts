import type { ExerciseKind } from './types';

// Witty lines for the celebrations, picked to fit what just happened

const FIRST = [
  'First one down. The hardest part was showing up, and you nailed that too.',
  'Exercise one: done. The excuses have officially left the building.',
  'One down! Your muscles just realised this is really happening.',
];

const HALFWAY = [
  "Halfway there. It's all downhill from here (the fun kind).",
  '50% done. The other 50% is already nervous.',
  "Halfway! If this were a pizza, you'd still have the best half left.",
];

const ONE_LEFT = [
  'One more. Your couch can wait.',
  'Last one up next. Finish strong, brag later.',
  'Final exercise ahead. Leave nothing in the tank (except maybe water).',
];

const FAILED = [
  "Missed a few reps? That's not failing, that's finding your limit.",
  'Failure is just your muscles asking for a rematch.',
  "Those reps fought back. Next time they won't.",
];

// by primary muscle; the first group an exercise's muscles match wins
const MUSCLES: [string[], string[]][] = [
  [
    ['quadriceps', 'hamstrings', 'glutes', 'calves', 'adductors', 'abductors'],
    [
      'Leg day survived. Stairs now fear you.',
      'Legs done. Walking normally is optional for the next 48 hours.',
      'Never skip leg day? Clearly you never do.',
    ],
  ],
  [
    ['chest'],
    ['Chest done. Your t-shirts are getting nervous.', 'Pecs pumped. Doorways may need widening.'],
  ],
  [
    ['lats', 'middle back', 'lower back', 'traps'],
    [
      "Back done. You're building the wings, flying comes later.",
      'Back day in the bag. Posture: legendary.',
    ],
  ],
  [
    ['biceps', 'triceps', 'forearms'],
    ['Arms done. Your sleeves have been notified.', 'Guns loaded. Please flex responsibly.'],
  ],
  [
    ['shoulders'],
    ['Boulder shoulders loading… 73%.', 'Shoulders done. Shrugging now comes with extra drama.'],
  ],
  [
    ['abdominals'],
    [
      "Abs done. They're still hiding, but now they're scared.",
      'Core work complete. Sneezing will hurt tomorrow. Worth it.',
    ],
  ],
];

const CARDIO = [
  'Cardio done. Your heart says thanks (and also: why?).',
  "Cardio complete. You outran absolutely no one, and that's fine.",
];

const GENERAL = [
  'WOW, one step closer to the finish!',
  'Gravity 0, you 1.',
  'Somewhere, a dumbbell is crying.',
  'That weight had it coming.',
  'Another one down 💪',
  'Sweat is just your fat crying. Keep it sobbing.',
];

const PERFECT = ['Not a single rep missed. Flawless victory.', 'Every rep, every set. Show-off.'];

const FAILED_WORKOUT = [
  "You pushed until your muscles said no. That's exactly where growth happens.",
  "A few reps got away. They'll be back, and so will you.",
];

const QUICK = [
  'In and out like a gym ninja.',
  'Short, sharp, done. Efficiency is a love language.',
];

const LONG = [
  "That wasn't a workout, that was a saga. Respect.",
  'You basically live here now. Pay your rent in protein.',
];

const EARLY = [
  'Done before sunrise. Who even are you?',
  "Most people are still asleep. You're already a legend.",
];

const LATE = [
  'Night owl gains. The weights never sleep, and apparently neither do you.',
  'Late-night lift done. Tonight you dream in PRs.',
];

const GENERAL_WORKOUT = [
  'Workout done. Go eat something heroic.',
  'Your future self just high-fived you.',
  'Every exercise done. Be proud of that one.',
];

// Usually a line that fits the moment, now and then a general one so they don't get old
function choose(fitting: string[][], general: string[], rand: () => number) {
  const pool =
    fitting.length > 0 && rand() < 0.8 ? fitting[Math.floor(rand() * fitting.length)] : general;
  return pool[Math.floor(rand() * pool.length)];
}

export interface ExerciseMoment {
  done: number; // exercises done, including this one
  total: number;
  failed: number; // failed sets in this exercise
  muscles: string[]; // its primary muscles
  kind?: ExerciseKind;
}

export function exerciseCheer(m: ExerciseMoment, rand = Math.random): string {
  const fitting: string[][] = [];
  if (m.done === 1) fitting.push(FIRST);
  if (m.total - m.done === 1) fitting.push(ONE_LEFT);
  else if (m.total >= 4 && m.done === Math.ceil(m.total / 2)) fitting.push(HALFWAY);
  if (m.failed > 0) fitting.push(FAILED);
  const muscle = MUSCLES.find(([group]) => m.muscles.some((x) => group.includes(x)));
  if (m.kind === 'cardio') fitting.push(CARDIO);
  else if (muscle) fitting.push(muscle[1]);
  return choose(fitting, GENERAL, rand);
}

export interface WorkoutMoment {
  minutes: number;
  failed: number; // failed sets in the whole workout
  hour: number; // 0-23, when it finished
}

export function workoutCheer(m: WorkoutMoment, rand = Math.random): string {
  const fitting: string[][] = [m.failed > 0 ? FAILED_WORKOUT : PERFECT];
  if (m.minutes < 30) fitting.push(QUICK);
  if (m.minutes >= 90) fitting.push(LONG);
  if (m.hour < 7) fitting.push(EARLY);
  if (m.hour >= 21) fitting.push(LATE);
  return choose(fitting, GENERAL_WORKOUT, rand);
}

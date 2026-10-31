import type { ExerciseKind } from './types';

// Witty lines for the celebrations, picked to fit what just happened

const FIRST = [
  'First one down. The hardest part was showing up, and you nailed that too.',
  'Exercise one: done. The excuses have officially left the building.',
  'One down! Your muscles just realised this is really happening.',
  'First exercise done. The warm-up is over, the legend begins.',
  'One in the bag. Your playlist is proud of you.',
  'First one: crushed. Momentum is now legally on your side.',
];

const HALFWAY = [
  "Halfway there. It's all downhill from here (the fun kind).",
  '50% done. The other 50% is already nervous.',
  "Halfway! If this were a pizza, you'd still have the best half left.",
  'Halfway point. Somewhere a protein shake is getting excited.',
  'Half done. Too late to turn back now, the gym has your scent.',
  "50%! You're officially past the point of no return.",
];

const ONE_LEFT = [
  'One more. Your couch can wait.',
  'Last one up next. Finish strong, brag later.',
  'Final exercise ahead. Leave nothing in the tank (except maybe water).',
  'Just one left. You can see the finish line from here.',
  'Last exercise coming. Make it the one they write songs about.',
  'One to go. The shower is already warming up for you.',
];

const FAILED = [
  "Missed a few reps? That's not failing, that's finding your limit.",
  'Failure is just your muscles asking for a rematch.',
  "Those reps fought back. Next time they won't.",
  "Missed reps are just a sneak peek of next week's PR.",
  "The weight won this round. It won't get cocky for long.",
  'Not every rep counts. Every rep you tried does.',
];

// by primary muscle; the first group an exercise's muscles match wins
const MUSCLES: [string[], string[]][] = [
  [
    ['quadriceps', 'hamstrings', 'glutes', 'calves', 'adductors', 'abductors'],
    [
      'Leg day survived. Stairs now fear you.',
      'Legs done. Walking normally is optional for the next 48 hours.',
      'Never skip leg day? Clearly you never do.',
      'Legs done. Sitting down is now an extreme sport.',
    ],
  ],
  [
    ['chest'],
    [
      'Chest done. Your t-shirts are getting nervous.',
      'Pecs pumped. Doorways may need widening.',
      'Chest day: complete. Hugs are now a safety hazard.',
    ],
  ],
  [
    ['lats', 'middle back', 'lower back', 'traps'],
    [
      "Back done. You're building the wings, flying comes later.",
      'Back day in the bag. Posture: legendary.',
      'Back done. Your spine just sent a thank-you card.',
    ],
  ],
  [
    ['biceps', 'triceps', 'forearms'],
    [
      'Arms done. Your sleeves have been notified.',
      'Guns loaded. Please flex responsibly.',
      'Arms done. Opening jars is now a flex.',
    ],
  ],
  [
    ['shoulders'],
    [
      'Boulder shoulders loading… 73%.',
      'Shoulders done. Shrugging now comes with extra drama.',
      'Shoulders done. Carrying all your groceries in one trip: unlocked.',
    ],
  ],
  [
    ['abdominals'],
    [
      "Abs done. They're still hiding, but now they're scared.",
      'Core work complete. Sneezing will hurt tomorrow. Worth it.',
      'Abs done. Laughing will hurt tomorrow, so avoid funny people.',
    ],
  ],
];

const CARDIO = [
  'Cardio done. Your heart says thanks (and also: why?).',
  "Cardio complete. You outran absolutely no one, and that's fine.",
  'Cardio done. Your lungs would like a word.',
  'Heart rate: up. Excuses: down.',
  'Cardio crushed. Sweat level: nature documentary.',
];

const GENERAL = [
  'WOW, one step closer to the finish!',
  'Gravity 0, you 1.',
  'Somewhere, a dumbbell is crying.',
  'That weight had it coming.',
  'Another one down 💪',
  'Sweat is just your fat crying. Keep it sobbing.',
  "Plot twist: you're stronger than you were 10 minutes ago.",
  "That exercise didn't stand a chance.",
  'Gains loading… please do not turn off your body.',
  'Your muscles just filed a complaint. Request denied.',
];

const PERFECT = ['Not a single rep missed. Flawless victory.', 'Every rep, every set. Show-off.'];

const FAILED_WORKOUT = [
  "You pushed until your muscles said no. That's exactly where growth happens.",
  "A few reps got away. They'll be back, and so will you.",
  '100% completion rate. Even your spreadsheet is impressed.',
  "Zero misses. Are you sure you're human?",
  'Perfect workout. Frame this one.',
  'You showed up and gave it everything. The missed reps are just homework.',
  'Done, with a few battle scars. Those count double.',
  'Not perfect, but finished. Finished beats perfect every time.',
];

const QUICK = [
  'In and out like a gym ninja.',
  'Short, sharp, done. Efficiency is a love language.',
  'Speedrun complete. New world record (probably).',
  'Fast and furious. Mostly furious.',
];

const LONG = [
  "That wasn't a workout, that was a saga. Respect.",
  'You basically live here now. Pay your rent in protein.',
  'Long one. The gym is thinking about naming a bench after you.',
  'That was basically a part-time job. Clock out, champ.',
];

const EARLY = [
  'Done before sunrise. Who even are you?',
  "Most people are still asleep. You're already a legend.",
  'Morning workout done. The rest of the day is a bonus level.',
  'Up before the coffee kicked in. Impressive.',
];

const LATE = [
  'Night owl gains. The weights never sleep, and apparently neither do you.',
  'Late-night lift done. Tonight you dream in PRs.',
  "Late shift done. The weights were hoping you'd call.",
  'Burning the midnight oil, and some calories too.',
];

const GENERAL_WORKOUT = [
  'Workout done. Go eat something heroic.',
  'Your future self just high-fived you.',
  'Every exercise done. Be proud of that one.',
  'Workout complete. You may now flex in every reflective surface.',
  "That's a wrap. Hydrate like it's your job.",
  'Mission accomplished. Your couch has been informed of your return.',
  'Done and dusted. Tomorrow-you is going to feel this (in a good way).',
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

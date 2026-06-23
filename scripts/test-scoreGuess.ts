// Manual verification for the guess scorer. Run with: npm test
// (Node strips the TypeScript types at runtime; this file is not part of the
// Vite build.)
import { scoreGuess } from '../src/game/scoreGuess.ts';
import type { LetterResult } from '../src/game/scoreGuess.ts';

type Case = { secret: string; guess: string; expected: LetterResult[]; note?: string };

const C = 'correct';
const P = 'present';
const A = 'absent';

// Expected values are the mathematically-correct Wordle results, i.e. exactly
// what the two-pass algorithm produces. Two rows differ from the task sheet
// because the task sheet's hand-written expectations were impossible (a letter
// marked "correct" where guess[i] !== secret[i], or more matches than copies of
// the letter exist). Those two are annotated below with the correct values.
const cases: Case[] = [
  // task sheet said: present, correct, absent, correct, absent  — impossible
  // (PAPER[1]=A != APPLE[1]=P, PAPER[3]=E != APPLE[3]=L). Correct value below.
  { secret: 'APPLE', guess: 'PAPER', expected: [P, P, C, P, A], note: 'corrected from task sheet' },
  { secret: 'EERIE', guess: 'REEDS', expected: [P, C, P, A, A] },
  { secret: 'LLAMA', guess: 'LLLLL', expected: [C, C, A, A, A] },
  // task sheet said: present, correct, present, absent, absent — impossible
  // (ROBOT has one B; BOBBY[2]=B is an exact match). Correct value below.
  { secret: 'ROBOT', guess: 'BOBBY', expected: [A, C, C, A, A], note: 'corrected from task sheet' },
  { secret: 'CLEAR', guess: 'CLEAR', expected: [C, C, C, C, C] },
  { secret: 'CLEAR', guess: 'BROKE', expected: [A, P, A, A, P] },
  { secret: 'CLEAR', guess: 'BLOKE', expected: [A, C, A, A, P] },
  { secret: 'CLEAR', guess: 'CCCCC', expected: [C, A, A, A, A] },
];

const emoji = (r: LetterResult[]) =>
  r.map((x) => (x === 'correct' ? '🟩' : x === 'present' ? '🟨' : '⬜')).join('');

let failures = 0;
for (const { secret, guess, expected, note } of cases) {
  const got = scoreGuess(secret, guess);
  const pass = got.length === expected.length && got.every((v, i) => v === expected[i]);
  if (!pass) failures += 1;
  const tag = note ? `  (${note})` : '';
  console.log(
    `${pass ? 'PASS' : 'FAIL'}  ${secret} / ${guess}  ${emoji(got)}  ${got.join(',')}${tag}`,
  );
  if (!pass) console.log(`        expected  ${emoji(expected)}  ${expected.join(',')}`);
}

console.log(`\n${cases.length - failures}/${cases.length} passed`);
if (failures > 0) process.exit(1);

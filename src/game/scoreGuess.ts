// Wordle-style guess scoring with correct duplicate-letter handling.
// Two passes: first lock in exact-position matches ("correct"), then spend the
// remaining letter counts on out-of-position matches ("present"); anything left
// is "absent". Kept isolated and pure so it is easy to test on its own.

export type LetterResult = 'correct' | 'present' | 'absent';

export function scoreGuess(secretWord: string, guessWord: string): LetterResult[] {
  const secret = secretWord.toUpperCase();
  const guess = guessWord.toUpperCase();

  const results: LetterResult[] = ['absent', 'absent', 'absent', 'absent', 'absent'];
  const remaining: Record<string, number> = {};

  for (const letter of secret) {
    remaining[letter] = (remaining[letter] ?? 0) + 1;
  }

  // Pass 1: correct (right letter, right spot).
  for (let i = 0; i < 5; i++) {
    if (guess[i] === secret[i]) {
      results[i] = 'correct';
      remaining[guess[i]] -= 1;
    }
  }

  // Pass 2: present (in the word elsewhere) or absent (used up / not in word).
  for (let i = 0; i < 5; i++) {
    if (results[i] === 'correct') continue;

    const letter = guess[i];
    if ((remaining[letter] ?? 0) > 0) {
      results[i] = 'present';
      remaining[letter] -= 1;
    } else {
      results[i] = 'absent';
    }
  }

  return results;
}

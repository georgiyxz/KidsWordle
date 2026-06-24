// Session-only high score. In-memory for the life of the page (survives scene
// restarts and new runs); a page refresh resets it. No localStorage, no cookies.
let highScore = 0;

export function getHighScore(): number {
  return highScore;
}

// Records a score and returns the current best (raises the best if beaten).
export function reportScore(score: number): number {
  if (score > highScore) highScore = score;
  return highScore;
}

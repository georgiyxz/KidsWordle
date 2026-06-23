import Phaser from 'phaser';

// Input surface for a word game: letters, Enter (plant the word) and Backspace
// (delete a letter). Wraps the physical keyboard so the scene never touches raw
// key codes. The on-screen keyboard calls the same handlers directly, so touch
// and physical typing share one code path.
export type WordInputHandlers = {
  onLetter: (ch: string) => void;
  onEnter: () => void;
  onDelete: () => void;
};

export function bindWordInput(scene: Phaser.Scene, handlers: WordInputHandlers): void {
  const kb = scene.input.keyboard;
  if (!kb) return;
  // Stop the browser navigating back on Backspace / scrolling on Space.
  kb.addCapture('BACKSPACE,ENTER,SPACE');
  kb.on('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Enter') handlers.onEnter();
    else if (e.key === 'Backspace') handlers.onDelete();
    else if (/^[a-zA-Z]$/.test(e.key)) handlers.onLetter(e.key.toUpperCase());
  });
}

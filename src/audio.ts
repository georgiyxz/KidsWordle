import Phaser from 'phaser';

// Tiny shared sound helper. The Phaser sound manager is global (one instance per
// game), so these module-level refs are safe to reuse across scene restarts.
// Every play is guarded by a cache check so a missing file never throws.
export const Sfx = {
  text: 'sfxText',
  popup: 'sfxPopup',
  charge: 'sfxCharge',
  music: 'musicLofi',
  castHook: 'sfxCastHook',
  buttonShow: 'sfxButtonShow',
  tada: 'sfxTada',
  letterHit: 'sfxLetterHit',
  voice1: 'voice1',
  voice2: 'voice2',
  voice3: 'voice3',
  birds: 'birdschirping',
  characterSelected: 'sfxCharacterSelected',
  flowerDead: 'sfxFlowerDead',
} as const;

let chargeSound: Phaser.Sound.BaseSound | null = null;
let flowerDeadSound: Phaser.Sound.BaseSound | null = null;
let music: Phaser.Sound.BaseSound | null = null;
let birds: Phaser.Sound.BaseSound | null = null;
let voice: Phaser.Sound.BaseSound | null = null;
let lastPopupAt = -1000;
let lastButtonShowAt = -1000;
let lastTadaAt = -10000;
let lastVoiceAt = -1000;
let lastButtonPressAt = -1000;

// Short tick when a letter is typed (physical or on-screen keyboard).
export function playText(scene: Phaser.Scene): void {
  if (!scene.cache.audio.exists(Sfx.text)) return;
  scene.sound.play(Sfx.text, { volume: 0.6 });
}

// Pop when a popup screen opens. De-bounced so the same popup can't double-fire.
export function playPopup(scene: Phaser.Scene): void {
  if (!scene.cache.audio.exists(Sfx.popup)) return;
  if (scene.time.now - lastPopupAt < 250) return;
  lastPopupAt = scene.time.now;
  scene.sound.play(Sfx.popup, { volume: 0.55 });
}

// Whirr while a reward flower grows. Restart cancels any overlap.
export function playCharge(scene: Phaser.Scene): void {
  if (!scene.cache.audio.exists(Sfx.charge)) return;
  stopCharge();
  chargeSound = scene.sound.add(Sfx.charge, { volume: 0.65 });
  chargeSound.play();
}

export function stopCharge(): void {
  if (!chargeSound) return;
  chargeSound.stop();
  chargeSound.destroy();
  chargeSound = null;
}

// Sad sting while the flowers wilt/turn grey. Stopped explicitly when the death
// animation ends so it never bleeds into the lose screen. Never stacks.
export function playFlowerDead(scene: Phaser.Scene): void {
  if (!scene.cache.audio.exists(Sfx.flowerDead)) return;
  stopFlowerDead();
  flowerDeadSound = scene.sound.add(Sfx.flowerDead, { volume: 0.5 });
  flowerDeadSound.play();
}

export function stopFlowerDead(): void {
  if (!flowerDeadSound) return;
  flowerDeadSound.stop();
  flowerDeadSound.destroy();
  flowerDeadSound = null;
}

// Looped lofi bed for the Main Menu. Never stacks: a second call while it is
// already playing is a no-op. Waits for the audio unlock if needed.
export function startMenuMusic(scene: Phaser.Scene): void {
  if (!scene.cache.audio.exists(Sfx.music)) return;
  if (!music) music = scene.sound.add(Sfx.music, { loop: true, volume: 0.3 });
  if (music.isPlaying) return;
  const begin = () => { if (music && !music.isPlaying) music.play(); };
  if (scene.sound.locked) scene.sound.once(Phaser.Sound.Events.UNLOCKED, begin);
  else begin();
}

export function stopMenuMusic(): void {
  if (music && music.isPlaying) music.stop();
}

export function startBirdAmbience(scene: Phaser.Scene): void {
  if (!scene.cache.audio.exists(Sfx.birds)) return;
  if (!birds) birds = scene.sound.add(Sfx.birds, { loop: true, volume: 0.13 });
  if (birds.isPlaying) return;
  const begin = () => { if (birds && !birds.isPlaying) birds.play(); };
  if (scene.sound.locked) scene.sound.once(Phaser.Sound.Events.UNLOCKED, begin);
  else begin();
}

export function stopBirdAmbience(): void {
  if (birds && birds.isPlaying) birds.stop();
}

export function playDinoVoice(scene: Phaser.Scene): void {
  const voices = [Sfx.voice1, Sfx.voice2, Sfx.voice3];
  if (scene.time.now - lastVoiceAt < 140) return;
  const key = Phaser.Math.RND.pick(voices);
  if (!scene.cache.audio.exists(key)) return;
  lastVoiceAt = scene.time.now;
  const begin = () => {
    if (voice) {
      voice.stop();
      voice.destroy();
    }
    voice = scene.sound.add(key, { volume: 0.32 });
    voice.once(Phaser.Sound.Events.COMPLETE, () => {
      voice?.destroy();
      voice = null;
    });
    voice.play();
  };
  if (scene.sound.locked) scene.sound.once(Phaser.Sound.Events.UNLOCKED, begin);
  else begin();
}

export function playButtonPress(scene: Phaser.Scene): void {
  if (!scene.cache.audio.exists(Sfx.characterSelected)) return;
  if (scene.time.now - lastButtonPressAt < 80) return;
  lastButtonPressAt = scene.time.now;
  scene.sound.play(Sfx.characterSelected, { volume: 0.5 });
}

// Soft tick as each tries-left ball pops in (one call per ball).
export function playCastHook(scene: Phaser.Scene): void {
  if (!scene.cache.audio.exists(Sfx.castHook)) return;
  scene.sound.play(Sfx.castHook, { volume: 0.4 });
}

// Pop when buttons / UI elements appear. Debounced so a group popping together
// makes one tasteful sound instead of a burst.
export function playButtonShow(scene: Phaser.Scene): void {
  if (!scene.cache.audio.exists(Sfx.buttonShow)) return;
  if (scene.time.now - lastButtonShowAt < 80) return;
  lastButtonShowAt = scene.time.now;
  scene.sound.play(Sfx.buttonShow, { volume: 0.4 });
}

// Win fanfare when the next-word / win screen appears. Guarded against overlap.
export function playTada(scene: Phaser.Scene): void {
  if (!scene.cache.audio.exists(Sfx.tada)) return;
  if (scene.time.now - lastTadaAt < 1200) return;
  lastTadaAt = scene.time.now;
  scene.sound.play(Sfx.tada, { volume: 0.35 });
}

// One tick per tile as a scored guess reveals, left-to-right.
export function playLetterHit(scene: Phaser.Scene): void {
  if (!scene.cache.audio.exists(Sfx.letterHit)) return;
  scene.sound.play(Sfx.letterHit, { volume: 0.48 }); // a little louder (~20% up)
}

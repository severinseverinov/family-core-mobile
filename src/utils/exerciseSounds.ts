/**
 * Egzersiz ekranı sesleri: başlangıç/bitiş uzun düdük, egzersiz geçişleri kısa düdük, dinlenme süresi tik (bir kez çal → bitince tekrar).
 * Yerel assets (assets/sounds/*.wav, tick.mp3) kullanılıyor; izin/onay sonrası çalınır.
 * expo-audio kullanır (expo-av yerine).
 */

import { createAudioPlayer, setAudioModeAsync } from "expo-audio";

const LONG_WHISTLE = require("../../assets/sounds/long_whistle.mp3");
const SHORT_WHISTLE = require("../../assets/sounds/short_whistle.mp3");
const TICK = require("../../assets/sounds/tick.mp3");

let audioModeSet = false;
let soundsEnabled = false;

export function setSoundsEnabled(enabled: boolean): void {
  soundsEnabled = enabled;
}

export function getSoundsEnabled(): boolean {
  return soundsEnabled;
}

/** Audio mode ayarla + sesleri etkinleştir. Egzersiz başlamadan önce onay (Evet) sonrası çağrılmalı. */
export async function initAudioAndRequestPermission(): Promise<boolean> {
  try {
    await setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode: "duckOthers",
    });
    audioModeSet = true;
    soundsEnabled = true;
    return true;
  } catch (e) {
    if (typeof __DEV__ !== "undefined" && __DEV__)
      console.warn("[exerciseSounds] init failed", e);
    return false;
  }
}

async function ensureAudioMode(): Promise<void> {
  if (audioModeSet) return;
  try {
    await setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode: "duckOthers",
    });
    audioModeSet = true;
  } catch (e) {
    if (typeof __DEV__ !== "undefined" && __DEV__)
      console.warn("[exerciseSounds] ensureAudioMode failed", e);
  }
}

async function playLocal(source: number, unloadAfterMs: number): Promise<void> {
  if (!soundsEnabled) {
    if (typeof __DEV__ !== "undefined" && __DEV__)
      console.log("[exerciseSounds] skip play: soundsEnabled=false");
    return;
  }
  try {
    await ensureAudioMode();
    const player = createAudioPlayer(source);
    let removed = false;
    const doRemove = () => {
      if (removed) return;
      removed = true;
      try {
        player.remove();
      } catch (_) {}
    };
    player.addListener(
      "playbackStatusUpdate",
      (status: { didJustFinish?: boolean }) => {
        if (status?.didJustFinish) doRemove();
      },
    );
    player.play();
    setTimeout(() => doRemove(), unloadAfterMs);
  } catch (e) {
    if (typeof __DEV__ !== "undefined" && __DEV__)
      console.warn("[exerciseSounds] playLocal failed", e);
  }
}

/** Başlangıç / günlük egzersiz bitişi: uzun (çok uzun olmayan) düdük */
export async function playStartWhistle(): Promise<void> {
  await playLocal(LONG_WHISTLE, 2500);
}

/** Egzersiz bitti / sonraki egzersiz başlıyor: kısa düdük */
export async function playShortWhistle(): Promise<void> {
  await playLocal(SHORT_WHISTLE, 800);
}

/** Tik sesi bir kez çal, **sadece** didJustFinish ile bittiğinde döner. Erken resolve = üst üste çalma. */
export async function playTickOnce(): Promise<void> {
  if (!soundsEnabled) return;
  try {
    await ensureAudioMode();
    await new Promise<void>(resolve => {
      const player = createAudioPlayer(TICK);
      let resolved = false;
      const finish = () => {
        if (resolved) return;
        resolved = true;
        try {
          player.remove();
        } catch (_) {}
        resolve();
      };
      player.addListener(
        "playbackStatusUpdate",
        (status: { didJustFinish?: boolean }) => {
          if (status?.didJustFinish) finish();
        },
      );
      player.play();
      // Yalnızca didJustFinish hiç gelmezse kullan; ses bitmeden resolve etme
      setTimeout(finish, 3000);
    });
  } catch (_) {}
}

let tickLoopCancelled = true;
let tickLoopRunning = false;

async function runTickLoop(): Promise<void> {
  if (tickLoopCancelled) return;
  await playTickOnce();
  if (tickLoopCancelled) return;
  await runTickLoop();
}

/** Okuma süresinde tik döngüsünü başlat (bir kez çal → bitince tekrar). Tek loop, çok seslilik yok. */
export function startTickLoop(): void {
  if (tickLoopRunning) return;
  tickLoopCancelled = false;
  tickLoopRunning = true;
  runTickLoop()
    .catch(() => {})
    .finally(() => {
      tickLoopRunning = false;
    });
}

/** Tik döngüsünü durdur. */
export function stopTickLoop(): void {
  tickLoopCancelled = true;
}

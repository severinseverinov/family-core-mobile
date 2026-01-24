/**
 * Egzersiz ekranı sesleri: başlangıç/bitiş uzun düdük, egzersiz geçişleri kısa düdük, dinlenme süresi her saniye tik.
 * Yerel assets (assets/sounds/*.wav) kullanılıyor; izin/onay sonrası çalınır.
 */

import { Audio } from "expo-av";

// Yerel WAV dosyaları (static require — Metro bundler için gerekli)
const LONG_WHISTLE = require("../../assets/sounds/long_whistle.wav");
const SHORT_WHISTLE = require("../../assets/sounds/short_whistle.wav");
const TICK = require("../../assets/sounds/tick.wav");

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
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
      allowsRecordingIOS: false,
      interruptionModeIOS: 1,
      interruptionModeAndroid: 1,
    });
    audioModeSet = true;
    soundsEnabled = true;
    if (typeof __DEV__ !== "undefined" && __DEV__) console.log("[exerciseSounds] init OK, soundsEnabled=true");
    return true;
  } catch (e) {
    if (typeof __DEV__ !== "undefined" && __DEV__) console.warn("[exerciseSounds] init failed", e);
    return false;
  }
}

async function ensureAudioMode(): Promise<void> {
  if (audioModeSet) return;
  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
      allowsRecordingIOS: false,
      interruptionModeIOS: 1,
      interruptionModeAndroid: 1,
    });
    audioModeSet = true;
  } catch (e) {
    if (typeof __DEV__ !== "undefined" && __DEV__) console.warn("[exerciseSounds] ensureAudioMode failed", e);
  }
}

let lastTickAt = 0;
const TICK_DEBOUNCE_MS = 200;

async function playLocal(
  source: number,
  unloadAfterMs: number,
): Promise<void> {
  if (!soundsEnabled) {
    if (typeof __DEV__ !== "undefined" && __DEV__) console.log("[exerciseSounds] skip play: soundsEnabled=false");
    return;
  }
  try {
    await ensureAudioMode();
    const { sound } = await Audio.Sound.createAsync(
      source,
      {
        shouldPlay: true,
        volume: 1.0,
        isMuted: false,
      },
    );
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status?.isLoaded && (status as { didJustFinish?: boolean }).didJustFinish) {
        sound.unloadAsync().catch(() => {});
      }
    });
    setTimeout(() => {
      sound.getStatusAsync().then((s) => {
        if (s?.isLoaded) sound.unloadAsync().catch(() => {});
      });
    }, unloadAfterMs);
  } catch (e) {
    if (typeof __DEV__ !== "undefined" && __DEV__) console.warn("[exerciseSounds] playLocal failed", e);
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

/** Dinlenme süresinde her saniye tik */
export async function playTick(): Promise<void> {
  const now = Date.now();
  if (now - lastTickAt < TICK_DEBOUNCE_MS) return;
  lastTickAt = now;
  await playLocal(TICK, 400);
}

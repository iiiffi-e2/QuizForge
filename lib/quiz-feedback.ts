/**
 * Subtle audio + haptic feedback when a quiz answer is chosen.
 * Respects prefers-reduced-motion (skips both).
 */

function prefersReducedSensoryFeedback(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!audioContext) {
      audioContext = new AudioContext();
    }
    if (audioContext.state === "suspended") {
      void audioContext.resume();
    }
    return audioContext;
  } catch {
    return null;
  }
}

function playAnswerSelectSound(): void {
  if (prefersReducedSensoryFeedback()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "sine";
  osc.frequency.setValueAtTime(720, now);

  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.028, now + 0.001);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.042);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.048);
}

function triggerAnswerSelectHaptic(): void {
  if (prefersReducedSensoryFeedback()) return;
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") {
    return;
  }
  if (!window.matchMedia("(hover: none) and (pointer: coarse)").matches) {
    return;
  }
  try {
    navigator.vibrate(12);
  } catch {
    // ignore
  }
}

/** Call when the user selects a quiz answer (tap or keyboard). */
export function answerSelectFeedback(): void {
  playAnswerSelectSound();
  triggerAnswerSelectHaptic();
}

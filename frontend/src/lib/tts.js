/**
 * tts.js — Text-to-Speech utility for PULSE text chat responses
 * Uses the browser's built-in Web Speech API (SpeechSynthesis) — no API calls needed.
 * AI replies in text chat are automatically spoken aloud.
 */

// Pick the best available English voice
const getVoice = () => {
  const voices = window.speechSynthesis?.getVoices() || [];
  return (
    voices.find((v) => v.name === 'Samantha')                          || // macOS natural
    voices.find((v) => v.name.includes('Google US English'))           || // Chrome
    voices.find((v) => v.name.includes('Microsoft Aria'))              || // Windows
    voices.find((v) => v.name.includes('Microsoft Jenny'))             || // Windows
    voices.find((v) => v.lang === 'en-US' && v.localService)           || // any local en-US
    voices.find((v) => v.lang.startsWith('en'))                        || // any English
    null
  );
};

/**
 * Speak a text string aloud.
 * Cancels any currently playing speech first.
 * @param {string} text
 * @param {object} opts
 * @param {function} opts.onEnd  — called when speech finishes
 */
export const speak = (text, { onEnd } = {}) => {
  if (!window.speechSynthesis || !text) return;

  // Cancel any in-progress speech immediately
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang   = 'en-US';
  utterance.rate   = 0.95;   // slightly slower than default — clearer
  utterance.pitch  = 1.0;
  utterance.volume = 1.0;

  // Voices may not be loaded on first call — retry once after load
  const voice = getVoice();
  if (voice) {
    utterance.voice = voice;
  } else {
    // Voices not loaded yet — wait and retry
    window.speechSynthesis.onvoiceschanged = () => {
      const v = getVoice();
      if (v) utterance.voice = v;
      window.speechSynthesis.speak(utterance);
      window.speechSynthesis.onvoiceschanged = null;
    };
    return;
  }

  if (onEnd) utterance.onend = onEnd;
  window.speechSynthesis.speak(utterance);
};

/** Stop any currently playing speech */
export const stopSpeaking = () => {
  window.speechSynthesis?.cancel();
};

/** Returns true if TTS is currently playing */
export const isSpeaking = () => window.speechSynthesis?.speaking ?? false;

import { GoogleGenAI, Modality } from '@google/genai';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// Text generation uses default v1beta endpoint
export const ai = new GoogleGenAI({ apiKey: API_KEY });

// Live API (bidiGenerateContent WebSocket) REQUIRES v1alpha
// v1beta returns: "model not found for API version v1beta, or not supported for bidiGenerateContent"
const liveAi = new GoogleGenAI({ apiKey: API_KEY, apiVersion: 'v1alpha' });

// ── PULSE Prompt ──────────────────────────────────────────────────────────────
const PHASE_LABELS = {
  CHECKIN:             'Module 1: Check-In',
  WORK_WORKLOAD:       'Module 2: Work & Workload',
  TEAM_CULTURE:        'Module 3: Team & Culture',
  GROWTH_ASPIRATIONS:  'Module 4: Growth & Aspirations',
  CLOSING_ACTION:      'Module 5: Closing & Action Planning',
  COMPLETED:           'Session Complete',
};

const PULSE_SYSTEM = `You are PULSE, a compassionate and professional AI wellness coach. Your role is to conduct structured, private 20-minute coaching sessions with employees.

PULSE Session Modules — guide the conversation through these sequentially:

Module 1 – CHECK-IN (3 min): Warmly greet the employee by name. Ask how they're feeling on a scale of 1–10. Ask about their energy and overall mood. Acknowledge their answer with genuine warmth.

Module 2 – WORK & WORKLOAD (5 min): Explore workload satisfaction, current challenges, stress levels, and team dynamics. Listen for overload, disengagement, or burnout signals.

Module 3 – TEAM & CULTURE (4 min): Discuss team relationships, belonging, psychological safety, trust, and culture.

Module 4 – GROWTH & ASPIRATIONS (4 min): Explore career goals, learning opportunities, personal development, and what energizes them professionally.

Module 5 – CLOSING & ACTION PLANNING (4 min): Warmly summarize key themes. Help identify 1–2 specific, achievable micro-actions for the next 2 weeks. Confirm the actions together.

Coaching Principles:
- Be warm, curious, empathetic, and non-judgmental
- Ask ONE open-ended question at a time — never multiple questions
- Validate feelings without agreeing or disagreeing with positions
- Keep ALL responses to 2–3 sentences maximum — be concise
- Everything shared is completely confidential
- Never provide direct advice, diagnoses, or prescriptions
- Use the employee's name naturally, but not excessively
- If severe distress or self-harm is mentioned, gently direct them to the Employee Assistance Program or crisis line`;

export const buildSystemPrompt = (name, phase) =>
  `${PULSE_SYSTEM}\n\nCurrent module: ${PHASE_LABELS[phase] || 'Check-In'}\nEmployee name: ${name}`;

// ── Gemini Live (voice) session ───────────────────────────────────────────────
// These models work on v1alpha endpoint (not v1beta)
export const LIVE_MODEL          = 'gemini-2.0-flash-live-001';
export const LIVE_MODEL_FALLBACK = 'gemini-2.0-flash-live-preview-04-09';

export const createLiveSession = async (name, phase, callbacks, model = LIVE_MODEL) => {
  // ✅ Use liveAi (v1alpha) — the Live WebSocket API is only available on v1alpha
  return liveAi.live.connect({
    model,
    config: {
      responseModalities: [Modality.AUDIO, Modality.TEXT],
      systemInstruction: buildSystemPrompt(name, phase),
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Aoede' } },
      },
    },
    callbacks,
  });
};

// ── Text chat fallback (uses @google/genai ai.models API) ────────────────────
export const chatWithCoach = async (message, name, phase, history = []) => {
  // Build contents array: history + new user message
  const contents = [
    ...history.map((m) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }],
    })),
    { role: 'user', parts: [{ text: message }] },
  ];

  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents,
    config: { systemInstruction: buildSystemPrompt(name, phase) },
  });
  return response.text;
};

// ── Opening greeting ──────────────────────────────────────────────────────────
export const generateOpening = async (name) => {
  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: 'Generate a warm, brief opening greeting to start this coaching session. 2 sentences only, end with a mood check-in question (1-10 scale).',
    config: { systemInstruction: buildSystemPrompt(name, 'CHECKIN') },
  });
  return response.text;
};

// ── Session summarizer ────────────────────────────────────────────────────────
export const summarizeSession = async (transcript, name) => {
  const prompt = `Analyze this PULSE coaching session transcript and return structured JSON.

Employee: ${name}

Transcript:
${transcript}

Return ONLY valid JSON:
{
  "summary": "2-3 sentence session summary focusing on key themes",
  "sentimentScore": <float 0.0-1.0>,
  "keyThemes": ["theme1", "theme2"],
  "suggestedActions": ["action1", "action2"]
}`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
    });
    const text = response.text.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(text);
  } catch {
    return { summary: 'Session completed.', sentimentScore: 0.5, keyThemes: [], suggestedActions: [] };
  }
};

// ── Insight extractor (for admin themes) ─────────────────────────────────────
export const extractInsights = async (transcript, department) => {
  const prompt = `Extract key workplace themes from this coaching session. Do NOT include any identifying details.

Department: ${department || 'Unknown'}
Transcript:
${transcript}

Return ONLY a JSON array of up to 5 objects:
[{ "theme": "short label", "sentiment": "positive"|"neutral"|"negative" }]`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
    });
    const text = response.text.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(text);
  } catch {
    return [];
  }
};

// ── Audio utilities ───────────────────────────────────────────────────────────
// Float32 PCM → Int16 base64 (for sending to Gemini Live)
export const float32ToBase64PCM = (float32Array) => {
  const int16 = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    int16[i] = Math.max(-32768, Math.min(32767, float32Array[i] * 32768));
  }
  const bytes = new Uint8Array(int16.buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
};

// Base64 PCM 24kHz → AudioBuffer (for playing Gemini response)
export const base64PCMToAudioBuffer = (base64, audioCtx, sampleRate = 24000) => {
  const binary = atob(base64);
  const bytes   = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const int16  = new Int16Array(bytes.buffer);
  const float32 = new Float32Array(int16.length);
  for (let i = 0; i < int16.length; i++) float32[i] = int16[i] / 32768.0;
  const buffer = audioCtx.createBuffer(1, float32.length, sampleRate);
  buffer.copyToChannel(float32, 0);
  return buffer;
};

export { PHASE_LABELS };

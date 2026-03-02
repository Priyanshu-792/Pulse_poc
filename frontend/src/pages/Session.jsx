import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, X, CheckCircle, Volume2, VolumeX } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  updateSession, createAction, getTranscriptUrl, uploadTranscript, insertInsights,
} from '../lib/supabase';
import { supabase } from '../lib/supabase';
import { chatWithCoach, summarizeSession, extractInsights, generateManagerReport, generatePhaseIntro } from '../lib/openai';
import { sendManagerReport } from '../lib/emailjs';
import { speak, stopSpeaking } from '../lib/tts';
import SessionProgress from '../components/SessionProgress';
import VoiceCoach from '../components/VoiceCoach';
import TranscriptViewer from '../components/TranscriptViewer';
import ActionModal from '../components/ActionModal';
import MoodPicker from '../components/MoodPicker';

const PHASES = ['CHECKIN', 'WORK_WORKLOAD', 'TEAM_CULTURE', 'GROWTH_ASPIRATIONS', 'CLOSING_ACTION'];
const PHASE_DURATIONS = { CHECKIN: 3, WORK_WORKLOAD: 5, TEAM_CULTURE: 4, GROWTH_ASPIRATIONS: 4, CLOSING_ACTION: 4 };

// Retry helper: retries up to 3x on 429 with exponential backoff
const withRetry = async (fn, maxRetries = 3, baseDelay = 2000) => {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const is429 = err?.message?.includes('429') || err?.status === 429 || err?.message?.includes('quota') || err?.message?.includes('rate');
      if (is429 && attempt < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, attempt); // 2s, 4s, 8s
        console.warn(`Rate limited (429), retrying in ${delay}ms...`);
        await new Promise((r) => setTimeout(r, delay));
      } else {
        throw err;
      }
    }
  }
};

export default function Session() {
  const { id }       = useParams();
  const navigate     = useNavigate();
  const { user, profile } = useAuth();

  const [session,        setSession]       = useState(null);
  const [phase,          setPhase]         = useState('CHECKIN');
  const [messages,       setMessages]      = useState([]);
  const [inputText,      setInputText]     = useState('');
  const [sending,        setSending]       = useState(false);
  const [moodScore,      setMoodScore]     = useState(null);
  const [moodPicked,     setMoodPicked]    = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [completing,     setCompleting]    = useState(false);
  const [elapsed,        setElapsed]       = useState(0);
  const [error,          setError]         = useState('');
  const [ttsEnabled,     setTtsEnabled]    = useState(true);
  const timerRef      = useRef(null);
  const messagesEndRef = useRef(null);
  const ttsEnabledRef = useRef(true); // ref so callbacks always get latest value
  const hasLoadedRef  = useRef(false); // ← prevents double-call in React StrictMode

  useEffect(() => {
    if (hasLoadedRef.current) return; // StrictMode guard
    hasLoadedRef.current = true;
    loadSession();
  }, [id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Keep ttsEnabledRef in sync with state
  useEffect(() => { ttsEnabledRef.current = ttsEnabled; }, [ttsEnabled]);

  // Stop TTS when session page unmounts
  useEffect(() => () => stopSpeaking(), []);

  // Session timer
  useEffect(() => {
    if (!session) return;
    timerRef.current = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [session]);

  const loadSession = async () => {
    const name = profile?.name || 'there';

    // ── DEV BYPASS ────────────────────────────────────────────────────────────
    if (id === 'dev-session-001') {
      setSession({ id: 'dev-session-001', user_id: 'dev-user-001', phase: 'CHECKIN', status: 'active' });
      setPhase('CHECKIN');
      const aiOpening = await generatePhaseIntro('CHECKIN', name, []);
      const openingText = aiOpening || `Hello ${name}! Welcome to your PULSE coaching session. I'm here to support you in a completely safe and confidential space. Before we dive in — how are you feeling today on a scale of 1 to 10?`;
      addMessage('assistant', openingText, true);
      if (ttsEnabledRef.current) speak(openingText);
      return;
    }
    // ─────────────────────────────────────────────────────────────────────────

    const { data, error } = await supabase
      .from('sessions').select('*').eq('id', id).eq('user_id', user.id).single();
    if (error || !data) { navigate('/'); return; }
    setSession(data);
    setPhase(data.phase === 'COMPLETED' ? 'CLOSING_ACTION' : data.phase);

    const aiOpening = await generatePhaseIntro('CHECKIN', name, []);
    const openingText = aiOpening || `Hello ${name}! Welcome to your PULSE coaching session. I'm here to support you in a completely safe and confidential space. Before we dive in — how are you feeling today on a scale of 1 to 10?`;
    addMessage('assistant', openingText, true);
    if (ttsEnabledRef.current) speak(openingText);
  };

  const addMessage = (role, content, isOpening = false) => {
    setMessages((prev) => [
      ...prev,
      { id: Date.now() + Math.random(), role, content, timestamp: new Date(), isOpening },
    ]);
  };

  const handleSendText = async (text) => {
    if (!text.trim() || sending) return;
    const msg = text.trim();
    setInputText('');
    stopSpeaking(); // stop any ongoing TTS when user sends a new message
    addMessage('user', msg);
    setSending(true);

    try {
      const history = messages.slice(-20).map((m) => ({
        role: m.role === 'user' ? 'user' : 'model',
        content: m.content,
      }));
      const reply = await withRetry(() =>
        chatWithCoach(msg, profile?.name || 'there', phase, history)
      );
      addMessage('assistant', reply);
      if (ttsEnabledRef.current) speak(reply); // speak the AI reply aloud

      // Auto-detect mood score from check-in
      if (phase === 'CHECKIN' && !moodPicked) {
        const match = reply.match(/(\d+)\s*(?:out of|\/)\s*10/i) || msg.match(/\b([1-9]|10)\b/);
        if (match) { setMoodScore(parseInt(match[1])); }
      }
    } catch (err) {
      const is429 = err?.message?.includes('429') || err?.message?.includes('quota');
      addMessage('assistant', is429
        ? 'I\'m receiving too many requests right now. Please wait a moment and try again.'
        : 'I had trouble connecting. Please try again in a moment.'
      );
    } finally {
      setSending(false);
    }
  };

  const handleMoodSet = (score) => {
    setMoodScore(score);
    setMoodPicked(true);
    handleSendText(`My mood today is ${score} out of 10.`);
  };

  // Voice callback: text from voice session
  const handleVoiceText = useCallback((text, isUser) => {
    addMessage(isUser ? 'user' : 'assistant', text);
  }, []);

  const advancePhase = async () => {
    const currentIdx = PHASES.indexOf(phase);
    if (currentIdx >= PHASES.length - 1) return;

    const nextPhase = PHASES[currentIdx + 1];
    setPhase(nextPhase);
    await updateSession(id, { phase: nextPhase });

    // Show a "thinking" placeholder while AI generates the intro
    const placeholderId = Date.now();
    setMessages((prev) => [
      ...prev,
      { id: placeholderId, role: 'assistant', content: '…', isThinking: true, timestamp: new Date() },
    ]);

    // AI generates a warm, humble opening for the new module
    const name = profile?.name || 'there';
    const intro = await generatePhaseIntro(nextPhase, name, messages);

    // Replace the placeholder with the real message
    const introText = intro || getFallbackIntro(nextPhase);
    setMessages((prev) =>
      prev.map((m) =>
        m.id === placeholderId
          ? { ...m, content: introText, isThinking: false }
          : m
      )
    );
    // Speak the module intro aloud
    if (ttsEnabledRef.current) speak(introText);
  };

  // Fallback if API call fails
  const getFallbackIntro = (phase) => ({
    WORK_WORKLOAD:      `Thank you for sharing that. I'd like to gently shift our focus to your work and workload now. How are you feeling about your current responsibilities and day-to-day workload?`,
    TEAM_CULTURE:       `I really appreciate your openness. Let's move into exploring your team and culture a little. How would you describe your sense of belonging within your team right now?`,
    GROWTH_ASPIRATIONS: `Thank you for that — it means a lot that you shared. Now I'd love to explore your growth and aspirations with you. What does professional fulfillment look like for you at this point in your journey?`,
    CLOSING_ACTION:     `I want to take a moment to genuinely thank you for your openness and trust today. As we move into our closing, I'd love to help you identify one or two small, meaningful steps you feel ready to take over the next two weeks. What feels most important to you right now?`,
  }[phase] || '');

  const handleCompleteSession = async () => {
    setShowActionModal(true);
  };

  const finalizeSession = async (sessionActions, notifyManager = false) => {
    setCompleting(true);
    setShowActionModal(false);

    // ── DEV BYPASS ────────────────────────────────────────────────────────────
    if (id === 'dev-session-001') {
      if (notifyManager) {
        try {
          const transcriptText = messages
            .map((m) => `${m.role === 'user' ? 'Priyanshu' : 'PULSE'}: ${m.content}`)
            .join('\n\n');
          const report = await generateManagerReport(transcriptText, 'Priyanshu', sessionActions);
          await sendManagerReport({ employeeName: 'Priyanshu', moodScore, report });
        } catch (err) {
          console.warn('[DEV] Email/report step failed (non-critical):', err.message);
        }
      }
      navigate('/');
      return;
    }
    // ─────────────────────────────────────────────────────────────────────────

    try {
      const transcriptText = messages
        .map((m) => `${m.role === 'user' ? profile?.name || 'Employee' : 'PULSE'}: ${m.content}`)
        .join('\n\n');

      // AI summary
      let summary = null, sentimentScore = null;
      try {
        const analysis = await summarizeSession(transcriptText, profile?.name || 'Employee');
        summary = analysis.summary;
        sentimentScore = analysis.sentimentScore;
      } catch { /* continue */ }

      // Manager email — only send if employee opted in
      if (notifyManager) {
        try {
          const report = await generateManagerReport(
            transcriptText,
            profile?.name || 'Employee',
            sessionActions
          );
          await sendManagerReport({
            employeeName: profile?.name || 'Employee',
            moodScore,
            report,
          });
        } catch (emailErr) {
          console.warn('[Email] Manager report failed (non-critical):', emailErr.message);
        }
      }

      // Upload transcript
      let transcriptPath = null;
      try {
        transcriptPath = await uploadTranscript(id, user.id, transcriptText);
      } catch { /* continue */ }

      // Complete session in DB
      await updateSession(id, {
        status: 'COMPLETED',
        phase: 'COMPLETED',
        completed_at: new Date().toISOString(),
        transcript: transcriptText,
        summary,
        sentiment_score: sentimentScore,
        mood_score: moodScore,
      });

      // Save actions
      for (const action of sessionActions) {
        await createAction({
          session_id: id,
          user_id: user.id,
          text: action.text,
          due_date: action.dueDate || null,
        });
      }

      // Extract insights for admin
      if (profile?.department && transcriptText) {
        try {
          const themes = await extractInsights(transcriptText, profile.department);
          if (themes.length) {
            const week = getWeekNumber(new Date());
            await insertInsights(themes.map((t) => ({
              session_id: id,
              theme: t.theme,
              sentiment: t.sentiment,
              department: profile.department,
              week,
              year: new Date().getFullYear(),
            })));
          }
        } catch { /* non-critical */ }
      }

      navigate('/');
    } catch (err) {
      setError('Failed to save session: ' + err.message);
      setCompleting(false);
    }
  };

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="w-8 h-8 rounded-full border-4 border-pulse-200 border-t-pulse-600 animate-spin" />
      </div>
    );
  }

  const currentPhaseIndex = PHASES.indexOf(phase);
  const isLastPhase       = currentPhaseIndex === PHASES.length - 1;

  return (
    <div className="max-w-5xl mx-auto animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => navigate('/')} className="flex items-center gap-2 text-slate-500 hover:text-slate-700 text-sm">
          <ArrowLeft size={16} /> Back to Dashboard
        </button>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500">{formatTime(elapsed)}</span>

          {/* TTS toggle — mute/unmute AI voice responses */}
          <button
            onClick={() => {
              const next = !ttsEnabled;
              setTtsEnabled(next);
              ttsEnabledRef.current = next;
              if (!next) stopSpeaking(); // stop immediately if muting
            }}
            title={ttsEnabled ? 'Mute AI voice' : 'Unmute AI voice'}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors
              ${ttsEnabled
                ? 'bg-pulse-50 text-pulse-700 hover:bg-pulse-100'
                : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
              }`}
          >
            {ttsEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
            {ttsEnabled ? 'AI Voice On' : 'AI Voice Off'}
          </button>

          <button onClick={() => navigate('/')} className="text-slate-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50">
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Phase Progress */}
      <SessionProgress currentPhase={phase} phases={PHASES} />

      {error && (
        <div className="my-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* Main session area */}
      <div className="mt-6 grid lg:grid-cols-3 gap-6">
        {/* Chat + Voice */}
        <div className="lg:col-span-2 space-y-4">
          {/* Voice Coach */}
          <VoiceCoach
            name={profile?.name || 'there'}
            phase={phase}
            onText={handleVoiceText}
            onError={(msg) => setError(msg)}
          />

          {/* Transcript */}
          <div className="card p-0 overflow-hidden">
            <TranscriptViewer messages={messages} userName={profile?.name} />

            {/* Mood picker for check-in */}
            {phase === 'CHECKIN' && !moodPicked && messages.length > 0 && (
              <div className="border-t border-slate-100 p-4">
                <MoodPicker onSelect={handleMoodSet} />
              </div>
            )}

            {/* Text input */}
            <div className="border-t border-slate-100 p-4">
              <form onSubmit={(e) => { e.preventDefault(); handleSendText(inputText); }}
                className="flex gap-3">
                <input
                  className="input flex-1"
                  placeholder="Type your response…"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  disabled={sending}
                />
                <button type="submit" className="btn-primary px-4" disabled={!inputText.trim() || sending}>
                  {sending ? '…' : 'Send'}
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Module info */}
          <div className="card">
            <h3 className="text-sm font-semibold text-slate-700 mb-2">Current Module</h3>
            <p className="text-pulse-600 font-medium">{phaseLabel(phase)}</p>
            <p className="text-xs text-slate-500 mt-1">{phaseDescription(phase)}</p>

            <div className="mt-4 flex flex-col gap-2">
              {!isLastPhase && currentPhaseIndex < PHASES.length - 1 && (
                <button onClick={advancePhase} className="btn-secondary w-full text-sm">
                  Move to {phaseLabel(PHASES[currentPhaseIndex + 1])}
                </button>
              )}
              <button
                onClick={handleCompleteSession}
                disabled={completing}
                className="btn-primary w-full text-sm flex items-center justify-center gap-2"
              >
                <CheckCircle size={16} />
                {completing ? 'Completing…' : 'Complete Session'}
              </button>
            </div>
          </div>

          {/* Mood display */}
          {moodScore && (
            <div className="card">
              <h3 className="text-sm font-semibold text-slate-700 mb-2">Today's Mood</h3>
              <div className="flex items-center gap-3">
                <div className={`text-3xl font-bold ${moodColor(moodScore)}`}>{moodScore}</div>
                <div className="text-xs text-slate-500">out of 10<br />{moodLabel(moodScore)}</div>
              </div>
            </div>
          )}

          {/* Session privacy note */}
          <div className="bg-pulse-50 rounded-xl p-4 text-xs text-pulse-800 space-y-1">
            <p className="font-medium">🔒 Fully Private</p>
            <p>Your session is confidential. Only anonymized, aggregated insights are shared with leadership.</p>
          </div>
        </div>
      </div>

      {/* Action Modal */}
      {showActionModal && (
        <ActionModal
          onConfirm={finalizeSession}
          onCancel={() => setShowActionModal(false)}
          messages={messages}
        />
      )}
    </div>
  );
}

function phaseLabel(phase) {
  const labels = {
    CHECKIN:             'Check-In',
    WORK_WORKLOAD:       'Work & Workload',
    TEAM_CULTURE:        'Team & Culture',
    GROWTH_ASPIRATIONS:  'Growth & Aspirations',
    CLOSING_ACTION:      'Closing & Actions',
  };
  return labels[phase] || phase;
}

function phaseDescription(phase) {
  const desc = {
    CHECKIN:             'How are you feeling today? Energy, mood, overall state.',
    WORK_WORKLOAD:       'Workload, challenges, stress, team dynamics.',
    TEAM_CULTURE:        'Relationships, belonging, psychological safety.',
    GROWTH_ASPIRATIONS:  'Career goals, learning, what energizes you.',
    CLOSING_ACTION:      'Summary + 1-2 micro-actions for the next 2 weeks.',
  };
  return desc[phase] || '';
}

function moodColor(score) {
  if (score >= 8) return 'text-green-600';
  if (score >= 5) return 'text-amber-500';
  return 'text-red-500';
}

function moodLabel(score) {
  if (score >= 8) return 'Feeling great';
  if (score >= 6) return 'Feeling okay';
  if (score >= 4) return 'Could be better';
  return 'Struggling today';
}

function formatTime(secs) {
  const m = Math.floor(secs / 60).toString().padStart(2, '0');
  const s = (secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

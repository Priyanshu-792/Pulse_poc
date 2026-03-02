/**
 * VoiceCoach – OpenAI Realtime API voice component
 *
 * Uses WebRTC + server-side VAD. Once connected:
 *  - Mic is always active (OpenAI detects when you speak automatically)
 *  - AI responds with real voice audio, plays through browser natively
 *  - No manual push-to-talk needed — just talk naturally
 *  - Mic button = mute/unmute toggle
 */
import { useState, useCallback } from 'react';
import { Mic, MicOff, Volume2, Phone, PhoneOff, AlertCircle } from 'lucide-react';
import { useVoice } from '../hooks/useVoice';
import clsx from 'clsx';

export default function VoiceCoach({ name, phase, onText, onError }) {
  const [localError, setLocalError] = useState('');
  const [isMuted,    setIsMuted]    = useState(false);

  const handleText = useCallback((text, isUser = false) => {
    onText?.(text, isUser);
  }, [onText]);

  const handleError = useCallback((msg) => {
    setLocalError(msg);
    onError?.(msg);
  }, [onError]);

  const { mode, isConnected, isListening, isSpeaking, connect, stopMic, startMic, disconnect } = useVoice({
    name,
    phase,
    onText: handleText,
    onError: handleError,
  });

  const handleConnectClick = async () => {
    if (isConnected) {
      disconnect();
      setIsMuted(false);
    } else {
      setLocalError('');
      await connect();
    }
  };

  const handleMuteClick = () => {
    if (isMuted) {
      startMic();   // unmute
      setIsMuted(false);
    } else {
      stopMic();    // mute
      setIsMuted(true);
    }
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-slate-700">Voice Coach</h3>
          <StatusBadge mode={mode} isConnected={isConnected} isListening={isListening} isSpeaking={isSpeaking} isMuted={isMuted} />
        </div>
        <button
          onClick={handleConnectClick}
          className={clsx(
            'flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors',
            isConnected
              ? 'bg-red-50 text-red-600 hover:bg-red-100'
              : 'bg-pulse-50 text-pulse-600 hover:bg-pulse-100'
          )}
        >
          {isConnected
            ? <><PhoneOff size={12} /> Disconnect</>
            : <><Phone size={12} /> Connect Voice</>
          }
        </button>
      </div>

      {localError && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 text-amber-700 text-xs px-3 py-2 rounded-lg mb-4">
          <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
          <span>{localError}</span>
        </div>
      )}

      {/* Voice controls */}
      <div className="flex items-center justify-center gap-8 py-4">

        {/* Mute button */}
        <div className="flex flex-col items-center gap-2">
          <button
            onClick={handleMuteClick}
            disabled={!isConnected || mode === 'connecting'}
            title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
            className={clsx(
              'relative w-16 h-16 rounded-full flex items-center justify-center transition-all duration-200',
              !isConnected || mode === 'connecting'
                ? 'bg-slate-200 cursor-not-allowed'
                : isMuted
                  ? 'bg-slate-400 hover:bg-slate-500 shadow-md'
                  : isListening
                    ? 'bg-red-500 shadow-lg shadow-red-200 scale-110'
                    : 'bg-pulse-600 hover:bg-pulse-700 shadow-md shadow-pulse-200'
            )}
          >
            {/* Pulse ring when user is speaking (VAD active) */}
            {isListening && !isMuted && (
              <span className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-40" />
            )}
            {isMuted
              ? <MicOff size={24} className="text-white" />
              : <Mic size={24} className="text-white" />
            }
          </button>
          <span className="text-xs text-slate-500">
            {!isConnected
              ? 'Connect first'
              : isMuted
                ? 'Muted — tap to unmute'
                : isListening
                  ? 'You\'re speaking…'
                  : 'Listening for you'
            }
          </span>
        </div>

        {/* AI speaking indicator */}
        <div className="flex flex-col items-center gap-2">
          <div className={clsx(
            'w-16 h-16 rounded-full flex items-center justify-center',
            isSpeaking ? 'bg-pulse-50' : 'bg-slate-100'
          )}>
            {isSpeaking ? (
              <div className="flex items-center gap-0.5 h-8">
                {[...Array(8)].map((_, i) => (
                  <div
                    key={i}
                    className="w-1 bg-pulse-500 rounded-full waveform-bar"
                    style={{ animationDelay: `${i * 0.07}s` }}
                  />
                ))}
              </div>
            ) : (
              <Volume2 size={24} className={isConnected ? 'text-pulse-400' : 'text-slate-400'} />
            )}
          </div>
          <span className="text-xs text-slate-500">
            {isSpeaking ? 'PULSE speaking…' : 'Waiting'}
          </span>
        </div>
      </div>

      {mode === 'connecting' && (
        <p className="text-center text-xs text-pulse-600 animate-pulse mt-1">
          Connecting to PULSE AI…
        </p>
      )}

      {isConnected && (
        <p className="text-center text-xs text-slate-400 mt-2">
          Just speak naturally — PULSE will respond automatically.
        </p>
      )}

      {!isConnected && mode !== 'connecting' && (
        <p className="text-center text-xs text-slate-400 mt-2">
          Click "Connect Voice" for a real-time voice session, or use the text input below.
        </p>
      )}
    </div>
  );
}

function StatusBadge({ mode, isConnected, isListening, isSpeaking, isMuted }) {
  if (mode === 'connecting')
    return <span className="badge badge-amber animate-pulse">Connecting…</span>;
  if (!isConnected)
    return <span className="badge badge-slate">Disconnected</span>;
  if (isMuted)
    return <span className="badge bg-slate-100 text-slate-500">Muted</span>;
  if (isListening)
    return <span className="badge bg-red-100 text-red-700">You're speaking</span>;
  if (isSpeaking)
    return <span className="badge badge-teal">PULSE speaking</span>;
  return <span className="badge badge-green">Connected</span>;
}

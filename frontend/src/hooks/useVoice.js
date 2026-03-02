/**
 * useVoice – OpenAI Realtime API via WebRTC
 *
 * Why WebRTC instead of raw PCM/WebSocket?
 *  ✅ True full-duplex — AI can hear you while it speaks
 *  ✅ Built-in echo cancellation & noise suppression
 *  ✅ Server-side VAD (turn detection) — no manual mic start/stop
 *  ✅ AI audio plays natively — no queue management needed
 *  ✅ Near-human latency
 *
 * Flow:
 *  1. connect()  → get ephemeral token (Netlify fn / direct API for local dev)
 *  2. WebRTC PeerConnection created — mic track added automatically
 *  3. SDP offer → POST to OpenAI → get SDP answer → session live
 *  4. Data channel handles all events (transcripts, turn detection, errors)
 *  5. Audio in/out handled entirely by WebRTC — zero manual processing
 */

import { useRef, useState, useCallback } from 'react';
import { getRealtimeToken, buildSystemPrompt } from '../lib/openai';

export const useVoice = ({ name, phase, onText, onError, onTurnComplete }) => {
  const [isListening, setIsListening] = useState(false); // user is speaking (VAD detected)
  const [isSpeaking,  setIsSpeaking]  = useState(false); // AI is speaking
  const [isConnected, setIsConnected] = useState(false);
  const [mode,        setMode]        = useState('idle'); // idle | connecting | voice

  const pcRef     = useRef(null); // RTCPeerConnection
  const dcRef     = useRef(null); // RTCDataChannel (oai-events)
  const audioRef  = useRef(null); // <audio> element — plays AI voice automatically
  const streamRef = useRef(null); // mic MediaStream

  // ── Send event to OpenAI via data channel ─────────────────────────────────
  const sendEvent = useCallback((event) => {
    if (dcRef.current?.readyState === 'open') {
      dcRef.current.send(JSON.stringify(event));
    }
  }, []);

  // ── Configure PULSE session after connection ───────────────────────────────
  const configureSession = useCallback(() => {
    sendEvent({
      type: 'session.update',
      session: {
        modalities: ['audio', 'text'],
        instructions: buildSystemPrompt(name, phase),
        voice: 'alloy',
        // Enforce English-only transcription — rejects/ignores other languages
        input_audio_transcription: {
          model: 'whisper-1',
          language: 'en',       // Force English transcription only
        },
        // Server-side VAD — higher threshold filters background noise
        turn_detection: {
          type: 'server_vad',
          threshold: 0.65,          // Raised from 0.5 → filters background noise better
          prefix_padding_ms: 300,
          silence_duration_ms: 700, // Wait a bit longer to confirm speech ended
        },
      },
    });
    console.log('[OpenAI Realtime] Session configured for PULSE coaching');
  }, [name, phase, sendEvent]);

  // ── Handle data channel events from OpenAI ────────────────────────────────
  const handleEvent = useCallback((event) => {
    switch (event.type) {

      // Session ready
      case 'session.created':
      case 'session.updated':
        console.log('[OpenAI Realtime] Session ready:', event.type);
        break;

      // ── User speech ──────────────────────────────────────────────────────
      case 'input_audio_buffer.speech_started':
        setIsListening(true);
        break;

      case 'input_audio_buffer.speech_stopped':
        setIsListening(false);
        break;

      // Full transcript of what the user said (after VAD silence)
      case 'conversation.item.input_audio_transcription.completed':
        if (event.transcript?.trim()) {
          onText?.(event.transcript.trim(), true); // isUser = true
        }
        break;

      // ── AI response ──────────────────────────────────────────────────────
      case 'response.audio.delta':
        // Audio is streaming — WebRTC plays it automatically via <audio> element
        setIsSpeaking(true);
        break;

      case 'response.audio.done':
        setIsSpeaking(false);
        break;

      // Full transcript of what the AI said (cleaner than streaming deltas)
      case 'response.audio_transcript.done':
        if (event.transcript?.trim()) {
          onText?.(event.transcript.trim(), false); // isUser = false
        }
        break;

      // Response complete
      case 'response.done':
        setIsSpeaking(false);
        onTurnComplete?.();
        break;

      // ── Errors ──────────────────────────────────────────────────────────
      case 'error':
        console.error('[OpenAI Realtime] Error event:', event.error);
        onError?.(`Voice error: ${event.error?.message || 'Unknown error'}`);
        break;

      default:
        // Ignore other events (response.created, rate_limits.updated, etc.)
        break;
    }
  }, [onText, onError, onTurnComplete]);

  // ── Connect to OpenAI Realtime API via WebRTC ─────────────────────────────
  const connect = useCallback(async () => {
    if (pcRef.current || mode === 'connecting') return;
    setMode('connecting');

    try {
      // 1. Get ephemeral token from Netlify function (or direct API in local dev)
      const token = await getRealtimeToken();
      if (!token) throw new Error('No session token returned');

      // 2. Create WebRTC peer connection
      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      // 3. AI audio output — WebRTC delivers it automatically to this <audio> element
      const audioEl = document.createElement('audio');
      audioEl.autoplay = true;
      audioRef.current = audioEl;
      pc.ontrack = (e) => {
        audioEl.srcObject = e.streams[0];
      };

      // 4. Mic input — browser captures mic, WebRTC streams it to OpenAI
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      // 5. Data channel for events (transcripts, session config, errors)
      const dc = pc.createDataChannel('oai-events');
      dcRef.current = dc;

      dc.addEventListener('open', () => {
        configureSession(); // Push PULSE system prompt + VAD settings
        setIsConnected(true);
        setMode('voice');
        console.log('[OpenAI Realtime] Data channel open — voice session live');
      });

      dc.addEventListener('message', (e) => {
        try {
          handleEvent(JSON.parse(e.data));
        } catch (err) {
          console.warn('[OpenAI Realtime] Failed to parse event:', err);
        }
      });

      dc.addEventListener('close', () => {
        console.log('[OpenAI Realtime] Data channel closed');
        setIsConnected(false);
        setIsListening(false);
        setIsSpeaking(false);
        setMode('idle');
        pcRef.current = null;
      });

      pc.onconnectionstatechange = () => {
        console.log('[OpenAI Realtime] Connection state:', pc.connectionState);
        // Only treat 'failed' as a real error — 'disconnected' is transient during ICE
        if (pc.connectionState === 'failed') {
          console.warn('[OpenAI Realtime] WebRTC connection failed');
          disconnect();
          onError?.('Voice connection failed. Click "Connect Voice" to reconnect.');
        }
      };

      pc.oniceconnectionstatechange = () => {
        console.log('[OpenAI Realtime] ICE state:', pc.iceConnectionState);
      };

      // 6. SDP negotiation — create offer → post to OpenAI → apply answer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const sdpRes = await fetch(
        'https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview',
        {
          method: 'POST',
          body: offer.sdp,
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/sdp',
          },
        }
      );

      if (!sdpRes.ok) {
        const errText = await sdpRes.text();
        throw new Error(`SDP exchange failed (${sdpRes.status}): ${errText}`);
      }

      const answer = { type: 'answer', sdp: await sdpRes.text() };
      await pc.setRemoteDescription(answer);

      console.log('[OpenAI Realtime] WebRTC connected — waiting for data channel...');

    } catch (err) {
      console.error('[OpenAI Realtime] Connection failed:', err.message);
      const msg = err.message.includes('OPENAI_API_KEY') || err.message.includes('token')
        ? 'Missing OpenAI API key. Add VITE_OPENAI_API_KEY to your .env file.'
        : `Could not connect to voice AI: ${err.message}. Use text input below.`;
      onError?.(msg);
      setMode('text');
      pcRef.current = null;
    }
  }, [mode, configureSession, handleEvent, onError]);

  // ── Toggle mute (mic track on/off) ────────────────────────────────────────
  // With server VAD, mic is always active — this provides a manual mute option
  const startMic = useCallback(async () => {
    if (!pcRef.current) {
      await connect();
    } else {
      // Unmute
      streamRef.current?.getTracks().forEach((t) => { t.enabled = true; });
    }
  }, [connect]);

  const stopMic = useCallback(() => {
    // Mute mic track (doesn't disconnect)
    streamRef.current?.getTracks().forEach((t) => { t.enabled = false; });
    setIsListening(false);
  }, []);

  // ── Send text into the voice session ─────────────────────────────────────
  // Injects text as a user message → triggers AI voice response
  const sendText = useCallback((text) => {
    if (!dcRef.current || dcRef.current.readyState !== 'open') return false;
    sendEvent({
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [{ type: 'input_text', text }],
      },
    });
    sendEvent({ type: 'response.create' });
    return true;
  }, [sendEvent]);

  // ── Full disconnect ───────────────────────────────────────────────────────
  const disconnect = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;

    dcRef.current?.close();
    dcRef.current = null;

    pcRef.current?.close();
    pcRef.current = null;

    if (audioRef.current) {
      audioRef.current.srcObject = null;
      audioRef.current = null;
    }

    setIsConnected(false);
    setIsListening(false);
    setIsSpeaking(false);
    setMode('idle');
  }, []);

  return {
    mode,
    isConnected,
    isListening,  // true when VAD detects user is speaking
    isSpeaking,   // true when AI audio is streaming
    connect,
    startMic,
    stopMic,
    sendText,
    disconnect,
  };
};

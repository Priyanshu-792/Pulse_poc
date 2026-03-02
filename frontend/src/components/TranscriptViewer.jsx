import { useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { Activity } from 'lucide-react';
import clsx from 'clsx';

export default function TranscriptViewer({ messages, userName }) {
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="h-80 overflow-y-auto p-4 space-y-4">
      {messages.length === 0 && (
        <div className="flex flex-col items-center justify-center h-full text-slate-400 text-sm gap-2">
          <Activity size={28} className="text-slate-300" />
          <p>Connecting to PULSE…</p>
        </div>
      )}

      {messages.map((msg) => (
        <div
          key={msg.id}
          className={clsx(
            'flex gap-3 animate-fadeIn',
            msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
          )}
        >
          {/* Avatar */}
          <div className={clsx(
            'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-semibold',
            msg.role === 'user'
              ? 'bg-indigo-100 text-indigo-700'
              : 'bg-pulse-600 text-white'
          )}>
            {msg.role === 'user'
              ? (userName?.[0] || 'U').toUpperCase()
              : 'P'
            }
          </div>

          {/* Bubble */}
          <div className={clsx(
            'max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed',
            msg.role === 'user'
              ? 'bg-indigo-500 text-white rounded-tr-sm'
              : 'bg-white border border-slate-100 text-slate-700 rounded-tl-sm shadow-sm'
          )}>
            {msg.isThinking ? (
              /* Typing indicator — shown while AI is generating the phase intro */
              <span className="flex items-center gap-1 py-1">
                <span className="w-2 h-2 rounded-full bg-pulse-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 rounded-full bg-pulse-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 rounded-full bg-pulse-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              </span>
            ) : (
              <>
                <p>{msg.content}</p>
                <p className={clsx(
                  'text-xs mt-1.5',
                  msg.role === 'user' ? 'text-indigo-200' : 'text-slate-400'
                )}>
                  {format(new Date(msg.timestamp), 'h:mm a')}
                </p>
              </>
            )}
          </div>
        </div>
      ))}
      <div ref={endRef} />
    </div>
  );
}

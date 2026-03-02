import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { listSessions, getTranscriptUrl } from '../lib/supabase';
import { format } from 'date-fns';
import { Clock, Download, ChevronDown, ChevronUp, CheckCircle2, TrendingUp } from 'lucide-react';
import MoodTrendChart from '../components/charts/MoodTrendChart';

export default function SessionHistory() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    if (!user) return;
    listSessions(user.id).then(({ data }) => {
      setSessions(data || []);
      setLoading(false);
    });
  }, [user]);

  const downloadTranscript = async (session) => {
    if (!session.transcript) { alert('No transcript available.'); return; }
    const blob = new Blob([session.transcript], { type: 'text/plain' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `pulse-session-${format(new Date(session.started_at), 'yyyy-MM-dd')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="w-8 h-8 rounded-full border-4 border-pulse-200 border-t-pulse-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Session History</h1>
        <p className="text-slate-500 mt-1">{sessions.length} completed session{sessions.length !== 1 ? 's' : ''}</p>
      </div>

      {sessions.length > 1 && (
        <div className="card">
          <h2 className="text-base font-semibold text-slate-700 mb-4 flex items-center gap-2">
            <TrendingUp size={18} className="text-pulse-600" /> Mood Trend
          </h2>
          <MoodTrendChart sessions={sessions.map((s) => ({
            started_at: s.started_at,
            mood_score: s.mood_score,
            status: s.status,
          }))} />
        </div>
      )}

      {sessions.length === 0 ? (
        <div className="card text-center py-16">
          <Clock size={40} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500">No completed sessions yet.</p>
          <p className="text-slate-400 text-sm mt-1">Start a session to see your history here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => (
            <div key={session.id} className="card p-0 overflow-hidden">
              {/* Session header */}
              <button
                className="w-full flex items-center gap-4 p-5 hover:bg-slate-50 transition-colors text-left"
                onClick={() => setExpanded(expanded === session.id ? null : session.id)}
              >
                <div className="w-10 h-10 bg-pulse-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Clock size={18} className="text-pulse-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-800">
                    {format(new Date(session.started_at), 'EEEE, MMMM d, yyyy')}
                  </p>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    <span className="text-xs text-slate-500">
                      {format(new Date(session.started_at), 'h:mm a')}
                      {session.completed_at && ` · ${sessionDuration(session.started_at, session.completed_at)}`}
                    </span>
                    {session.mood_score && (
                      <span className={`badge ${moodBadgeClass(session.mood_score)}`}>
                        Mood: {session.mood_score}/10
                      </span>
                    )}
                    {session.sentiment_score !== null && session.sentiment_score !== undefined && (
                      <span className={`badge ${sentimentBadgeClass(session.sentiment_score)}`}>
                        {sentimentLabel(session.sentiment_score)}
                      </span>
                    )}
                    {session.actions?.length > 0 && (
                      <span className="badge badge-teal">
                        {session.actions.filter((a) => a.completed).length}/{session.actions.length} actions
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={(e) => { e.stopPropagation(); downloadTranscript(session); }}
                    className="p-2 rounded-lg hover:bg-slate-200 text-slate-500"
                    title="Download transcript"
                  >
                    <Download size={15} />
                  </button>
                  {expanded === session.id ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
                </div>
              </button>

              {/* Expanded details */}
              {expanded === session.id && (
                <div className="border-t border-slate-100 p-5 space-y-4 animate-fadeIn">
                  {/* Summary */}
                  {session.summary && (
                    <div className="bg-pulse-50 rounded-xl p-4">
                      <p className="text-xs font-semibold text-pulse-700 mb-1">AI Summary</p>
                      <p className="text-sm text-slate-700">{session.summary}</p>
                    </div>
                  )}

                  {/* Actions */}
                  {session.actions?.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-slate-600 mb-2">Commitments from this session</p>
                      <ul className="space-y-2">
                        {session.actions.map((action) => (
                          <li key={action.id} className="flex items-start gap-2 text-sm text-slate-700">
                            <CheckCircle2 size={15} className={`mt-0.5 flex-shrink-0 ${action.completed ? 'text-green-500' : 'text-slate-300'}`} />
                            <span className={action.completed ? 'line-through text-slate-400' : ''}>{action.text}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Transcript preview */}
                  {session.transcript && (
                    <details>
                      <summary className="text-sm font-medium text-slate-600 cursor-pointer hover:text-slate-800">
                        View transcript
                      </summary>
                      <div className="mt-3 bg-slate-50 rounded-xl p-4 max-h-64 overflow-y-auto text-xs text-slate-600 whitespace-pre-wrap font-mono leading-relaxed">
                        {session.transcript}
                      </div>
                    </details>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function sessionDuration(start, end) {
  const mins = Math.round((new Date(end) - new Date(start)) / 60000);
  return `${mins} min`;
}

function moodBadgeClass(score) {
  if (score >= 8) return 'badge-green';
  if (score >= 5) return 'badge-amber';
  return 'badge-red';
}

function sentimentBadgeClass(score) {
  if (score >= 0.6) return 'badge-green';
  if (score >= 0.4) return 'badge-teal';
  return 'badge-red';
}

function sentimentLabel(score) {
  if (score >= 0.7) return 'Positive';
  if (score >= 0.5) return 'Neutral+';
  if (score >= 0.4) return 'Neutral';
  if (score >= 0.3) return 'Mixed';
  return 'Needs support';
}

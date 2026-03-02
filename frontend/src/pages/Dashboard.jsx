import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Clock, CheckSquare, TrendingUp, FileText, Upload, Trash2, Download, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  abandonInProgress, createSession, listActions, updateAction, deleteAction,
  getMyStats, listDocuments, uploadDocument, getDocumentUrl, deleteDocument,
} from '../lib/supabase';
import { format, isAfter } from 'date-fns';
import MoodTrendChart from '../components/charts/MoodTrendChart';

export default function Dashboard() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [stats,     setStats]     = useState(null);
  const [actions,   setActions]   = useState([]);
  const [documents, setDocuments] = useState([]);
  const [starting,  setStarting]  = useState(false);
  const [error,     setError]     = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetchAll();
  }, [user]);

  const fetchAll = async () => {
    const [statsRes, actionsRes, docsRes] = await Promise.all([
      getMyStats(user.id),
      listActions(user.id),
      listDocuments(user.id),
    ]);
    setStats(statsRes);
    setActions(actionsRes.data || []);
    setDocuments(docsRes.data || []);
  };

  const handleStartSession = async () => {
    setStarting(true);
    setError('');

    // ── DEV BYPASS ──────────────────────────────────────────────────────────
    if (user?.id === 'dev-user-001') {
      navigate('/session/dev-session-001');
      return;
    }
    if (user?.id === 'dev-user-002') {
      navigate('/admin');
      return;
    }
    // ────────────────────────────────────────────────────────────────────────

    try {
      await abandonInProgress(user.id);
      const { data: session, error } = await createSession(user.id);
      if (error) throw error;
      navigate(`/session/${session.id}`);
    } catch (err) {
      setError(err.message);
      setStarting(false);
    }
  };

  const toggleAction = async (action) => {
    const { data } = await updateAction(action.id, {
      completed: !action.completed,
      completed_at: !action.completed ? new Date().toISOString() : null,
    });
    setActions((prev) => prev.map((a) => a.id === action.id ? data : a));
  };

  const removeAction = async (id) => {
    await deleteAction(id);
    setActions((prev) => prev.filter((a) => a.id !== id));
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const doc = await uploadDocument(file, user.id);
      setDocuments((prev) => [doc, ...prev]);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (doc) => {
    const { data } = await getDocumentUrl(doc.storage_path);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
  };

  const handleDeleteDoc = async (doc) => {
    await deleteDocument(doc.id, doc.storage_path);
    setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
  };

  const pendingActions  = actions.filter((a) => !a.completed);
  const completedActions = actions.filter((a) => a.completed);

  const totalSessions    = stats?.sessions?.length || 0;
  const completed        = stats?.sessions?.filter((s) => s.status === 'COMPLETED').length || 0;
  const completedActCount = stats?.actions?.filter((a) => a.completed).length || 0;
  const pendingActCount   = stats?.actions?.filter((a) => !a.completed).length || 0;

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Good {getTimeOfDay()}, {profile?.name?.split(' ')[0]} 👋
          </h1>
          <p className="text-slate-500 mt-1">Ready for your PULSE coaching session?</p>
        </div>
        <button onClick={handleStartSession} disabled={starting} className="btn-primary flex items-center gap-2 text-base px-6 py-3">
          <Play size={18} />
          {starting ? 'Starting…' : 'Start Coaching Session'}
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<Clock size={20} className="text-pulse-600" />} label="Sessions" value={completed} sub={`of ${totalSessions} started`} color="pulse" />
        <StatCard icon={<CheckSquare size={20} className="text-green-600" />} label="Actions done" value={completedActCount} sub={`${pendingActCount} pending`} color="green" />
        <StatCard
          icon={<TrendingUp size={20} className="text-indigo-600" />}
          label="Avg mood"
          value={avgMood(stats?.sessions) || '–'}
          sub="out of 10"
          color="indigo"
        />
        <StatCard icon={<FileText size={20} className="text-amber-600" />} label="Documents" value={documents.length} sub="uploaded" color="amber" />
      </div>

      {/* Mood trend */}
      {(stats?.sessions || []).filter((s) => s.mood_score).length > 1 && (
        <div className="card">
          <h2 className="text-base font-semibold text-slate-700 mb-4">Mood Trend</h2>
          <MoodTrendChart sessions={stats.sessions} />
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Pending actions */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-slate-700">Pending Actions</h2>
            {pendingActions.length > 0 && (
              <span className="badge badge-amber">{pendingActions.length}</span>
            )}
          </div>
          {pendingActions.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-6">
              No pending actions. Start a session to get personalized micro-actions!
            </p>
          ) : (
            <ul className="space-y-2">
              {pendingActions.map((action) => (
                <ActionItem key={action.id} action={action} onToggle={toggleAction} onDelete={removeAction} />
              ))}
            </ul>
          )}
          {completedActions.length > 0 && (
            <details className="mt-4">
              <summary className="text-sm text-slate-500 cursor-pointer hover:text-slate-700">
                {completedActions.length} completed actions
              </summary>
              <ul className="space-y-2 mt-2">
                {completedActions.map((action) => (
                  <ActionItem key={action.id} action={action} onToggle={toggleAction} onDelete={removeAction} />
                ))}
              </ul>
            </details>
          )}
        </div>

        {/* Documents */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-slate-700">My Documents</h2>
            <label className="btn-secondary text-sm flex items-center gap-1.5 cursor-pointer">
              <Upload size={14} />
              {uploading ? 'Uploading…' : 'Upload'}
              <input type="file" className="hidden" onChange={handleUpload} disabled={uploading}
                accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.txt" />
            </label>
          </div>
          {documents.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-6">
              No documents yet. Upload reference materials, goals, or notes.
            </p>
          ) : (
            <ul className="space-y-2">
              {documents.map((doc) => (
                <li key={doc.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 group">
                  <FileText size={16} className="text-slate-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">{doc.name}</p>
                    <p className="text-xs text-slate-400">{formatBytes(doc.size)} · {format(new Date(doc.created_at), 'MMM d')}</p>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleDownload(doc)} className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500">
                      <Download size={14} />
                    </button>
                    <button onClick={() => handleDeleteDoc(doc)} className="p-1.5 rounded-lg hover:bg-red-100 text-red-400">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, sub, color }) {
  const colors = {
    pulse:  'bg-pulse-50',
    green:  'bg-green-50',
    indigo: 'bg-indigo-50',
    amber:  'bg-amber-50',
  };
  return (
    <div className="card flex items-center gap-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colors[color]}`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-800">{value}</p>
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-xs text-slate-400">{sub}</p>
      </div>
    </div>
  );
}

function ActionItem({ action, onToggle, onDelete }) {
  const overdue = action.due_date && !action.completed && isAfter(new Date(), new Date(action.due_date));
  return (
    <li className="flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 group">
      <button onClick={() => onToggle(action)}
        className={`mt-0.5 w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors
          ${action.completed ? 'bg-pulse-600 border-pulse-600' : 'border-slate-300 hover:border-pulse-400'}`}>
        {action.completed && <div className="w-2 h-2 bg-white rounded-full" />}
      </button>
      <div className="flex-1 min-w-0">
        <p className={`text-sm ${action.completed ? 'line-through text-slate-400' : 'text-slate-700'}`}>
          {action.text}
        </p>
        {action.due_date && (
          <p className={`text-xs mt-0.5 ${overdue ? 'text-red-500' : 'text-slate-400'}`}>
            Due {format(new Date(action.due_date), 'MMM d')} {overdue && '· Overdue'}
          </p>
        )}
      </div>
      <button onClick={() => onDelete(action.id)}
        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-100 text-red-400 transition-opacity">
        <Trash2 size={14} />
      </button>
    </li>
  );
}

function getTimeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

function avgMood(sessions) {
  if (!sessions) return null;
  const withMood = sessions.filter((s) => s.mood_score && s.status === 'COMPLETED');
  if (!withMood.length) return null;
  return (withMood.reduce((acc, s) => acc + s.mood_score, 0) / withMood.length).toFixed(1);
}

function formatBytes(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

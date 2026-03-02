import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Activity, TrendingUp, BarChart2, RefreshCw, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getAdminDashboard } from '../lib/supabase';
import SentimentChart from '../components/charts/SentimentChart';
import ThemeBarChart from '../components/charts/ThemeBarChart';
import DeptTable from '../components/charts/DeptTable';
import { format, parseISO } from 'date-fns';

// ── DEV BYPASS — /admin URL always accessible in demo mode ───────────────────
const DEV_BYPASS = true; // flip to false when real auth + Supabase is restored
// ─────────────────────────────────────────────────────────────────────────────

// ── DEV mock data — shown when Supabase is bypassed ──────────────────────────
const DEV_MOCK_DATA = {
  totalEmployees:    14,
  completedSessions: 31,
  completionRate:    89,
  avgMood:           '7.4',
  avgSentiment:      0.72,
  avgSentimentLabel: 'Positive',
  weeklyTrend: [
    { week: 'Jan 27', avgMood: 6.8, count: 4 },
    { week: 'Feb 3',  avgMood: 7.1, count: 5 },
    { week: 'Feb 10', avgMood: 7.6, count: 6 },
    { week: 'Feb 17', avgMood: 7.2, count: 7 },
    { week: 'Feb 24', avgMood: 7.9, count: 9 },
  ],
  themes: [
    { theme: 'Workload balance',   sentiment: 'neutral',  count: 9 },
    { theme: 'Team collaboration', sentiment: 'positive', count: 8 },
    { theme: 'Career growth',      sentiment: 'positive', count: 7 },
    { theme: 'Communication gaps', sentiment: 'negative', count: 5 },
    { theme: 'Recognition',        sentiment: 'positive', count: 4 },
  ],
  departments: [
    { department: 'Engineering', sessionCount: 12, avgMood: 7.3, avgSentiment: 0.71 },
    { department: 'Product',     sessionCount: 9,  avgMood: 7.6, avgSentiment: 0.75 },
    { department: 'Design',      sessionCount: 6,  avgMood: 7.8, avgSentiment: 0.80 },
    { department: 'Sales',       sessionCount: 4,  avgMood: 6.9, avgSentiment: 0.62 },
  ],
};
// ─────────────────────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const { profile } = useAuth();
  const navigate    = useNavigate();
  const [data,      setData]    = useState(null);
  const [loading,   setLoading] = useState(true);
  const [weeks,     setWeeks]   = useState(8);

  useEffect(() => {
    // In DEV_BYPASS mode, /admin is always accessible — no role redirect
    if (!DEV_BYPASS && profile && profile.role !== 'ADMIN') {
      navigate('/');
    }
  }, [profile]);

  useEffect(() => {
    // DEV BYPASS: always show mock data, skip Supabase call
    if (DEV_BYPASS) {
      setData(DEV_MOCK_DATA);
      setLoading(false);
      return;
    }
    if (profile?.role !== 'ADMIN') return;
    fetchData();
  }, [weeks, profile]);

  const fetchData = async () => {
    setLoading(true);
    const raw = await getAdminDashboard(weeks);
    setData(processData(raw));
    setLoading(false);
  };

  if (!DEV_BYPASS && (!profile || profile.role !== 'ADMIN')) return null;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <BarChart2 size={22} className="text-pulse-600" /> Organizational Insights
          </h1>
          <p className="text-slate-500 mt-1">Anonymized aggregate data — no individual sessions are visible</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            className="input w-auto text-sm"
            value={weeks}
            onChange={(e) => setWeeks(Number(e.target.value))}
          >
            <option value={4}>Last 4 weeks</option>
            <option value={8}>Last 8 weeks</option>
            <option value={12}>Last 12 weeks</option>
            <option value={24}>Last 6 months</option>
          </select>
          <button onClick={fetchData} className="btn-secondary p-2.5">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Privacy notice */}
      <div className="flex items-start gap-3 bg-indigo-50 border border-indigo-100 rounded-xl p-4 text-sm text-indigo-800">
        <Shield size={18} className="flex-shrink-0 mt-0.5" />
        <p>
          <span className="font-semibold">Privacy Protected:</span> All data shown is aggregated across teams. Individual session details are never accessible here. Minimum group size of 3 is enforced before showing department data.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-64">
          <div className="w-8 h-8 rounded-full border-4 border-pulse-200 border-t-pulse-600 animate-spin" />
        </div>
      ) : data ? (
        <>
          {/* Overview stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <AdminStat icon={<Users size={20} className="text-pulse-600" />} label="Active Employees" value={data.totalEmployees} sub="registered" bg="bg-pulse-50" />
            <AdminStat icon={<Activity size={20} className="text-green-600" />} label="Sessions" value={data.completedSessions} sub={`${data.completionRate}% completion`} bg="bg-green-50" />
            <AdminStat icon={<TrendingUp size={20} className="text-amber-600" />} label="Avg Mood" value={data.avgMood || '–'} sub="across all sessions" bg="bg-amber-50" />
            <AdminStat icon={<BarChart2 size={20} className="text-indigo-600" />} label="Avg Sentiment" value={data.avgSentimentLabel} sub={data.avgSentiment ? `${(data.avgSentiment * 100).toFixed(0)}% positive` : 'Not enough data'} bg="bg-indigo-50" />
          </div>

          {/* Charts */}
          <div className="grid lg:grid-cols-2 gap-6">
            {data.weeklyTrend.length > 1 && (
              <div className="card">
                <h2 className="text-base font-semibold text-slate-700 mb-4">Weekly Mood Trend</h2>
                <SentimentChart data={data.weeklyTrend} />
              </div>
            )}
            {data.themes.length > 0 && (
              <div className="card">
                <h2 className="text-base font-semibold text-slate-700 mb-4">Top Themes</h2>
                <ThemeBarChart themes={data.themes} />
              </div>
            )}
          </div>

          {/* Department breakdown */}
          {data.departments.length > 0 && (
            <div className="card">
              <h2 className="text-base font-semibold text-slate-700 mb-4">Department Overview</h2>
              <DeptTable departments={data.departments} />
            </div>
          )}

          {data.weeklyTrend.length === 0 && data.themes.length === 0 && (
            <div className="card text-center py-12 text-slate-400">
              <p>Not enough data yet for the selected time period.</p>
              <p className="text-sm mt-1">More sessions will populate insights here.</p>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}

function AdminStat({ icon, label, value, sub, bg }) {
  return (
    <div className="card flex items-center gap-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${bg}`}>{icon}</div>
      <div>
        <p className="text-2xl font-bold text-slate-800">{value}</p>
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-xs text-slate-400">{sub}</p>
      </div>
    </div>
  );
}

function processData({ profiles, sessions, insights }) {
  const employees = (profiles || []).filter((p) => p.role === 'EMPLOYEE');
  const completed = (sessions || []).filter((s) => s.status === 'COMPLETED');
  const total     = sessions?.length || 0;

  const avgMoodRaw = completed.filter((s) => s.mood_score).reduce((acc, s) => acc + s.mood_score, 0)
    / (completed.filter((s) => s.mood_score).length || 1);
  const avgSentRaw = completed.filter((s) => s.sentiment_score !== null).reduce((acc, s) => acc + (s.sentiment_score || 0), 0)
    / (completed.filter((s) => s.sentiment_score !== null).length || 1);

  // Weekly trend
  const weekMap = {};
  completed.forEach((s) => {
    const week = format(parseISO(s.started_at), 'MMM d');
    if (!weekMap[week]) weekMap[week] = { week, moods: [], count: 0 };
    weekMap[week].count++;
    if (s.mood_score) weekMap[week].moods.push(s.mood_score);
  });
  const weeklyTrend = Object.values(weekMap).map((w) => ({
    week: w.week,
    avgMood: w.moods.length ? +(w.moods.reduce((a, b) => a + b, 0) / w.moods.length).toFixed(1) : null,
    count: w.count,
  })).slice(-12);

  // Themes
  const themeMap = {};
  (insights || []).forEach((i) => {
    const key = i.theme;
    if (!themeMap[key]) themeMap[key] = { theme: key, sentiment: i.sentiment, count: 0 };
    themeMap[key].count++;
  });
  const themes = Object.values(themeMap).sort((a, b) => b.count - a.count).slice(0, 10);

  // Department data (only show depts with 3+ sessions for privacy)
  const deptMap = {};
  completed.forEach((s) => {
    const p = (profiles || []).find((p) => p.id === s.user_id);
    const dept = p?.department || 'Unknown';
    if (!deptMap[dept]) deptMap[dept] = { department: dept, moods: [], sentiments: [], count: 0 };
    deptMap[dept].count++;
    if (s.mood_score) deptMap[dept].moods.push(s.mood_score);
    if (s.sentiment_score !== null) deptMap[dept].sentiments.push(s.sentiment_score);
  });
  const departments = Object.values(deptMap)
    .filter((d) => d.count >= 3) // Privacy: minimum 3
    .map((d) => ({
      department: d.department,
      sessionCount: d.count,
      avgMood: d.moods.length ? +(d.moods.reduce((a, b) => a + b, 0) / d.moods.length).toFixed(1) : null,
      avgSentiment: d.sentiments.length ? +(d.sentiments.reduce((a, b) => a + b, 0) / d.sentiments.length).toFixed(2) : null,
    }));

  const sentimentLabel = (s) => {
    if (!s) return '–';
    if (s >= 0.7) return 'Positive';
    if (s >= 0.5) return 'Neutral+';
    if (s >= 0.4) return 'Neutral';
    return 'Mixed';
  };

  return {
    totalEmployees:    employees.length,
    completedSessions: completed.length,
    completionRate:    total ? +((completed.length / total) * 100).toFixed(0) : 0,
    avgMood:           completed.filter((s) => s.mood_score).length ? avgMoodRaw.toFixed(1) : null,
    avgSentiment:      completed.filter((s) => s.sentiment_score !== null).length ? +avgSentRaw.toFixed(2) : null,
    avgSentimentLabel: sentimentLabel(+avgSentRaw.toFixed(2)),
    weeklyTrend,
    themes,
    departments,
  };
}

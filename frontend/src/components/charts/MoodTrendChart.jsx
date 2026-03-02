import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { format } from 'date-fns';

export default function MoodTrendChart({ sessions }) {
  const data = (sessions || [])
    .filter((s) => s.mood_score && s.status === 'COMPLETED')
    .map((s) => ({
      date: format(new Date(s.started_at), 'MMM d'),
      mood: s.mood_score,
    }));

  if (data.length === 0) return <p className="text-slate-400 text-sm text-center py-4">Not enough data yet</p>;

  return (
    <ResponsiveContainer width="100%" height={160}>
      <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
        <YAxis domain={[1, 10]} ticks={[1, 3, 5, 7, 10]} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', fontSize: '12px' }}
          formatter={(v) => [`${v}/10`, 'Mood']}
        />
        <ReferenceLine y={5} stroke="#e2e8f0" strokeDasharray="4 4" />
        <Line type="monotone" dataKey="mood" stroke="#0d9488" strokeWidth={2.5} dot={{ fill: '#0d9488', r: 4 }}
          activeDot={{ r: 6 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

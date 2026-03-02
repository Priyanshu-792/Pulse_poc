import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const SENTIMENT_COLORS = {
  positive: '#10b981',
  neutral:  '#6366f1',
  negative: '#f59e0b',
};

export default function ThemeBarChart({ themes }) {
  if (!themes?.length) return <p className="text-slate-400 text-sm text-center py-4">No themes yet</p>;

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart
        data={themes.slice(0, 8)}
        layout="vertical"
        margin={{ top: 0, right: 30, left: 0, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="theme" tick={{ fontSize: 10, fill: '#475569' }} axisLine={false} tickLine={false} width={120} />
        <Tooltip
          contentStyle={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', fontSize: '12px' }}
          formatter={(v, n, p) => [v, `${p.payload.sentiment} mentions`]}
        />
        <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={24}>
          {themes.slice(0, 8).map((entry, i) => (
            <Cell key={i} fill={SENTIMENT_COLORS[entry.sentiment] || '#0d9488'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

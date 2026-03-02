import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function SentimentChart({ data }) {
  if (!data?.length) return <p className="text-slate-400 text-sm text-center py-4">No data yet</p>;

  return (
    <ResponsiveContainer width="100%" height={220}>
      <ComposedChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
        <YAxis yAxisId="mood" domain={[1, 10]} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
        <YAxis yAxisId="count" orientation="right" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', fontSize: '12px' }}
          formatter={(value, name) => [
            name === 'avgMood' ? `${value}/10` : value,
            name === 'avgMood' ? 'Avg Mood' : 'Sessions',
          ]}
        />
        <Legend wrapperStyle={{ fontSize: '11px' }} />
        <Bar yAxisId="count" dataKey="count" fill="#ccfbf1" radius={[4, 4, 0, 0]} name="Sessions" />
        <Line yAxisId="mood" type="monotone" dataKey="avgMood" stroke="#0d9488" strokeWidth={2.5}
          dot={{ fill: '#0d9488', r: 3 }} name="Avg Mood" />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

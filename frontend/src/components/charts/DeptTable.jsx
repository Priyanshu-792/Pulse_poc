export default function DeptTable({ departments }) {
  if (!departments?.length) return null;

  const sentimentLabel = (s) => {
    if (!s) return { label: '–', class: 'text-slate-400' };
    if (s >= 0.7) return { label: 'Positive', class: 'text-green-600' };
    if (s >= 0.5) return { label: 'Neutral+', class: 'text-teal-600' };
    if (s >= 0.4) return { label: 'Neutral',  class: 'text-slate-600' };
    return { label: 'Mixed',    class: 'text-amber-600' };
  };

  const moodBar = (score) => {
    if (!score) return null;
    const pct = ((score - 1) / 9) * 100;
    const color = score >= 7 ? 'bg-green-400' : score >= 5 ? 'bg-amber-400' : 'bg-red-400';
    return (
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
        </div>
        <span className="text-sm font-medium text-slate-700 w-8">{score}</span>
      </div>
    );
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100">
            <th className="text-left text-xs font-medium text-slate-500 py-2 pr-4">Department</th>
            <th className="text-left text-xs font-medium text-slate-500 py-2 pr-4">Sessions</th>
            <th className="text-left text-xs font-medium text-slate-500 py-2 pr-4 min-w-40">Avg Mood</th>
            <th className="text-left text-xs font-medium text-slate-500 py-2">Sentiment</th>
          </tr>
        </thead>
        <tbody>
          {departments.map((dept) => {
            const sent = sentimentLabel(dept.avgSentiment);
            return (
              <tr key={dept.department} className="border-b border-slate-50 hover:bg-slate-50">
                <td className="py-3 pr-4 font-medium text-slate-700">{dept.department}</td>
                <td className="py-3 pr-4 text-slate-500">{dept.sessionCount}</td>
                <td className="py-3 pr-4">{dept.avgMood ? moodBar(dept.avgMood) : <span className="text-slate-400">–</span>}</td>
                <td className={`py-3 font-medium ${sent.class}`}>{sent.label}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

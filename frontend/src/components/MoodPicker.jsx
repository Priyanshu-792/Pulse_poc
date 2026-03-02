import clsx from 'clsx';

const MOODS = [
  { score: 1,  emoji: '😞', label: 'Very low' },
  { score: 2,  emoji: '😟', label: 'Low' },
  { score: 3,  emoji: '😕', label: 'Below avg' },
  { score: 4,  emoji: '😐', label: 'Okay-ish' },
  { score: 5,  emoji: '🙂', label: 'Okay' },
  { score: 6,  emoji: '😊', label: 'Good' },
  { score: 7,  emoji: '😄', label: 'Pretty good' },
  { score: 8,  emoji: '😁', label: 'Great' },
  { score: 9,  emoji: '🤩', label: 'Excellent' },
  { score: 10, emoji: '🌟', label: 'Amazing' },
];

export default function MoodPicker({ onSelect, selected }) {
  return (
    <div>
      <p className="text-xs font-medium text-slate-600 mb-2 text-center">
        How are you feeling today? (tap a score)
      </p>
      <div className="flex justify-between gap-1">
        {MOODS.map((m) => (
          <button
            key={m.score}
            onClick={() => onSelect(m.score)}
            title={`${m.score} – ${m.label}`}
            className={clsx(
              'flex flex-col items-center flex-1 py-1.5 px-0.5 rounded-lg transition-all text-center hover:bg-pulse-50',
              selected === m.score && 'bg-pulse-100 ring-2 ring-pulse-400'
            )}
          >
            <span className="text-lg leading-none">{m.emoji}</span>
            <span className="text-xs text-slate-500 mt-0.5 font-medium">{m.score}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
